import { storage } from "./storage";
import { 
  DiagnosticStages, 
  DiagnosticStageOrder, 
  type DiagnosticStage, 
  type DiagnosticStageResult,
  type InsertConnectorDiagnostic,
  type FailureBucket,
  FailureBucketSuggestions,
} from "@shared/schema";
import { logger } from "./utils/logger";
import { createHash } from "crypto";

export function computeKeyFingerprint(apiKey: string): string {
  const hash = createHash('sha256').update(apiKey).digest('hex');
  return `${hash.slice(0, 6)}…${hash.slice(-6)}`;
}

export interface FailureClassification {
  bucket: FailureBucket;
  suggestedFix: string;
}

export function classifyFailure(details?: Record<string, unknown>): FailureClassification {
  if (!details) {
    return { bucket: 'unknown', suggestedFix: FailureBucketSuggestions.unknown };
  }

  const statusCode = details.statusCode as number | undefined 
    ?? details.status as number | undefined
    ?? details.httpStatus as number | undefined;
  const contentType = (details.contentType as string | undefined 
    ?? details['content-type'] as string | undefined 
    ?? '').toLowerCase();
  const errorMessage = (details.error as string | undefined 
    ?? details.errorMessage as string | undefined
    ?? details.message as string | undefined 
    ?? '').toLowerCase();
  const responseSnippet = (details.responseSnippet as string | undefined 
    ?? details.snippet as string | undefined
    ?? details.body as string | undefined
    ?? '').toLowerCase();

  // Check for timeout errors
  if (errorMessage.includes('timeout') || 
      errorMessage.includes('timed out') || 
      errorMessage.includes('etimedout') ||
      errorMessage.includes('econnreset') ||
      errorMessage.includes('socket hang up')) {
    return { bucket: 'timeout', suggestedFix: FailureBucketSuggestions.timeout };
  }

  // Check for DNS/TLS errors
  if (errorMessage.includes('enotfound') || 
      errorMessage.includes('dns') || 
      errorMessage.includes('getaddrinfo') ||
      errorMessage.includes('certificate') ||
      errorMessage.includes('ssl') ||
      errorMessage.includes('tls') ||
      errorMessage.includes('unable to verify')) {
    return { bucket: 'dns', suggestedFix: FailureBucketSuggestions.dns };
  }

  // Check status codes
  if (statusCode) {
    // 404 with HTML - wrong endpoint
    if (statusCode === 404) {
      if (contentType.includes('text/html') || responseSnippet.includes('<!doctype') || responseSnippet.includes('<html')) {
        return { bucket: 'wrong_endpoint_404', suggestedFix: FailureBucketSuggestions.wrong_endpoint_404 };
      }
      return { bucket: 'wrong_endpoint_404', suggestedFix: FailureBucketSuggestions.wrong_endpoint_404 };
    }

    // 401/403 - auth failure
    if (statusCode === 401 || statusCode === 403) {
      return { bucket: 'auth_401_403', suggestedFix: FailureBucketSuggestions.auth_401_403 };
    }

    // 3xx redirects
    if (statusCode >= 300 && statusCode < 400) {
      return { bucket: 'redirect_3xx', suggestedFix: FailureBucketSuggestions.redirect_3xx };
    }

    // 200 but HTML content (SPA shell)
    if (statusCode === 200 && (contentType.includes('text/html') || responseSnippet.includes('<!doctype') || responseSnippet.includes('<html'))) {
      return { bucket: 'html_200_app_shell', suggestedFix: FailureBucketSuggestions.html_200_app_shell };
    }
  }

  // Check for HTML in response without status code
  if (responseSnippet.includes('<!doctype') || responseSnippet.includes('<html')) {
    if (contentType.includes('text/html')) {
      return { bucket: 'html_200_app_shell', suggestedFix: FailureBucketSuggestions.html_200_app_shell };
    }
  }

  // Check error message for common patterns
  if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden') || errorMessage.includes('invalid api key')) {
    return { bucket: 'auth_401_403', suggestedFix: FailureBucketSuggestions.auth_401_403 };
  }

  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return { bucket: 'wrong_endpoint_404', suggestedFix: FailureBucketSuggestions.wrong_endpoint_404 };
  }

  if (errorMessage.includes('redirect') || errorMessage.includes('moved')) {
    return { bucket: 'redirect_3xx', suggestedFix: FailureBucketSuggestions.redirect_3xx };
  }

  // Check for JSON parse errors indicating HTML response
  if (errorMessage.includes('unexpected token') && (errorMessage.includes('<') || errorMessage.includes('doctype'))) {
    return { bucket: 'html_200_app_shell', suggestedFix: FailureBucketSuggestions.html_200_app_shell };
  }

  return { bucket: 'unknown', suggestedFix: FailureBucketSuggestions.unknown };
}

export interface ServiceDiagnosticConfig {
  serviceId: string;
  serviceName: string;
  siteId?: string;
  authMode: 'oauth' | 'api_key' | 'none';
  expectedResponseType: 'json' | 'html' | 'text';
  requiredOutputFields: string[];
  requestId?: string;
}

export interface DiagnosticContext {
  runId: string;
  requestId: string;
  config: ServiceDiagnosticConfig;
  stages: DiagnosticStageResult[];
  currentStageIndex: number;
  startedAt: Date;
  configSnapshot: Record<string, unknown>;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateDiagnosticRunId(): string {
  return `diag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function redactSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  const secretPatterns = /token|secret|key|password|auth|credential/i;
  
  for (const [key, value] of Object.entries(obj)) {
    if (secretPatterns.test(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSecrets(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export class DiagnosticsRunner {
  private context: DiagnosticContext | null = null;

  async start(config: ServiceDiagnosticConfig): Promise<string> {
    const runId = generateDiagnosticRunId();
    const requestId = config.requestId || generateRequestId();
    const stages: DiagnosticStageResult[] = DiagnosticStageOrder.map(stage => ({
      stage,
      status: 'pending' as const,
      message: 'Not started',
    }));

    this.context = {
      runId,
      requestId,
      config,
      stages,
      currentStageIndex: -1,
      startedAt: new Date(),
      configSnapshot: {},
    };

    await storage.createConnectorDiagnostic({
      runId,
      siteId: config.siteId || null,
      serviceId: config.serviceId,
      serviceName: config.serviceName,
      trigger: 'manual',
      overallStatus: 'pending',
      stagesJson: stages,
      configSnapshot: {},
      authMode: config.authMode,
      expectedResponseType: config.expectedResponseType,
      requiredOutputFields: config.requiredOutputFields,
      startedAt: new Date(),
      finishedAt: null,
      durationMs: null,
    });

    logger.info('Diagnostics', `Started diagnostic run ${runId} for ${config.serviceId}`);
    return runId;
  }

  async passStage(
    stage: DiagnosticStage,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.updateStage(stage, 'pass', message, details);
  }

  async failStage(
    stage: DiagnosticStage,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    // Classify the failure and add to details
    const classification = classifyFailure(details);
    await this.updateStage(stage, 'fail', message, details, classification);
  }

  async skipStage(
    stage: DiagnosticStage,
    message: string
  ): Promise<void> {
    await this.updateStage(stage, 'skipped', message);
  }

  private async updateStage(
    stage: DiagnosticStage,
    status: 'pass' | 'fail' | 'skipped',
    message: string,
    details?: Record<string, unknown>,
    classification?: FailureClassification
  ): Promise<void> {
    if (!this.context) {
      logger.warn('Diagnostics', `No active diagnostic context for stage ${stage}`);
      return;
    }

    const stageIndex = DiagnosticStageOrder.indexOf(stage);
    if (stageIndex === -1) {
      logger.warn('Diagnostics', `Unknown stage: ${stage}`);
      return;
    }

    const now = new Date();
    const stageResult = this.context.stages[stageIndex];
    stageResult.status = status;
    stageResult.message = message;
    stageResult.finishedAt = now.toISOString();
    stageResult.details = details ? redactSecrets(details) : undefined;

    // Add failure classification for failed stages
    if (status === 'fail' && classification) {
      stageResult.failureBucket = classification.bucket;
      stageResult.suggestedFix = classification.suggestedFix;
      logger.info('Diagnostics', `Failure classified: ${classification.bucket}`);
    }

    if (stageIndex > 0) {
      const prevStage = this.context.stages[stageIndex - 1];
      if (prevStage.finishedAt) {
        stageResult.durationMs = now.getTime() - new Date(prevStage.finishedAt).getTime();
      }
    } else {
      stageResult.durationMs = now.getTime() - this.context.startedAt.getTime();
    }
    stageResult.startedAt = stageResult.finishedAt; // Approximate

    await storage.updateConnectorDiagnostic(this.context.runId, {
      stagesJson: this.context.stages,
    });

    logger.debug('Diagnostics', `Stage ${stage}: ${status} - ${message}`);
  }

  async setConfigSnapshot(configKeys: string[], resolvedBaseUrl?: string): Promise<void> {
    if (!this.context) return;
    
    this.context.configSnapshot = {
      keysPresent: configKeys,
      resolvedBaseUrl: resolvedBaseUrl ? new URL(resolvedBaseUrl).host : null,
      authMode: this.context.config.authMode,
      requiredMetrics: this.context.config.requiredOutputFields.slice(0, 5),
    };

    await storage.updateConnectorDiagnostic(this.context.runId, {
      configSnapshot: this.context.configSnapshot,
    });
  }

  async finish(overallStatus: 'pass' | 'partial' | 'fail'): Promise<DiagnosticStageResult[]> {
    if (!this.context) {
      return [];
    }

    const now = new Date();
    const durationMs = now.getTime() - this.context.startedAt.getTime();

    await storage.updateConnectorDiagnostic(this.context.runId, {
      overallStatus,
      stagesJson: this.context.stages,
      finishedAt: now,
      durationMs,
    });

    const stages = [...this.context.stages];
    logger.info('Diagnostics', `Finished diagnostic run ${this.context.runId}: ${overallStatus}`);
    
    this.context = null;
    return stages;
  }

  getRunId(): string | null {
    return this.context?.runId || null;
  }

  getRequestId(): string | null {
    return this.context?.requestId || null;
  }

  getWorkerHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.context?.requestId) {
      headers['X-Request-Id'] = this.context.requestId;
    }
    if (apiKey) {
      headers['x-api-key'] = apiKey;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return headers;
  }

  getStages(): DiagnosticStageResult[] {
    return this.context?.stages || [];
  }

  computeOverallStatus(): 'pass' | 'partial' | 'fail' {
    if (!this.context) return 'fail';
    
    const stages = this.context.stages;
    const hasFailed = stages.some(s => s.status === 'fail');
    const allPassed = stages.every(s => s.status === 'pass' || s.status === 'skipped');
    
    if (hasFailed) return 'fail';
    if (allPassed) return 'pass';
    return 'partial';
  }
}

export async function runDiagnosticsForService(
  config: ServiceDiagnosticConfig,
  executor: (runner: DiagnosticsRunner) => Promise<void>
): Promise<{ runId: string; stages: DiagnosticStageResult[]; status: 'pass' | 'partial' | 'fail' }> {
  const runner = new DiagnosticsRunner();
  const runId = await runner.start(config);

  try {
    await executor(runner);
  } catch (error: any) {
    const currentStage = runner.getStages().find(s => s.status === 'pending');
    if (currentStage) {
      await runner.failStage(currentStage.stage, `Unexpected error: ${error.message}`, {
        errorType: error.name,
        errorMessage: error.message,
      });
    }
  }

  const status = runner.computeOverallStatus();
  const stages = await runner.finish(status);

  return { runId, stages, status };
}

export function formatDiagnosticsForCopy(diagnostic: {
  runId: string;
  serviceId: string;
  serviceName: string;
  stages: DiagnosticStageResult[];
  configSnapshot?: Record<string, unknown>;
}): string {
  const redactedDiagnostic = {
    runId: diagnostic.runId,
    serviceId: diagnostic.serviceId,
    serviceName: diagnostic.serviceName,
    stages: diagnostic.stages.map(s => ({
      stage: s.stage,
      status: s.status,
      message: s.message,
      durationMs: s.durationMs,
      details: s.details ? redactSecrets(s.details as Record<string, unknown>) : undefined,
    })),
    configSnapshot: diagnostic.configSnapshot ? redactSecrets(diagnostic.configSnapshot) : undefined,
  };

  return JSON.stringify(redactedDiagnostic, null, 2);
}
