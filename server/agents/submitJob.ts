/**
 * submitJob - Bridge between Hermes reasoning and worker execution
 *
 * Creates a job in the job_queue table that workers will claim and process.
 * This is the entry point for Hermes to dispatch work to the distributed worker system.
 */

import { randomUUID } from 'crypto';
import { db } from '../db';
import { jobQueue, JobQueueStatuses } from '@shared/schema';
import { logger } from '../utils/logger';

export interface SubmitJobParams {
  service: string;      // e.g., 'rank-tracker', 'content-analyzer', 'core-web-vitals'
  action: string;       // e.g., 'run', 'check', 'sync'
  params?: Record<string, any>;  // action-specific parameters
  websiteId?: string;   // optional site context
  priority?: number;    // 1-100, higher = more urgent (default: 50)
  runId?: string;       // optional - provide to group jobs in same run
}

export interface SubmitJobResult {
  runId: string;
  jobId: string;
}

/**
 * Submit a job to the queue for worker processing
 *
 * @param options - Job configuration
 * @returns Promise<{ runId, jobId }> - IDs for tracking the job
 */
export async function submitJob(options: SubmitJobParams): Promise<SubmitJobResult> {
  const {
    service,
    action,
    params = {},
    websiteId,
    priority = 50,
    runId: providedRunId,
  } = options;

  // Generate IDs
  const runId = providedRunId ?? randomUUID();
  const jobId = randomUUID();

  logger.info("submitJob", `Enqueueing job: service=${service}, action=${action}, jobId=${jobId}`);

  // Insert into job_queue
  await db.insert(jobQueue).values({
    jobId,
    runId,
    service,
    action,
    websiteId: websiteId ?? null,
    params,
    status: JobQueueStatuses.QUEUED,
    priority,
    attempts: 0,
    maxAttempts: 3,
  });

  logger.info("submitJob", `Job enqueued successfully: jobId=${jobId}, runId=${runId}`);

  return { runId, jobId };
}

/**
 * Submit multiple jobs as part of the same run
 *
 * @param jobs - Array of job configurations (runId will be shared)
 * @returns Promise<{ runId, jobIds }> - Run ID and array of job IDs
 */
export async function submitJobBatch(
  jobs: Omit<SubmitJobParams, 'runId'>[]
): Promise<{ runId: string; jobIds: string[] }> {
  const runId = randomUUID();
  const jobIds: string[] = [];

  for (const job of jobs) {
    const result = await submitJob({ ...job, runId });
    jobIds.push(result.jobId);
  }

  return { runId, jobIds };
}
