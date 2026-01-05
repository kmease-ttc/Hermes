import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { changes, type InsertChange, type Change } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface ProposeChangeInput {
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
}

export interface ValidationResult {
  knowledgePass: boolean;
  policyPass: boolean;
  conflictsDetected: boolean;
  cadencePass: boolean;
  cadenceBlockReason?: string;
  skipReason?: string;
}

export class ChangeLogService {
  /**
   * Log a proposed change - MUST be called before any agent applies a change
   */
  async logProposedChange(input: ProposeChangeInput): Promise<string> {
    const changeId = uuidv4();
    
    await db.insert(changes).values({
      changeId,
      websiteId: input.websiteId,
      agentId: input.agentId,
      changeType: input.changeType,
      scope: input.scope,
      description: input.description,
      reason: input.reason || null,
      trigger: input.trigger,
      affectedUrls: input.affectedUrls || [],
      confidenceScore: input.confidenceScore || null,
      riskLevel: input.riskLevel || 'medium',
      status: 'proposed',
    });
    
    return changeId;
  }

  /**
   * Mark a change as validated with validation results
   */
  async markValidated(changeId: string, result: ValidationResult): Promise<void> {
    const shouldSkip = !result.knowledgePass || !result.cadencePass;
    
    await db.update(changes)
      .set({
        knowledgePass: result.knowledgePass,
        policyPass: result.policyPass,
        conflictsDetected: result.conflictsDetected,
        cadencePass: result.cadencePass,
        cadenceBlockReason: result.cadenceBlockReason || null,
        status: shouldSkip ? 'skipped' : 'proposed',
        skipReason: result.skipReason || null,
      })
      .where(eq(changes.changeId, changeId));
  }

  /**
   * Mark a change as queued and assign to deploy window
   */
  async markQueued(changeId: string, deployWindowId: string): Promise<void> {
    await db.update(changes)
      .set({
        status: 'queued',
        deployWindowId,
        queuedAt: new Date(),
      })
      .where(eq(changes.changeId, changeId));
  }

  /**
   * Mark a change as applied with post-execution metrics
   */
  async markApplied(changeId: string, metricsAfter?: Record<string, unknown>): Promise<void> {
    await db.update(changes)
      .set({
        status: 'applied',
        appliedAt: new Date(),
        metricsAfter: metricsAfter || null,
      })
      .where(eq(changes.changeId, changeId));
  }

  /**
   * Mark a change as skipped with reason
   */
  async markSkipped(changeId: string, reason: string): Promise<void> {
    await db.update(changes)
      .set({
        status: 'skipped',
        skipReason: reason,
      })
      .where(eq(changes.changeId, changeId));
  }

  /**
   * Mark a change as rolled back
   */
  async markRolledBack(changeId: string, reason: string): Promise<void> {
    await db.update(changes)
      .set({
        status: 'rolled_back',
        rolledBackAt: new Date(),
        skipReason: reason,
      })
      .where(eq(changes.changeId, changeId));
  }

  /**
   * Get a change by ID
   */
  async getChange(changeId: string): Promise<Change | undefined> {
    const [change] = await db.select()
      .from(changes)
      .where(eq(changes.changeId, changeId))
      .limit(1);
    return change;
  }

  /**
   * Set metrics before execution
   */
  async setMetricsBefore(changeId: string, metricsBefore: Record<string, unknown>): Promise<void> {
    await db.update(changes)
      .set({ metricsBefore })
      .where(eq(changes.changeId, changeId));
  }
}

export const changeLogService = new ChangeLogService();
