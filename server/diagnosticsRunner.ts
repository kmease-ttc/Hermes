import { storage } from "./storage";
import { 
  DiagnosticStages, 
  DiagnosticStageOrder, 
  type DiagnosticStage, 
  type DiagnosticStageResult,
  type InsertConnectorDiagnostic 
} from "@shared/schema";
import { logger } from "./utils/logger";

export interface ServiceDiagnosticConfig {
  serviceId: string;
  serviceName: string;
  siteId?: string;
  authMode: 'oauth' | 'api_key' | 'none';
  expectedResponseType: 'json' | 'html' | 'text';
  requiredOutputFields: string[];
}

export interface DiagnosticContext {
  runId: string;
  config: ServiceDiagnosticConfig;
  stages: DiagnosticStageResult[];
  currentStageIndex: number;
  startedAt: Date;
  configSnapshot: Record<string, unknown>;
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
    const stages: DiagnosticStageResult[] = DiagnosticStageOrder.map(stage => ({
      stage,
      status: 'pending' as const,
      message: 'Not started',
    }));

    this.context = {
      runId,
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
    await this.updateStage(stage, 'fail', message, details);
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
    details?: Record<string, unknown>
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
