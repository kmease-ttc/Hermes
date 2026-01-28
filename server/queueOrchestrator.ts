/**
 * Queue-Based Worker Orchestrator for Hermes
 *
 * This module replaces HTTP-based worker calls with queue-based job dispatch.
 * Workers claim jobs from the queue, process them, and write results to KBase.
 *
 * Migration from workerOrchestrator.ts:
 * - callWorker() → publishWorkerJob() + waitForJobCompletion()
 * - Direct HTTP POST → Job queue publish
 * - Synchronous response → Poll for completion via KBase events
 */

import { QueueClient } from 'queue-client';
import { KBaseClient } from '@arclo/kbase-client';
import { logger } from './utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Constants
const JOB_TIMEOUT_MS = 60000; // 60 seconds
const POLL_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 60 seconds total

// Service name mapping (canonical names)
export const SERVICE_NAMES = {
  COMPETITIVE_SNAPSHOT: 'competitive-intel',
  SERP_INTEL: 'serp-intel',
  CRAWL_RENDER: 'technical-seo',
  CORE_WEB_VITALS: 'vital-monitor',
  CONTENT_GENERATOR: 'blog-writer',
  CONTENT_QA: 'content-qa',
  CONTENT_DECAY: 'decay-monitor',
  BACKLINK_AUTHORITY: 'domain-authority',
  NOTIFICATIONS: 'notification',
  GOOGLE_ADS: 'google-ads',
} as const;

export type ServiceName = typeof SERVICE_NAMES[keyof typeof SERVICE_NAMES];

export interface WorkerJobPayload {
  website_id: string;
  run_id: string;
  domain: string;
  action?: string;
  params?: Record<string, any>;
}

export interface WorkerCallResult {
  service: string;
  status: 'success' | 'failed' | 'timeout' | 'skipped';
  durationMs: number;
  payload: any;
  metrics: Record<string, any>;
  summary: string | null;
  errorCode: string | null;
  errorDetail: string | null;
  jobId: string | null;
}

export interface OrchestrationResult {
  runId: string;
  websiteId: string;
  startedAt: Date;
  finishedAt: Date;
  workers: WorkerCallResult[];
  successCount: number;
  failedCount: number;
}

export class QueueOrchestrator {
  private queue: QueueClient;
  private kbase: KBaseClient;

  constructor() {
    // Initialize clients from environment
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.queue = new QueueClient({
      connectionString: DATABASE_URL,
      schema: 'queue',
      tableName: 'jobs',
    });

    this.kbase = KBaseClient.fromEnv();
  }

  /**
   * Initialize queue table
   */
  async initialize(): Promise<void> {
    await this.queue.initialize();
    logger.info('QueueOrchestrator', 'Initialized queue table');
  }

  /**
   * Publish a job to the worker queue
   */
  async publishWorkerJob(
    service: ServiceName,
    websiteId: string,
    runId: string,
    domain: string,
    params?: Record<string, any>
  ): Promise<{ jobId: string }> {
    const payload: WorkerJobPayload = {
      website_id: websiteId,
      run_id: runId,
      domain,
      action: 'analyze',
      params: params || {},
    };

    logger.info('QueueOrchestrator', `Publishing job for service: ${service}`, {
      websiteId,
      runId,
      domain,
    });

    const job = await this.queue.publishJob({
      type: service,
      payload,
      priority: 5,
      maxAttempts: 3,
    });

    // Write run status to KBase
    await this.kbase.writeJobStatus({
      website_id: websiteId,
      run_id: runId,
      job_id: job.id,
      service,
      status: 'queued',
      message: `Job queued for ${service}`,
    });

    logger.info('QueueOrchestrator', `Job published: ${job.id}`, { service });

    return { jobId: job.id };
  }

  /**
   * Wait for job completion by polling KBase for results
   *
   * This maintains compatibility with the synchronous HTTP-based approach
   * by waiting for workers to complete and write results to KBase.
   */
  async waitForJobCompletion(
    jobId: string,
    websiteId: string,
    runId: string,
    service: ServiceName,
    timeoutMs: number = JOB_TIMEOUT_MS
  ): Promise<WorkerCallResult> {
    const startTime = Date.now();
    const maxAttempts = Math.ceil(timeoutMs / POLL_INTERVAL_MS);

    logger.info('QueueOrchestrator', `Waiting for job completion: ${jobId}`, {
      service,
      maxAttempts,
    });

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check if job has completed by reading KBase events
      const events = await this.kbase.readByJobId({
        website_id: websiteId,
        job_id: jobId,
      });

      // Look for completion event (type='result')
      const resultEvent = events.find((e) => e.type === 'result');
      if (resultEvent) {
        const durationMs = Date.now() - startTime;

        logger.info('QueueOrchestrator', `Job completed: ${jobId}`, {
          service,
          durationMs,
        });

        return {
          service,
          status: 'success',
          durationMs,
          payload: resultEvent.payload,
          metrics: resultEvent.payload.metrics || {},
          summary: resultEvent.summary,
          errorCode: null,
          errorDetail: null,
          jobId,
        };
      }

      // Look for failure event (job_status with status='failed')
      const failureEvent = events.find(
        (e) => e.type === 'job_status' && e.status === 'failed'
      );
      if (failureEvent) {
        const durationMs = Date.now() - startTime;

        logger.error('QueueOrchestrator', `Job failed: ${jobId}`, {
          service,
          error: failureEvent.summary,
        });

        return {
          service,
          status: 'failed',
          durationMs,
          payload: null,
          metrics: {},
          summary: failureEvent.summary,
          errorCode: 'JOB_FAILED',
          errorDetail: failureEvent.summary || 'Job failed',
          jobId,
        };
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    // Timeout reached
    const durationMs = Date.now() - startTime;

    logger.warn('QueueOrchestrator', `Job timeout: ${jobId}`, {
      service,
      durationMs,
    });

    return {
      service,
      status: 'timeout',
      durationMs,
      payload: null,
      metrics: {},
      summary: `Job timed out after ${timeoutMs}ms`,
      errorCode: 'TIMEOUT',
      errorDetail: `Job did not complete within ${timeoutMs}ms`,
      jobId,
    };
  }

  /**
   * Call a worker (publish job + wait for completion)
   *
   * This provides a drop-in replacement for the HTTP-based callWorker() function
   */
  async callWorker(
    service: ServiceName,
    websiteId: string,
    runId: string,
    domain: string,
    params?: Record<string, any>
  ): Promise<WorkerCallResult> {
    try {
      // Publish job
      const { jobId } = await this.publishWorkerJob(
        service,
        websiteId,
        runId,
        domain,
        params
      );

      // Wait for completion
      const result = await this.waitForJobCompletion(
        jobId,
        websiteId,
        runId,
        service
      );

      return result;
    } catch (error) {
      logger.error('QueueOrchestrator', `Error calling worker: ${service}`, error);

      return {
        service,
        status: 'failed',
        durationMs: 0,
        payload: null,
        metrics: {},
        summary: error.message,
        errorCode: 'ERROR',
        errorDetail: error.stack || error.message,
        jobId: null,
      };
    }
  }

  /**
   * Orchestrate multiple workers in sequence
   *
   * This replaces the HTTP-based runWorkerOrchestration() function
   */
  async runWorkerOrchestration(
    websiteId: string,
    domain: string,
    services: ServiceName[]
  ): Promise<OrchestrationResult> {
    const runId = uuidv4();
    const startedAt = new Date();

    logger.info('QueueOrchestrator', `Starting orchestration run: ${runId}`, {
      websiteId,
      domain,
      serviceCount: services.length,
    });

    // Write run status: started
    await this.kbase.writeRunStatus({
      website_id: websiteId,
      run_id: runId,
      status: 'started',
      summary: `Orchestration started: ${services.length} services`,
      started_at: startedAt,
    });

    const workers: WorkerCallResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Call workers sequentially (could be parallelized if needed)
    for (const service of services) {
      const result = await this.callWorker(service, websiteId, runId, domain);
      workers.push(result);

      if (result.status === 'success') {
        successCount++;
      } else {
        failedCount++;
      }
    }

    const finishedAt = new Date();

    // Write run status: completed
    await this.kbase.writeRunStatus({
      website_id: websiteId,
      run_id: runId,
      status: successCount > 0 ? 'completed' : 'failed',
      summary: `Orchestration completed: ${successCount} succeeded, ${failedCount} failed`,
      started_at: startedAt,
      finished_at: finishedAt,
    });

    logger.info('QueueOrchestrator', `Orchestration complete: ${runId}`, {
      successCount,
      failedCount,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    });

    return {
      runId,
      websiteId,
      startedAt,
      finishedAt,
      workers,
      successCount,
      failedCount,
    };
  }

  /**
   * Orchestrate multiple workers in parallel (fire-and-forget)
   *
   * This publishes all jobs immediately and returns without waiting.
   * Useful for long-running tasks where you don't want to block.
   */
  async runAsyncOrchestration(
    websiteId: string,
    domain: string,
    services: ServiceName[]
  ): Promise<{ runId: string; jobIds: string[] }> {
    const runId = uuidv4();
    const startedAt = new Date();

    logger.info('QueueOrchestrator', `Starting async orchestration: ${runId}`, {
      websiteId,
      domain,
      serviceCount: services.length,
    });

    // Write run status: started
    await this.kbase.writeRunStatus({
      website_id: websiteId,
      run_id: runId,
      status: 'started',
      summary: `Async orchestration started: ${services.length} services`,
      started_at: startedAt,
    });

    // Publish all jobs in parallel
    const jobPromises = services.map((service) =>
      this.publishWorkerJob(service, websiteId, runId, domain)
    );

    const results = await Promise.all(jobPromises);
    const jobIds = results.map((r) => r.jobId);

    logger.info('QueueOrchestrator', `Async orchestration queued: ${runId}`, {
      jobIds,
    });

    return { runId, jobIds };
  }

  /**
   * Check run status by querying KBase
   */
  async getRunStatus(
    websiteId: string,
    runId: string
  ): Promise<{
    runId: string;
    status: string;
    completedJobs: number;
    failedJobs: number;
    totalJobs: number;
  }> {
    const events = await this.kbase.readByRunId({
      website_id: websiteId,
      run_id: runId,
    });

    const jobStatusEvents = events.filter((e) => e.type === 'job_status');
    const completedJobs = jobStatusEvents.filter((e) => e.status === 'completed').length;
    const failedJobs = jobStatusEvents.filter((e) => e.status === 'failed').length;
    const totalJobs = new Set(events.map((e) => e.job_id).filter(Boolean)).size;

    const runStatusEvent = events.find((e) => e.type === 'run_status');
    const status = runStatusEvent?.status || 'unknown';

    return {
      runId,
      status,
      completedJobs,
      failedJobs,
      totalJobs,
    };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    await this.kbase.close();
  }
}

// Singleton instance
let orchestrator: QueueOrchestrator | null = null;

export function getQueueOrchestrator(): QueueOrchestrator {
  if (!orchestrator) {
    orchestrator = new QueueOrchestrator();
  }
  return orchestrator;
}

export async function initializeQueueOrchestrator(): Promise<void> {
  const orch = getQueueOrchestrator();
  await orch.initialize();
}
