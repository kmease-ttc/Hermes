import { changeLogService, type ValidationResult } from './changeLog';
import { kbValidatorService } from './kbValidator';
import { cadenceCheckerService } from './cadenceChecker';
import { deployWindowService } from './deployWindowService';
import { type Change } from '@shared/schema';

export interface ExecutionResult {
  success: boolean;
  changeId: string;
  error?: string;
  metricsBefore?: Record<string, unknown>;
  metricsAfter?: Record<string, unknown>;
}

export interface MetricsSnapshot {
  gsc?: {
    clicks?: number;
    impressions?: number;
    position?: number;
    available: boolean;
  };
  cwv?: {
    lcp?: string;
    fid?: string;
    cls?: string;
    available: boolean;
  };
  capturedAt: string;
}

export class ExecutorService {
  /**
   * Execute a single change
   * Requires change to be in 'queued' status
   */
  async executeChange(changeId: string, websiteId: string): Promise<ExecutionResult> {
    const change = await changeLogService.getChange(changeId);
    
    if (!change) {
      return {
        success: false,
        changeId,
        error: 'Change not found',
      };
    }

    if (change.websiteId !== websiteId) {
      return {
        success: false,
        changeId,
        error: 'Website ID mismatch',
      };
    }

    if (change.status !== 'queued') {
      return {
        success: false,
        changeId,
        error: `Cannot execute change with status: ${change.status}. Only queued changes can be executed.`,
      };
    }

    try {
      // Capture pre-execution metrics
      const metricsBefore = await this.captureMetricsSnapshot(websiteId);
      await changeLogService.setMetricsBefore(changeId, metricsBefore as any);

      // Execute the actual change (placeholder - actual implementation depends on change type)
      await this.performChange(change);

      // Capture post-execution metrics
      const metricsAfter = await this.captureMetricsSnapshot(websiteId);
      await changeLogService.markApplied(changeId, metricsAfter as any);

      return {
        success: true,
        changeId,
        metricsBefore: metricsBefore as Record<string, unknown>,
        metricsAfter: metricsAfter as Record<string, unknown>,
      };
    } catch (error) {
      return {
        success: false,
        changeId,
        error: error instanceof Error ? error.message : 'Execution failed',
      };
    }
  }

  /**
   * Capture metrics snapshot for a website
   * Returns placeholder if data not available
   */
  async captureMetricsSnapshot(websiteId: string): Promise<MetricsSnapshot> {
    // Note: Actual implementation would fetch from GSC, GA4, etc.
    // For now, return a placeholder structure
    return {
      gsc: {
        available: false,
      },
      cwv: {
        available: false,
      },
      capturedAt: new Date().toISOString(),
    };
  }

  /**
   * Perform the actual change
   * This is a placeholder that would integrate with external systems
   */
  private async performChange(change: Change): Promise<void> {
    // This method would be implemented per change type:
    // - content: Update CMS
    // - technical: Deploy robots.txt changes, redirects, etc.
    // - performance: Update caching rules, image optimization settings
    // - config: Update analytics tags, tracking configs
    
    // For now, we just simulate execution
    console.log(`Executing change: ${change.changeId} (${change.changeType})`);
  }

  /**
   * Full pipeline: propose, validate, queue, and optionally execute
   * Used for automated agent runs
   */
  async processPipeline(input: {
    websiteId: string;
    agentId: string;
    changeType: 'content' | 'technical' | 'performance' | 'config';
    scope: 'single_page' | 'template' | 'sitewide';
    description: string;
    reason?: string;
    trigger: 'scheduled_run' | 'manual' | 'alert';
    affectedUrls?: string[];
    confidenceScore?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    autoExecute?: boolean;
  }): Promise<{
    changeId: string;
    status: string;
    validationResult?: {
      knowledgePass: boolean;
      cadencePass: boolean;
    };
    deployWindowId?: string;
    error?: string;
  }> {
    // Step 1: Log the proposed change
    const changeId = await changeLogService.logProposedChange({
      websiteId: input.websiteId,
      agentId: input.agentId,
      changeType: input.changeType,
      scope: input.scope,
      description: input.description,
      reason: input.reason,
      trigger: input.trigger,
      affectedUrls: input.affectedUrls,
      confidenceScore: input.confidenceScore,
      riskLevel: input.riskLevel,
    });

    // Step 2: Validate against KB
    const kbResult = await kbValidatorService.validateChange(
      {
        changeType: input.changeType,
        scope: input.scope,
        affectedUrls: input.affectedUrls ?? null,
        description: input.description,
      },
      { websiteId: input.websiteId }
    );

    // Step 3: Check cadence
    const cadenceResult = await cadenceCheckerService.checkCadence(
      input.websiteId,
      {
        changeType: input.changeType,
        scope: input.scope,
        affectedUrls: input.affectedUrls ?? null,
      }
    );

    const knowledgePass = kbResult.pass;
    const cadencePass = cadenceResult.pass;
    
    // Step 4: Mark validated
    await changeLogService.markValidated(changeId, {
      knowledgePass,
      policyPass: kbResult.outcome !== 'block',
      conflictsDetected: kbResult.ruleHits.length > 1,
      cadencePass,
      cadenceBlockReason: cadenceResult.reason,
      skipReason: !knowledgePass 
        ? `KB: ${kbResult.reasons.join('; ')}`
        : !cadencePass 
          ? cadenceResult.reason 
          : undefined,
    });

    // If validation failed, return early
    if (!knowledgePass || !cadencePass) {
      return {
        changeId,
        status: 'skipped',
        validationResult: { knowledgePass, cadencePass },
        error: !knowledgePass 
          ? `KB validation failed: ${kbResult.reasons.join('; ')}`
          : cadenceResult.reason,
      };
    }

    // Step 5: Assign to deploy window
    const deployWindowId = await deployWindowService.assignToDeployWindow(
      input.websiteId,
      changeId
    );

    return {
      changeId,
      status: 'queued',
      validationResult: { knowledgePass, cadencePass },
      deployWindowId,
    };
  }
}

export const executorService = new ExecutorService();
