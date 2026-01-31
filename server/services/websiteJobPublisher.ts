/**
 * Website Job Publisher Service
 * 
 * Publishes standardized jobs to the queue for managed websites.
 * Uses queue-client pattern to ensure consistent job payloads.
 * 
 * IMPORTANT: This service creates jobs that workers will claim and process.
 * Job payloads follow the shared contracts format.
 */

import { randomUUID } from 'crypto';
import { db } from '../db';
import { websiteJobs, jobQueue, JobQueueStatuses } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

// ============================================
// Types
// ============================================

export interface PublishWebsiteJobParams {
  websiteId: string;
  domain: string;
  jobType: 'health_check' | 'crawl_technical_seo' | 'content_audit' | 'performance_check';
  requestedBy: string; // 'hermes', 'manual', 'scheduled'
}

export interface PublishWebsiteJobResult {
  jobId: string;
  traceId: string;
  status: string;
}

/**
 * Standard job payload format that workers expect
 * This follows the shared contracts schema
 */
export interface WebsiteJobPayload {
  job_type: string;
  website_id: string;
  domain: string;
  requested_by: string;
  requested_at: string; // ISO 8601
  trace_id: string;
}

// ============================================
// Service Implementation
// ============================================

/**
 * Publish a job to the queue for a managed website
 * 
 * Creates both:
 * 1. A website_jobs record for Hermes tracking
 * 2. A job_queue record for worker consumption
 * 
 * @param params - Job configuration
 * @returns Promise<{ jobId, traceId, status }> - IDs for tracking the job
 */
export async function publishWebsiteJob(
  params: PublishWebsiteJobParams
): Promise<PublishWebsiteJobResult> {
  const { websiteId, domain, jobType, requestedBy } = params;

  // Generate IDs
  const jobId = randomUUID();
  const traceId = randomUUID();
  const requestedAt = new Date().toISOString();

  logger.info("WebsiteJobPublisher", `Publishing job: type=${jobType}, domain=${domain}, jobId=${jobId}`);

  // Build the standardized payload
  const payload: WebsiteJobPayload = {
    job_type: jobType,
    website_id: websiteId,
    domain,
    requested_by: requestedBy,
    requested_at: requestedAt,
    trace_id: traceId,
  };

  // Validate payload (future: use shared contracts zod schema)
  validateJobPayload(payload);

  // Insert into website_jobs for Hermes tracking
  await db.insert(websiteJobs).values({
    jobId,
    websiteId,
    jobType,
    domain,
    requestedBy,
    traceId,
    status: 'queued',
  } as any);

  // Insert into job_queue for worker consumption
  // Map job_type to service name for the worker system
  const serviceMapping: Record<string, string> = {
    'health_check': 'website-health',
    'crawl_technical_seo': 'crawl-render',
    'content_audit': 'content-analyzer',
    'performance_check': 'core-web-vitals',
  };

  await db.insert(jobQueue).values({
    jobId,
    runId: traceId, // Use traceId as runId for correlation
    service: serviceMapping[jobType] || 'website-health',
    action: 'run',
    websiteId,
    params: payload,
    status: JobQueueStatuses.QUEUED,
    priority: 50,
    attempts: 0,
    maxAttempts: 3,
  });

  logger.info("WebsiteJobPublisher", `Job published successfully: jobId=${jobId}, traceId=${traceId}`);

  return {
    jobId,
    traceId,
    status: 'queued',
  };
}

/**
 * Validate job payload against expected format
 * Future: integrate with shared contracts zod schema
 */
function validateJobPayload(payload: WebsiteJobPayload): void {
  if (!payload.job_type) {
    throw new Error('job_type is required');
  }
  if (!payload.website_id) {
    throw new Error('website_id is required');
  }
  if (!payload.domain) {
    throw new Error('domain is required');
  }
  if (!payload.requested_by) {
    throw new Error('requested_by is required');
  }
  if (!payload.requested_at) {
    throw new Error('requested_at is required');
  }
  if (!payload.trace_id) {
    throw new Error('trace_id is required');
  }
}

/**
 * Update job status (called when worker reports back)
 */
export async function updateWebsiteJobStatus(
  jobId: string,
  status: 'running' | 'completed' | 'failed',
  result?: Record<string, any>,
  errorMessage?: string
): Promise<void> {
  await db.update(websiteJobs)
    .set({
      status,
      ...(result && { result }),
      ...(errorMessage && { errorMessage }),
      ...(status === 'completed' || status === 'failed' ? { completedAt: new Date() } : {}),
    })
    .where(eq((websiteJobs as any).jobId, jobId));

  logger.info("WebsiteJobPublisher", `Job status updated: jobId=${jobId}, status=${status}`);
}
