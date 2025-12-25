import { storage } from "../storage";
import { bitwardenProvider } from "../vault/BitwardenProvider";
import { servicesCatalog, computeMissingOutputs } from "@shared/servicesCatalog";
import { SERVICE_SECRET_MAP, getServiceBySlug } from "@shared/serviceSecretMap";
import type { InsertQaRun, InsertQaRunItem, QaRun, QaRunItem } from "@shared/schema";
import { logger } from "../utils/logger";

export type QaMode = "connection" | "smoke" | "full";
export type QaTrigger = "manual" | "scheduled" | "deploy";
export type TestStatus = "pass" | "fail" | "skipped";

interface TestResult {
  serviceSlug: string;
  testType: "connection" | "smoke" | "contract";
  status: TestStatus;
  durationMs: number;
  details: string;
  httpStatus?: number;
  latencyMs?: number;
  metricsJson?: Record<string, any>;
  missingOutputs?: string[];
  serviceRunId?: string;
}

interface QaRunResult {
  runId: string;
  status: "pass" | "fail" | "partial";
  summary: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  items: TestResult[];
  durationMs: number;
}

function generateQaRunId(): string {
  return `qa_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

async function testConnection(serviceSlug: string): Promise<TestResult> {
  const startTime = Date.now();
  const mapping = getServiceBySlug(serviceSlug);
  const serviceDef = servicesCatalog.find(s => s.slug === serviceSlug);
  
  if (!serviceDef) {
    return {
      serviceSlug,
      testType: "connection",
      status: "skipped",
      durationMs: Date.now() - startTime,
      details: "Service not found in catalog",
    };
  }

  if (serviceDef.buildState === "planned") {
    return {
      serviceSlug,
      testType: "connection",
      status: "skipped",
      durationMs: Date.now() - startTime,
      details: "Service not built yet",
    };
  }

  if (!mapping) {
    return {
      serviceSlug,
      testType: "connection",
      status: "skipped",
      durationMs: Date.now() - startTime,
      details: "No secret mapping configured",
    };
  }

  try {
    if (mapping.requiresBaseUrl && mapping.bitwardenSecret) {
      const config = await bitwardenProvider.getWorkerConfig(mapping.bitwardenSecret);
      
      if (!config.valid || !config.baseUrl) {
        return {
          serviceSlug,
          testType: "connection",
          status: "fail",
          durationMs: Date.now() - startTime,
          details: config.error || "Worker config invalid - no base_url found",
        };
      }

      const healthUrl = `${config.baseUrl}/health`;
      const fetchStart = Date.now();
      
      try {
        const response = await fetch(healthUrl, {
          method: "GET",
          headers: config.apiKey ? { "X-Api-Key": config.apiKey } : {},
          signal: AbortSignal.timeout(10000),
        });
        
        const latencyMs = Date.now() - fetchStart;
        
        if (response.ok) {
          return {
            serviceSlug,
            testType: "connection",
            status: "pass",
            durationMs: Date.now() - startTime,
            latencyMs,
            httpStatus: response.status,
            details: `Health check passed (${latencyMs}ms)`,
          };
        } else {
          return {
            serviceSlug,
            testType: "connection",
            status: "fail",
            durationMs: Date.now() - startTime,
            latencyMs,
            httpStatus: response.status,
            details: `Health check failed: HTTP ${response.status}`,
          };
        }
      } catch (fetchError: any) {
        return {
          serviceSlug,
          testType: "connection",
          status: "fail",
          durationMs: Date.now() - startTime,
          details: `Worker unreachable: ${fetchError.message}`,
        };
      }
    }

    if (mapping.bitwardenSecret) {
      const secrets = await bitwardenProvider.listSecrets();
      const hasSecret = secrets.some(s => s.key === mapping.bitwardenSecret);
      
      if (hasSecret) {
        return {
          serviceSlug,
          testType: "connection",
          status: "pass",
          durationMs: Date.now() - startTime,
          details: "Secret present in vault",
        };
      } else {
        return {
          serviceSlug,
          testType: "connection",
          status: "fail",
          durationMs: Date.now() - startTime,
          details: `Missing secret: ${mapping.bitwardenSecret}`,
        };
      }
    }

    return {
      serviceSlug,
      testType: "connection",
      status: "pass",
      durationMs: Date.now() - startTime,
      details: "No external connection required",
    };
  } catch (error: any) {
    return {
      serviceSlug,
      testType: "connection",
      status: "fail",
      durationMs: Date.now() - startTime,
      details: `Error: ${error.message}`,
    };
  }
}

async function testSmoke(serviceSlug: string, siteId?: string): Promise<TestResult> {
  const startTime = Date.now();
  const serviceDef = servicesCatalog.find(s => s.slug === serviceSlug);
  
  if (!serviceDef || serviceDef.buildState === "planned") {
    return {
      serviceSlug,
      testType: "smoke",
      status: "skipped",
      durationMs: Date.now() - startTime,
      details: "Service not built",
    };
  }

  const mapping = getServiceBySlug(serviceSlug);
  if (!mapping) {
    return {
      serviceSlug,
      testType: "smoke",
      status: "skipped",
      durationMs: Date.now() - startTime,
      details: "No secret mapping",
    };
  }

  try {
    if (mapping.requiresBaseUrl && mapping.bitwardenSecret) {
      const config = await bitwardenProvider.getWorkerConfig(mapping.bitwardenSecret);
      
      if (!config.valid || !config.baseUrl) {
        return {
          serviceSlug,
          testType: "smoke",
          status: "skipped",
          durationMs: Date.now() - startTime,
          details: "Worker not configured",
        };
      }

      const testUrl = `${config.baseUrl}/health/test`;
      const fetchStart = Date.now();
      
      try {
        const response = await fetch(testUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.apiKey ? { "X-Api-Key": config.apiKey } : {}),
          },
          body: JSON.stringify({ mode: "smoke", limit: 5 }),
          signal: AbortSignal.timeout(30000),
        });
        
        const latencyMs = Date.now() - fetchStart;
        
        if (response.ok) {
          const data = await response.json();
          
          const serviceRunId = await createServiceRunFromSmoke(serviceSlug, siteId, data);
          
          return {
            serviceSlug,
            testType: "smoke",
            status: "pass",
            durationMs: Date.now() - startTime,
            latencyMs,
            httpStatus: response.status,
            details: `Smoke test passed`,
            metricsJson: data.metrics,
            serviceRunId,
          };
        } else {
          return {
            serviceSlug,
            testType: "smoke",
            status: "fail",
            durationMs: Date.now() - startTime,
            latencyMs,
            httpStatus: response.status,
            details: `Smoke test failed: HTTP ${response.status}`,
          };
        }
      } catch (fetchError: any) {
        if (fetchError.message?.includes("404") || fetchError.cause?.code === "ENOTFOUND") {
          return {
            serviceSlug,
            testType: "smoke",
            status: "skipped",
            durationMs: Date.now() - startTime,
            details: "No /health/test endpoint available",
          };
        }
        return {
          serviceSlug,
          testType: "smoke",
          status: "fail",
          durationMs: Date.now() - startTime,
          details: `Smoke test error: ${fetchError.message}`,
        };
      }
    }

    return {
      serviceSlug,
      testType: "smoke",
      status: "skipped",
      durationMs: Date.now() - startTime,
      details: "No smoke test available for this service type",
    };
  } catch (error: any) {
    return {
      serviceSlug,
      testType: "smoke",
      status: "fail",
      durationMs: Date.now() - startTime,
      details: `Error: ${error.message}`,
    };
  }
}

async function testContract(serviceSlug: string, smokeResult?: TestResult): Promise<TestResult> {
  const startTime = Date.now();
  const serviceDef = servicesCatalog.find(s => s.slug === serviceSlug);
  
  if (!serviceDef) {
    return {
      serviceSlug,
      testType: "contract",
      status: "skipped",
      durationMs: Date.now() - startTime,
      details: "Service not found",
    };
  }

  if (!smokeResult || smokeResult.status !== "pass") {
    return {
      serviceSlug,
      testType: "contract",
      status: "skipped",
      durationMs: Date.now() - startTime,
      details: "Smoke test did not pass",
    };
  }

  const expectedOutputs = serviceDef.outputs || [];
  const actualOutputs = Object.keys(smokeResult.metricsJson || {});
  const missing = expectedOutputs.filter(o => !actualOutputs.includes(o));

  if (missing.length === 0) {
    return {
      serviceSlug,
      testType: "contract",
      status: "pass",
      durationMs: Date.now() - startTime,
      details: `All ${expectedOutputs.length} expected outputs present`,
    };
  } else if (missing.length < expectedOutputs.length) {
    return {
      serviceSlug,
      testType: "contract",
      status: "pass",
      durationMs: Date.now() - startTime,
      details: `Partial: ${actualOutputs.length}/${expectedOutputs.length} outputs present`,
      missingOutputs: missing,
    };
  } else {
    return {
      serviceSlug,
      testType: "contract",
      status: "fail",
      durationMs: Date.now() - startTime,
      details: `Missing all expected outputs`,
      missingOutputs: missing,
    };
  }
}

async function createServiceRunFromSmoke(
  serviceSlug: string,
  siteId: string | undefined,
  smokeData: any
): Promise<string> {
  const runId = `svc_run_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  
  await storage.createServiceRun({
    runId,
    serviceId: serviceSlug,
    siteId: siteId || null,
    status: "success",
    startedAt: new Date(),
    finishedAt: new Date(),
    durationMs: smokeData.durationMs || 0,
    summary: "QA smoke test",
    metricsJson: smokeData.metrics || {},
    outputsJson: { actualOutputs: Object.keys(smokeData.metrics || {}) },
  });
  
  return runId;
}

export async function runQa(options: {
  siteId?: string;
  mode?: QaMode;
  trigger?: QaTrigger;
  serviceFilter?: string[];
}): Promise<QaRunResult> {
  const { siteId, mode = "connection", trigger = "manual", serviceFilter } = options;
  const runId = generateQaRunId();
  const startTime = Date.now();
  
  logger.info("QA", `Starting QA run: ${runId} (mode=${mode}, trigger=${trigger})`);
  
  const qaRun = await storage.createQaRun({
    runId,
    siteId: siteId || null,
    trigger,
    mode,
    status: "running",
    startedAt: new Date(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  });

  const services = serviceFilter 
    ? servicesCatalog.filter(s => serviceFilter.includes(s.slug))
    : servicesCatalog;

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const service of services) {
    const connectionResult = await testConnection(service.slug);
    results.push(connectionResult);
    
    await storage.createQaRunItem({
      qaRunId: runId,
      serviceSlug: service.slug,
      testType: "connection",
      status: connectionResult.status,
      durationMs: connectionResult.durationMs,
      details: connectionResult.details,
      httpStatus: connectionResult.httpStatus,
      latencyMs: connectionResult.latencyMs,
      metricsJson: connectionResult.metricsJson,
    });

    if (connectionResult.status === "pass") passed++;
    else if (connectionResult.status === "fail") failed++;
    else skipped++;

    if (mode === "smoke" || mode === "full") {
      const smokeResult = await testSmoke(service.slug, siteId);
      results.push(smokeResult);
      
      await storage.createQaRunItem({
        qaRunId: runId,
        serviceSlug: service.slug,
        testType: "smoke",
        status: smokeResult.status,
        durationMs: smokeResult.durationMs,
        details: smokeResult.details,
        httpStatus: smokeResult.httpStatus,
        latencyMs: smokeResult.latencyMs,
        metricsJson: smokeResult.metricsJson,
        serviceRunId: smokeResult.serviceRunId,
      });

      if (smokeResult.status === "pass") passed++;
      else if (smokeResult.status === "fail") failed++;
      else skipped++;

      if (mode === "full") {
        const contractResult = await testContract(service.slug, smokeResult);
        results.push(contractResult);
        
        await storage.createQaRunItem({
          qaRunId: runId,
          serviceSlug: service.slug,
          testType: "contract",
          status: contractResult.status,
          durationMs: contractResult.durationMs,
          details: contractResult.details,
          missingOutputs: contractResult.missingOutputs,
        });

        if (contractResult.status === "pass") passed++;
        else if (contractResult.status === "fail") failed++;
        else skipped++;
      }
    }
  }

  const totalTests = passed + failed + skipped;
  const durationMs = Date.now() - startTime;
  
  const overallStatus = failed === 0 ? "pass" : (passed > 0 ? "partial" : "fail");
  const summary = `${passed}/${totalTests} tests passed, ${failed} failed, ${skipped} skipped`;

  await storage.updateQaRun(runId, {
    status: overallStatus,
    finishedAt: new Date(),
    durationMs,
    summary,
    totalTests,
    passed,
    failed,
    skipped,
    resultsJson: { items: results },
  });

  logger.info("QA", `QA run complete: ${runId} - ${summary}`);

  return {
    runId,
    status: overallStatus,
    summary,
    totalTests,
    passed,
    failed,
    skipped,
    items: results,
    durationMs,
  };
}

export async function getQaRun(runId: string): Promise<{ run: QaRun; items: QaRunItem[] } | null> {
  const run = await storage.getQaRunById(runId);
  if (!run) return null;
  
  const items = await storage.getQaRunItems(runId);
  return { run, items };
}

export async function getLatestQaRuns(limit = 10): Promise<QaRun[]> {
  return storage.getLatestQaRuns(limit);
}
