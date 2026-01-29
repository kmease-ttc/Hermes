import { storage } from "./storage";
import { logger } from "./utils/logger";
import { SERVICE_SECRET_MAP, type ServiceSecretMapping } from "@shared/serviceSecretMap";
import { servicesCatalog, type ServiceDefinition } from "@shared/servicesCatalog";
import { 
  TestJobTypes, 
  TestJobStatuses, 
  ServiceRunTypes,
  type TestJobProgress,
  type TestJobType,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { resolveWorkerConfig } from "./workerConfigResolver";

// Cold-start resilience: Check if error is likely due to cold start
function isColdStartError(error: Error | null, httpStatus?: number): boolean {
  if (!error && !httpStatus) return false;
  // HTTP status codes indicating cold start
  if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504) return true;
  // Timeout or connection errors
  if (error?.message) {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out')) return true;
    if (msg.includes('econnrefused') || msg.includes('econnreset')) return true;
    if (msg.includes('fetch failed') || msg.includes('network')) return true;
  }
  return false;
}

// Warm up a service by pinging its health endpoint with retry
async function warmUpService(baseUrl: string, healthPath: string = '/health'): Promise<{ warmedUp: boolean; retriedWarmup: boolean; error?: string }> {
  const healthUrl = `${baseUrl}${healthPath}`;
  let retriedWarmup = false;
  
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      logger.debug("TestRunner", `Warm-up attempt ${attempt} for ${baseUrl}`);
      const res = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000), // Short timeout for warmup
      });
      
      // Only treat 2xx responses as successful warmup
      if (res.ok && res.status >= 200 && res.status < 300) {
        logger.debug("TestRunner", `Warm-up successful for ${baseUrl}`, { attempt, status: res.status });
        return { warmedUp: true, retriedWarmup: attempt > 1 };
      }
      
      // 5xx error - cold start likely, retry
      if (attempt === 1 && (res.status === 502 || res.status === 503 || res.status === 504)) {
        retriedWarmup = true;
        logger.info("TestRunner", `Cold start detected (${res.status}), retrying warmup...`, { baseUrl });
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s before retry
        continue;
      }
      
      return { warmedUp: false, retriedWarmup, error: `Health check returned ${res.status}` };
    } catch (err: any) {
      if (attempt === 1 && isColdStartError(err)) {
        retriedWarmup = true;
        logger.info("TestRunner", `Cold start error on warmup, retrying...`, { baseUrl, error: err.message });
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }
      return { warmedUp: false, retriedWarmup, error: err.message };
    }
  }
  
  return { warmedUp: false, retriedWarmup, error: 'Warmup failed after retries' };
}

// Make a fetch request with cold-start retry logic
async function fetchWithColdStartRetry(
  url: string, 
  options: RequestInit, 
  timeoutMs: number = 10000
): Promise<{ response: Response | null; retriedColdStart: boolean; error?: Error }> {
  let retriedColdStart = false;
  
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });
      
      // If we get a cold-start response and this is first attempt, retry
      if (attempt === 1 && isColdStartError(null, res.status)) {
        retriedColdStart = true;
        logger.info("TestRunner", `Cold start response (${res.status}), retrying after delay...`, { url });
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      return { response: res, retriedColdStart };
    } catch (err: any) {
      if (attempt === 1 && isColdStartError(err)) {
        retriedColdStart = true;
        logger.info("TestRunner", `Cold start error, retrying...`, { url, error: err.message });
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      return { response: null, retriedColdStart, error: err };
    }
  }
  
  return { response: null, retriedColdStart, error: new Error('Request failed after cold-start retry') };
}

export interface RunnableService {
  slug: string;
  displayName: string;
  integrationType: 'worker' | 'connector' | 'infrastructure';
  supportsAsync: boolean;
  catalogEntry: ServiceDefinition;
  mapping: ServiceSecretMapping;
  integration: any | null;
}

export interface GetRunnableServicesResult {
  services: RunnableService[];
  debugReasons: string[];
}

export async function getRunnableServices(
  siteId: string | null, 
  mode: 'connection' | 'smoke'
): Promise<GetRunnableServicesResult> {
  const debugReasons: string[] = [];
  const services: RunnableService[] = [];
  
  const workerMappings = SERVICE_SECRET_MAP.filter(m => m.type === "worker" && m.requiresBaseUrl);
  
  if (workerMappings.length === 0) {
    debugReasons.push("No worker services found in SERVICE_SECRET_MAP with requiresBaseUrl=true");
    return { services, debugReasons };
  }
  
  logger.info("TestRunner", `Found ${workerMappings.length} worker mappings to check`, { 
    slugs: workerMappings.map(m => m.serviceSlug),
    mode,
    siteId 
  });

  for (const mapping of workerMappings) {
    const catalogEntry = servicesCatalog.find(s => s.slug === mapping.serviceSlug);
    
    if (!catalogEntry) {
      debugReasons.push(`${mapping.serviceSlug}: Not found in servicesCatalog`);
      continue;
    }

    // Use unified resolver to get worker config directly from Bitwarden
    const workerConfig = await resolveWorkerConfig(mapping.serviceSlug, siteId || undefined);
    
    logger.info("TestRunner", `Resolved config for ${mapping.serviceSlug}`, {
      secretName: workerConfig.secretName,
      rawValueType: workerConfig.rawValueType,
      base_url_present: !!workerConfig.base_url,
      api_key_present: !!workerConfig.api_key,
      valid: workerConfig.valid,
      error: workerConfig.error,
    });

    if (!workerConfig.valid) {
      debugReasons.push(`${mapping.serviceSlug}: ${workerConfig.error || 'Config invalid'}`);
      continue;
    }

    if (!workerConfig.base_url) {
      debugReasons.push(`${mapping.serviceSlug}: No base_url in Bitwarden secret (secretName: ${workerConfig.secretName})`);
      continue;
    }

    if (mode === 'smoke' && !workerConfig.api_key) {
      debugReasons.push(`${mapping.serviceSlug}: No api_key in Bitwarden secret (required for smoke)`);
      continue;
    }

    // Create integration object from worker config for compatibility
    const integration = {
      id: mapping.serviceSlug,
      baseUrl: workerConfig.base_url,
      apiKey: workerConfig.api_key,
      healthEndpoint: workerConfig.health_path,
      status: 'active',
    };

    services.push({
      slug: mapping.serviceSlug,
      displayName: mapping.displayName,
      integrationType: mapping.type as 'worker' | 'connector' | 'infrastructure',
      supportsAsync: Boolean(mapping.workerEndpoints?.status),
      catalogEntry,
      mapping,
      integration,
    });
  }

  logger.info("TestRunner", `Runnable services: ${services.length}`, {
    mode,
    services: services.map(s => s.slug),
    skippedReasons: debugReasons.length,
  });

  return { services, debugReasons };
}

function generateJobId(type: TestJobType): string {
  return `testjob_${type}_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

function generateRunId(prefix: string, slug: string): string {
  return `${prefix}_${Date.now()}_${slug}`;
}

export async function startConnectionTest(siteId: string | null): Promise<{ jobId: string; error?: string }> {
  const { services, debugReasons } = await getRunnableServices(siteId, 'connection');
  
  if (services.length === 0) {
    const error = `0 services found because: ${debugReasons.join('; ') || 'no worker services configured'}`;
    logger.warn("TestRunner", error);
    return { jobId: '', error };
  }

  const jobId = generateJobId(TestJobTypes.CONNECTION_ALL);
  const initialProgress: TestJobProgress = {
    total: services.length,
    started: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    perService: {},
  };

  for (const svc of services) {
    initialProgress.perService[svc.slug] = { status: 'queued' };
  }

  await storage.createTestJob({
    jobId,
    siteId,
    jobType: TestJobTypes.CONNECTION_ALL,
    status: TestJobStatuses.RUNNING,
    startedAt: new Date(),
    progressJson: initialProgress,
  });

  runConnectionTestsAsync(jobId, services).catch(err => {
    logger.error("TestRunner", "Connection test job failed", { jobId, error: err.message });
  });

  return { jobId };
}

async function runConnectionTestsAsync(jobId: string, services: RunnableService[]) {
  const progress: TestJobProgress = {
    total: services.length,
    started: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    perService: {},
  };

  for (const svc of services) {
    progress.perService[svc.slug] = { status: 'running' };
    progress.started++;
    await storage.updateTestJob(jobId, { progressJson: progress });

    const startTime = Date.now();
    const runId = generateRunId('conn', svc.slug);
    
    try {
      // Use the health endpoint from the resolved config (supports custom health paths)
      const healthPath = svc.integration.healthEndpoint || '/health';
      const healthUrl = `${svc.integration.baseUrl}${healthPath}`;
      
      logger.debug("TestRunner", `Testing connection for ${svc.slug}`, { 
        healthUrl, 
        hasApiKey: !!svc.integration.apiKey 
      });
      
      // Warm up the service first (cold-start resilience)
      const warmup = await warmUpService(svc.integration.baseUrl, healthPath);
      if (warmup.retriedWarmup) {
        logger.info("TestRunner", `Service ${svc.slug} needed warmup retry`, { baseUrl: svc.integration.baseUrl });
      }
      
      // Health check with cold-start retry
      const { response: healthRes, retriedColdStart, error: healthError } = await fetchWithColdStartRetry(
        healthUrl,
        { method: 'GET', headers: { 'Accept': 'application/json' } },
        5000
      );

      if (healthError || !healthRes) {
        throw healthError || new Error('Health check failed after retries');
      }

      const healthOk = healthRes.ok;
      let authOk = true;

      if (svc.integration.apiKey) {
        const { response: authRes, error: authError } = await fetchWithColdStartRetry(
          healthUrl,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${svc.integration.apiKey}`,
            },
          },
          5000
        );
        authOk = authRes?.ok ?? false;
      }

      const passed = healthOk && authOk;
      progress.perService[svc.slug] = {
        status: passed ? 'pass' : 'fail',
        durationMs: Date.now() - startTime,
        error: passed ? undefined : `Health: ${healthOk}, Auth: ${authOk}`,
        retriedColdStart: retriedColdStart || warmup.retriedWarmup,
      };

      if (passed) {
        progress.completed++;
      } else {
        progress.failed++;
      }

      await storage.createServiceRun({
        runId,
        runType: ServiceRunTypes.CONNECTION,
        serviceId: svc.slug,
        serviceName: svc.displayName,
        trigger: 'manual',
        status: passed ? 'success' : 'failed',
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        durationMs: Date.now() - startTime,
        summary: passed ? 'Connection test passed' : 'Connection test failed',
      });

      // Try to update or create integration record for health status tracking
      try {
        const existingIntegration = await storage.getIntegrationById(svc.slug);
        if (existingIntegration) {
          await storage.updateIntegration(svc.slug, {
            lastHealthCheckAt: new Date(),
            healthCheckStatus: passed ? 'pass' : 'fail',
            healthStatus: passed ? 'healthy' : 'error',
            baseUrl: svc.integration.baseUrl,
            healthEndpoint: healthPath,
          });
        } else {
          // Integration record doesn't exist - create it with required fields
          await storage.createIntegration({
            integrationId: svc.slug,
            name: svc.displayName,
            category: svc.mapping.category || 'analysis',
            baseUrl: svc.integration.baseUrl,
            healthEndpoint: healthPath,
            secretKeyName: svc.mapping.envVar || undefined,
            secretExists: true,
            lastHealthCheckAt: new Date(),
            healthCheckStatus: passed ? 'pass' : 'fail',
            healthStatus: passed ? 'healthy' : 'error',
            deploymentStatus: 'deployed',
            hasRequiredEndpoints: true,
          });
        }
      } catch (storageErr: any) {
        logger.warn("TestRunner", `Could not save integration status for ${svc.slug}`, { 
          error: storageErr.message 
        });
      }

    } catch (err: any) {
      progress.perService[svc.slug] = {
        status: 'fail',
        durationMs: Date.now() - startTime,
        error: err.message,
      };
      progress.failed++;

      await storage.createServiceRun({
        runId,
        runType: ServiceRunTypes.CONNECTION,
        serviceId: svc.slug,
        serviceName: svc.displayName,
        trigger: 'manual',
        status: 'failed',
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        durationMs: Date.now() - startTime,
        summary: `Connection failed: ${err.message}`,
        errorDetail: err.message,
      });
    }

    await storage.updateTestJob(jobId, { progressJson: progress });
  }

  const summary = `Connection tests: ${progress.completed} passed, ${progress.failed} failed, ${progress.skipped} skipped`;
  await storage.updateTestJob(jobId, {
    status: progress.failed > 0 ? TestJobStatuses.FAILED : TestJobStatuses.DONE,
    finishedAt: new Date(),
    summary,
    progressJson: progress,
  });

  logger.info("TestRunner", "Connection test job completed", { jobId, summary });
}

export async function startSmokeTest(siteId: string | null): Promise<{ jobId: string; error?: string }> {
  const { services, debugReasons } = await getRunnableServices(siteId, 'smoke');
  
  if (services.length === 0) {
    const error = `0 services found because: ${debugReasons.join('; ') || 'no worker services configured with api_key'}`;
    logger.warn("TestRunner", error);
    return { jobId: '', error };
  }

  const jobId = generateJobId(TestJobTypes.SMOKE_ALL);
  const initialProgress: TestJobProgress = {
    total: services.length,
    started: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    perService: {},
  };

  for (const svc of services) {
    initialProgress.perService[svc.slug] = { 
      status: 'queued',
      expectedOutputs: svc.catalogEntry.outputs || [],
    };
  }

  await storage.createTestJob({
    jobId,
    siteId,
    jobType: TestJobTypes.SMOKE_ALL,
    status: TestJobStatuses.RUNNING,
    startedAt: new Date(),
    progressJson: initialProgress,
  });

  runSmokeTestsAsync(jobId, services).catch(err => {
    logger.error("TestRunner", "Smoke test job failed", { jobId, error: err.message });
  });

  return { jobId };
}

function getSmokePayload(slug: string, domain: string): Record<string, any> {
  const basePayload = { domain, mode: 'smoke' };
  
  switch (slug) {
    case 'crawl_render':
      return { ...basePayload, max_urls: 10, depth: 1 };
    case 'serp_intel':
      return { ...basePayload, keywords: 5, limit: 5 };
    case 'backlink_authority':
      return { ...basePayload, limit: 5 };
    case 'content_generator':
      return { ...basePayload, dry_run: true, limit: 1 };
    case 'competitive_snapshot':
      return { ...basePayload, limit: 3 };
    default:
      return { ...basePayload, limit: 1 };
  }
}

function checkOutputPresence(data: any, outputKey: string): boolean {
  if (!data || typeof data !== 'object') return false;
  if (outputKey in data && data[outputKey] !== null && data[outputKey] !== undefined) return true;
  if ('data' in data && data.data && outputKey in data.data) return true;
  if ('result' in data && data.result && outputKey in data.result) return true;
  const snakeKey = outputKey.replace(/([A-Z])/g, '_$1').toLowerCase();
  if (snakeKey in data) return true;
  return false;
}

async function runSmokeTestsAsync(jobId: string, services: RunnableService[]) {
  const progress: TestJobProgress = {
    total: services.length,
    started: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    perService: {},
  };

  const domain = process.env.DOMAIN || 'empathyhealthclinic.com';

  for (const svc of services) {
    const expectedOutputs = svc.catalogEntry.outputs || [];
    progress.perService[svc.slug] = { 
      status: 'running',
      expectedOutputs,
    };
    progress.started++;
    await storage.updateTestJob(jobId, { progressJson: progress });

    const startTime = Date.now();
    const runId = generateRunId('smoke', svc.slug);
    
    try {
      // Use workerEndpoints.smokeTest from config, fallback to /api/smoke
      const smokeEndpoint = svc.mapping.workerEndpoints?.smokeTest || '/api/smoke';
      const smokeUrl = `${svc.integration.baseUrl}${smokeEndpoint}`;
      const smokePayload = getSmokePayload(svc.slug, domain);
      
      // Warm up the service first (cold-start resilience)
      const healthPath = svc.integration.healthEndpoint || '/health';
      const warmup = await warmUpService(svc.integration.baseUrl, healthPath);
      if (warmup.retriedWarmup) {
        logger.info("TestRunner", `Smoke test: service ${svc.slug} needed warmup retry`, { baseUrl: svc.integration.baseUrl });
      }
      
      // If smokeTest endpoint is /health or ends with /health, use GET (health endpoints don't accept POST)
      const isHealthEndpoint = smokeEndpoint === '/health' || smokeEndpoint.endsWith('/health');
      
      // Make smoke request with cold-start retry
      const { response: smokeRes, retriedColdStart, error: smokeError } = await fetchWithColdStartRetry(
        smokeUrl,
        {
          method: isHealthEndpoint ? 'GET' : 'POST',
          headers: {
            'Accept': 'application/json',
            ...(isHealthEndpoint ? {} : { 'Content-Type': 'application/json' }),
            'Authorization': `Bearer ${svc.integration.apiKey}`,
            'X-API-Key': svc.integration.apiKey,
          },
          ...(isHealthEndpoint ? {} : { body: JSON.stringify(smokePayload) }),
        },
        60000
      );
      
      if (smokeError || !smokeRes) {
        throw smokeError || new Error('Smoke test failed after retries');
      }
      
      if (retriedColdStart || warmup.retriedWarmup) {
        logger.info("TestRunner", `Smoke test completed after cold-start handling for ${svc.slug}`);
      }

      if (smokeRes.status === 202) {
        const asyncData = await smokeRes.json();
        const workerJobId = asyncData.jobId || asyncData.job_id;
        
        progress.perService[svc.slug] = {
          status: 'running',
          workerJobId,
          expectedOutputs,
        };
        await storage.updateTestJob(jobId, { progressJson: progress });

        await storage.createServiceRun({
          runId,
          runType: ServiceRunTypes.SMOKE,
          serviceId: svc.slug,
          serviceName: svc.displayName,
          trigger: 'manual',
          status: 'running',
          startedAt: new Date(startTime),
          metricsJson: { workerJobId },
        });

        const result = await pollWorkerJob(svc.integration.baseUrl, svc.integration.apiKey, workerJobId);
        
        const actualOutputs = expectedOutputs.filter(o => checkOutputPresence(result, o));
        const missingOutputs = expectedOutputs.filter(o => !actualOutputs.includes(o));
        const status = missingOutputs.length === 0 ? 'pass' : (actualOutputs.length > 0 ? 'partial' : 'fail');

        progress.perService[svc.slug] = {
          status,
          durationMs: Date.now() - startTime,
          expectedOutputs,
          actualOutputs,
          missingOutputs,
        };

        if (status === 'pass') progress.completed++;
        else if (status === 'partial') progress.completed++;
        else progress.failed++;

        await storage.updateServiceRun(runId, {
          status: status === 'pass' ? 'success' : status === 'partial' ? 'partial' : 'failed',
          finishedAt: new Date(),
          durationMs: Date.now() - startTime,
          summary: `Smoke: ${actualOutputs.length}/${expectedOutputs.length} outputs`,
          outputsJson: { expectedOutputs, actualOutputs, missingOutputs },
        });

      } else if (smokeRes.ok) {
        const smokeData = await smokeRes.json();
        const actualOutputs = expectedOutputs.filter(o => checkOutputPresence(smokeData, o));
        const missingOutputs = expectedOutputs.filter(o => !actualOutputs.includes(o));
        const status = missingOutputs.length === 0 ? 'pass' : (actualOutputs.length > 0 ? 'partial' : 'fail');

        progress.perService[svc.slug] = {
          status,
          durationMs: Date.now() - startTime,
          expectedOutputs,
          actualOutputs,
          missingOutputs,
        };

        if (status === 'pass') progress.completed++;
        else if (status === 'partial') progress.completed++;
        else progress.failed++;

        await storage.createServiceRun({
          runId,
          runType: ServiceRunTypes.SMOKE,
          serviceId: svc.slug,
          serviceName: svc.displayName,
          trigger: 'manual',
          status: status === 'pass' ? 'success' : status === 'partial' ? 'partial' : 'failed',
          startedAt: new Date(startTime),
          finishedAt: new Date(),
          durationMs: Date.now() - startTime,
          summary: `Smoke: ${actualOutputs.length}/${expectedOutputs.length} outputs`,
          outputsJson: { expectedOutputs, actualOutputs, missingOutputs },
        });

      } else {
        throw new Error(`Smoke test returned ${smokeRes.status}: ${await smokeRes.text()}`);
      }

    } catch (err: any) {
      progress.perService[svc.slug] = {
        status: 'fail',
        durationMs: Date.now() - startTime,
        error: err.message,
        expectedOutputs,
        actualOutputs: [],
        missingOutputs: expectedOutputs,
      };
      progress.failed++;

      await storage.createServiceRun({
        runId,
        runType: ServiceRunTypes.SMOKE,
        serviceId: svc.slug,
        serviceName: svc.displayName,
        trigger: 'manual',
        status: 'failed',
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        durationMs: Date.now() - startTime,
        summary: `Smoke failed: ${err.message}`,
        errorDetail: err.message,
        outputsJson: { expectedOutputs, actualOutputs: [], missingOutputs: expectedOutputs },
      });
    }

    await storage.updateTestJob(jobId, { progressJson: progress });
  }

  const passCount = Object.values(progress.perService).filter(p => p.status === 'pass').length;
  const partialCount = Object.values(progress.perService).filter(p => p.status === 'partial').length;
  const summary = `Smoke tests: ${passCount} pass, ${partialCount} partial, ${progress.failed} fail`;
  
  await storage.updateTestJob(jobId, {
    status: progress.failed > 0 ? TestJobStatuses.FAILED : TestJobStatuses.DONE,
    finishedAt: new Date(),
    summary,
    progressJson: progress,
  });

  logger.info("TestRunner", "Smoke test job completed", { jobId, summary });
}

async function pollWorkerJob(baseUrl: string, apiKey: string, workerJobId: string, maxAttempts = 60): Promise<any> {
  const statusUrl = `${baseUrl}/api/status?jobId=${workerJobId}`;
  
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      const res = await fetch(statusUrl, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;
      
      const data = await res.json();
      if (data.status === 'completed' || data.status === 'done') {
        return data.result || data;
      }
      if (data.status === 'failed' || data.status === 'error') {
        throw new Error(data.error || 'Worker job failed');
      }
    } catch {
    }
  }
  
  throw new Error(`Worker job ${workerJobId} timed out after ${maxAttempts * 5}s`);
}
