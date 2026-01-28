/**
 * Run Orchestrator
 *
 * Step 4: Multi-service workflow orchestration
 * Coordinates running multiple workers, tracking progress, and producing final summaries.
 */

import { nanoid } from 'nanoid';
import { db } from './db.js';
import { getKbaseClient } from '@arclo/kbase-client';
import { callWorker } from './workerOrchestrator.js';
import { resolveWorkerConfig } from './workerConfigResolver.js';
import { getServiceBySlug as getServiceSecretMapping } from '../shared/serviceSecretMap.js';
import { synthesizeAndWriteDiagnosis } from './kbase/index.js';
import {
  STANDARD_RUN_PLAN,
  type RunPlan,
  type ServiceDefinition,
  getReadyServices,
  validateRunPlan,
  getRunPlan,
} from './runPlan.js';

/**
 * Run lifecycle status
 */
export type RunStatus = 'started' | 'running' | 'completed' | 'failed' | 'timeout';

/**
 * Service execution status within a run
 */
export type ServiceStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'skipped';

/**
 * Service execution result
 */
export interface ServiceResult {
  service: string;
  workerKey: string;
  status: ServiceStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  error: string | null;
  payload: any;
}

/**
 * Run execution context
 */
export interface RunContext {
  runId: string;
  websiteId: string;
  domain: string;
  planId: string;
  plan: RunPlan;
  startedAt: Date;
  completedAt: Date | null;
  status: RunStatus;
  services: Map<string, ServiceResult>;
  timeoutAt: Date;
}

/**
 * Run execution summary
 */
export interface RunSummary {
  runId: string;
  websiteId: string;
  domain: string;
  planId: string;
  status: RunStatus;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  servicesCompleted: number;
  servicesFailed: number;
  servicesTimeout: number;
  servicesSkipped: number;
  servicesTotal: number;
  diagnosisEventId: string | null;
  error: string | null;
}

/**
 * Step 4.2: Start a new orchestrated run
 *
 * Creates a run_id, writes run_status=start to KBase, and returns run context.
 */
export async function startRun(
  websiteId: string,
  domain: string,
  planId: string = 'standard-v1'
): Promise<RunContext> {
  const plan = getRunPlan(planId);
  if (!plan) {
    throw new Error(`Unknown run plan: ${planId}`);
  }

  // Validate plan structure
  const validation = validateRunPlan(plan);
  if (!validation.valid) {
    throw new Error(`Invalid run plan: ${validation.error}`);
  }

  const runId = nanoid();
  const startedAt = new Date();
  const timeoutAt = new Date(startedAt.getTime() + plan.maxRunDurationMs);

  // Write run_status=start to KBase
  const kbase = getKbaseClient();
  await kbase.writeEvent({
    website_id: websiteId,
    run_id: runId,
    service: 'hermes',
    type: 'run_status',
    payload: {
      status: 'started',
      plan_id: planId,
      plan_name: plan.name,
      domain,
      started_at: startedAt.toISOString(),
      timeout_at: timeoutAt.toISOString(),
      services_planned: plan.services.map((s) => s.service),
    },
  });

  console.log(`[Run ${runId}] Started for ${domain} using plan ${planId}`);

  // Initialize service tracking
  const services = new Map<string, ServiceResult>();
  for (const service of plan.services) {
    services.set(service.service, {
      service: service.service,
      workerKey: service.workerKey,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      durationMs: null,
      error: null,
      payload: null,
    });
  }

  return {
    runId,
    websiteId,
    domain,
    planId,
    plan,
    startedAt,
    completedAt: null,
    status: 'running',
    services,
    timeoutAt,
  };
}

/**
 * Step 4.3: Enqueue jobs for all services in the run plan
 *
 * Fan-out strategy: Submit all services with no dependencies in parallel.
 * Services with dependencies will be submitted in waves after prerequisites complete.
 */
export async function enqueueRunJobs(context: RunContext): Promise<void> {
  const completedServices = new Set<string>();
  let wave = 0;

  while (completedServices.size < context.plan.services.length) {
    wave++;

    // Get services ready to run (dependencies satisfied)
    const readyServices = getReadyServices(context.plan, completedServices);

    if (readyServices.length === 0) {
      // No services ready - either all done or blocked by failures
      const pendingServices = Array.from(context.services.values()).filter(
        (s) => s.status === 'pending'
      );

      if (pendingServices.length > 0) {
        console.log(
          `[Run ${context.runId}] Wave ${wave}: No services ready, but ${pendingServices.length} still pending. Dependencies may have failed.`
        );

        // Mark blocked services as skipped
        for (const pending of pendingServices) {
          const result = context.services.get(pending.service)!;
          result.status = 'skipped';
          result.error = 'Dependencies failed or timed out';
          completedServices.add(pending.service);
        }
      }
      break;
    }

    console.log(
      `[Run ${context.runId}] Wave ${wave}: Submitting ${readyServices.length} services: ${readyServices.map((s) => s.service).join(', ')}`
    );

    // Execute all ready services in parallel
    const results = await Promise.allSettled(
      readyServices.map((service) => executeService(context, service))
    );

    // Process results
    for (let i = 0; i < results.length; i++) {
      const service = readyServices[i];
      const result = results[i];

      if (result.status === 'fulfilled') {
        completedServices.add(service.service);
      } else {
        console.error(
          `[Run ${context.runId}] Service ${service.service} threw error:`,
          result.reason
        );
        const serviceResult = context.services.get(service.service)!;
        serviceResult.status = 'failed';
        serviceResult.error = result.reason?.message || 'Unknown error';
        serviceResult.completedAt = new Date();
        completedServices.add(service.service);
      }
    }

    // Check for timeout
    if (new Date() > context.timeoutAt) {
      console.log(`[Run ${context.runId}] Run timeout exceeded, stopping execution`);
      context.status = 'timeout';
      break;
    }
  }
}

/**
 * Execute a single service
 */
async function executeService(
  context: RunContext,
  serviceDef: ServiceDefinition
): Promise<void> {
  const result = context.services.get(serviceDef.service)!;
  result.status = 'running';
  result.startedAt = new Date();

  console.log(`[Run ${context.runId}] Starting service: ${serviceDef.service}`);

  try {
    // Resolve worker configuration
    const mapping = getServiceSecretMapping(serviceDef.workerKey);
    if (!mapping) {
      throw new Error(`No service mapping found for worker: ${serviceDef.workerKey}`);
    }

    const config = await resolveWorkerConfig(mapping);
    if (!config.valid) {
      throw new Error(`Worker config invalid: ${config.error}`);
    }

    // Call the worker
    const workerResult = await callWorker(
      config,
      mapping,
      context.websiteId,
      context.runId,
      context.domain
    );

    result.completedAt = new Date();
    result.durationMs = result.completedAt.getTime() - result.startedAt.getTime();

    if (workerResult.status === 'success') {
      result.status = 'completed';
      result.payload = workerResult.payload;
      console.log(
        `[Run ${context.runId}] ✓ ${serviceDef.service} completed in ${result.durationMs}ms`
      );
    } else if (workerResult.status === 'timeout') {
      result.status = 'timeout';
      result.error = 'Worker timeout';
      console.log(`[Run ${context.runId}] ⏱ ${serviceDef.service} timed out`);
    } else {
      result.status = 'failed';
      result.error = workerResult.errorCode || 'Unknown error';
      console.log(
        `[Run ${context.runId}] ✗ ${serviceDef.service} failed: ${result.error}`
      );
    }
  } catch (error: any) {
    result.completedAt = new Date();
    result.durationMs = result.completedAt.getTime() - result.startedAt.getTime();
    result.status = 'failed';
    result.error = error.message;
    console.error(`[Run ${context.runId}] ✗ ${serviceDef.service} error:`, error);
  }
}

/**
 * Step 4.4: Wait for run completion with timeout
 *
 * Monitors service execution and returns when all complete or timeout occurs.
 * This is a simplified version since we're executing synchronously above.
 */
export async function waitForRun(context: RunContext): Promise<RunContext> {
  // In this implementation, enqueueRunJobs is synchronous (awaits all services)
  // So this function primarily checks final status and enforces timeout

  const now = new Date();

  if (now > context.timeoutAt && context.status === 'running') {
    context.status = 'timeout';
    console.log(`[Run ${context.runId}] Run exceeded maximum duration, marking as timeout`);

    // Mark any still-running services as timeout
    for (const [serviceId, result] of context.services.entries()) {
      if (result.status === 'running' || result.status === 'pending') {
        result.status = 'timeout';
        result.completedAt = new Date();
        result.error = 'Run timeout exceeded';
      }
    }
  }

  return context;
}

/**
 * Step 4.5: Finalize run - synthesize diagnosis and write summary
 *
 * Reads all KBase events for this run, synthesizes diagnosis, and writes final summary.
 */
export async function finalizeRun(context: RunContext): Promise<RunSummary> {
  context.completedAt = new Date();
  const durationMs = context.completedAt.getTime() - context.startedAt.getTime();

  // Calculate stats
  const stats = {
    completed: 0,
    failed: 0,
    timeout: 0,
    skipped: 0,
  };

  for (const result of context.services.values()) {
    switch (result.status) {
      case 'completed':
        stats.completed++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'timeout':
        stats.timeout++;
        break;
      case 'skipped':
        stats.skipped++;
        break;
    }
  }

  // Determine final run status
  let finalStatus: RunStatus;
  if (context.status === 'timeout') {
    finalStatus = 'timeout';
  } else if (stats.failed > 0 && stats.completed === 0) {
    finalStatus = 'failed';
  } else {
    finalStatus = 'completed';
  }

  console.log(
    `[Run ${context.runId}] Finalizing: ${stats.completed} completed, ${stats.failed} failed, ${stats.timeout} timeout, ${stats.skipped} skipped`
  );

  let diagnosisEventId: string | null = null;
  let synthesisError: string | null = null;

  try {
    // Run synthesis to create final diagnosis
    const diagnosis = await synthesizeAndWriteDiagnosis(context.websiteId, context.runId);
    diagnosisEventId = diagnosis.event_id;
    console.log(`[Run ${context.runId}] ✓ Diagnosis written: event_id=${diagnosisEventId}`);
  } catch (error: any) {
    console.error(`[Run ${context.runId}] ✗ Failed to synthesize diagnosis:`, error);
    synthesisError = error.message;
  }

  // Write final run_status to KBase
  const kbase = getKbaseClient();
  await kbase.writeEvent({
    website_id: context.websiteId,
    run_id: context.runId,
    service: 'hermes',
    type: 'run_status',
    payload: {
      status: finalStatus,
      plan_id: context.planId,
      domain: context.domain,
      started_at: context.startedAt.toISOString(),
      completed_at: context.completedAt.toISOString(),
      duration_ms: durationMs,
      services_completed: stats.completed,
      services_failed: stats.failed,
      services_timeout: stats.timeout,
      services_skipped: stats.skipped,
      services_total: context.plan.services.length,
      diagnosis_event_id: diagnosisEventId,
      synthesis_error: synthesisError,
      service_results: Array.from(context.services.values()).map((r) => ({
        service: r.service,
        status: r.status,
        duration_ms: r.durationMs,
        error: r.error,
      })),
    },
  });

  console.log(`[Run ${context.runId}] ✓ Run finalized with status: ${finalStatus}`);

  return {
    runId: context.runId,
    websiteId: context.websiteId,
    domain: context.domain,
    planId: context.planId,
    status: finalStatus,
    startedAt: context.startedAt,
    completedAt: context.completedAt,
    durationMs,
    servicesCompleted: stats.completed,
    servicesFailed: stats.failed,
    servicesTimeout: stats.timeout,
    servicesSkipped: stats.skipped,
    servicesTotal: context.plan.services.length,
    diagnosisEventId,
    error: synthesisError,
  };
}

/**
 * Step 4: Complete orchestrated run
 *
 * One-button full run: start → enqueue → wait → finalize
 */
export async function executeRun(
  websiteId: string,
  domain: string,
  planId: string = 'standard-v1'
): Promise<RunSummary> {
  console.log(`\n=== Starting Orchestrated Run for ${domain} ===\n`);

  // Step 4.2: Start run
  const context = await startRun(websiteId, domain, planId);

  try {
    // Step 4.3: Fan-out job submission
    await enqueueRunJobs(context);

    // Step 4.4: Wait for completion
    await waitForRun(context);
  } catch (error: any) {
    console.error(`[Run ${context.runId}] Unexpected error during execution:`, error);
    context.status = 'failed';
  }

  // Step 4.5: Finalize and synthesize
  const summary = await finalizeRun(context);

  console.log(`\n=== Run Complete: ${summary.status} ===`);
  console.log(`Duration: ${summary.durationMs}ms`);
  console.log(
    `Services: ${summary.servicesCompleted}/${summary.servicesTotal} completed, ${summary.servicesFailed} failed, ${summary.servicesTimeout} timeout`
  );
  if (summary.diagnosisEventId) {
    console.log(`Diagnosis: ${summary.diagnosisEventId}`);
  }
  console.log('');

  return summary;
}
