import { db } from '../db';
import { changes, websiteCadenceSettings, deployWindows, type Change, type WebsiteCadenceSettings } from '@shared/schema';
import { eq, and, gte, or } from 'drizzle-orm';

export interface CadenceCheckResult {
  pass: boolean;
  reason?: string;
  nextEligibleAt?: Date;
  inStabilizationMode?: boolean;
  deploysThisWeek?: number;
  maxDeploysPerWeek?: number;
}

const DEFAULT_COOLDOWNS = {
  content_refresh_days: 7,
  title_meta_days: 14,
  template_layout_days: 21,
  technical_indexing_days: 14,
  performance_days: 7,
};

export class CadenceCheckerService {
  /**
   * Check if a change respects cadence rules
   */
  async checkCadence(
    websiteId: string,
    proposedChange: Pick<Change, 'changeType' | 'scope' | 'affectedUrls'>
  ): Promise<CadenceCheckResult> {
    const settings = await this.getOrCreateSettings(websiteId);
    
    if (settings.stabilizationModeUntil && new Date(settings.stabilizationModeUntil) > new Date()) {
      return {
        pass: false,
        reason: `Stabilization mode active until ${settings.stabilizationModeUntil.toISOString().split('T')[0]}`,
        inStabilizationMode: true,
      };
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const executedWindows = await db.select()
      .from(deployWindows)
      .where(and(
        eq(deployWindows.websiteId, websiteId),
        eq(deployWindows.status, 'executed'),
        gte(deployWindows.executedAt, weekAgo)
      ));
    
    if (executedWindows.length >= settings.maxDeploysPerWeek) {
      return {
        pass: false,
        reason: `Weekly deploy limit reached (${executedWindows.length}/${settings.maxDeploysPerWeek})`,
        deploysThisWeek: executedWindows.length,
        maxDeploysPerWeek: settings.maxDeploysPerWeek,
      };
    }

    const cooldowns = (settings.cooldowns as typeof DEFAULT_COOLDOWNS) || DEFAULT_COOLDOWNS;
    const cooldownDays = this.getCooldownDays(proposedChange.changeType, proposedChange.scope, cooldowns);
    
    if (cooldownDays > 0) {
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);
      
      const recentChanges = await db.select()
        .from(changes)
        .where(and(
          eq(changes.websiteId, websiteId),
          eq(changes.changeType, proposedChange.changeType),
          or(
            eq(changes.status, 'applied'),
            eq(changes.status, 'queued')
          ),
          gte(changes.createdAt, cooldownDate)
        ));

      if (recentChanges.length > 0) {
        const lastChange = recentChanges[0];
        const nextEligibleAt = new Date(lastChange.createdAt);
        nextEligibleAt.setDate(nextEligibleAt.getDate() + cooldownDays);
        
        return {
          pass: false,
          reason: `Cooldown active for ${proposedChange.changeType} changes (${cooldownDays} days)`,
          nextEligibleAt,
          deploysThisWeek: executedWindows.length,
          maxDeploysPerWeek: settings.maxDeploysPerWeek,
        };
      }
    }

    return {
      pass: true,
      deploysThisWeek: executedWindows.length,
      maxDeploysPerWeek: settings.maxDeploysPerWeek,
    };
  }

  /**
   * Get cooldown days based on change type and scope
   */
  private getCooldownDays(
    changeType: string,
    scope: string,
    cooldowns: typeof DEFAULT_COOLDOWNS
  ): number {
    if (scope === 'template' || scope === 'sitewide') {
      return cooldowns.template_layout_days;
    }

    switch (changeType) {
      case 'content':
        return cooldowns.content_refresh_days;
      case 'technical':
        return cooldowns.technical_indexing_days;
      case 'performance':
        return cooldowns.performance_days;
      default:
        return cooldowns.content_refresh_days;
    }
  }

  /**
   * Get or create cadence settings for a website
   */
  async getOrCreateSettings(websiteId: string): Promise<WebsiteCadenceSettings> {
    const [existing] = await db.select()
      .from(websiteCadenceSettings)
      .where(eq(websiteCadenceSettings.websiteId, websiteId))
      .limit(1);

    if (existing) return existing;

    const [created] = await db.insert(websiteCadenceSettings)
      .values({
        websiteId,
        maxDeploysPerWeek: 2,
        cooldowns: DEFAULT_COOLDOWNS,
      })
      .returning();

    return created;
  }

  /**
   * Enable stabilization mode for a website
   */
  async enableStabilizationMode(websiteId: string, durationDays: number, reason: string): Promise<void> {
    const until = new Date();
    until.setDate(until.getDate() + durationDays);

    await db.update(websiteCadenceSettings)
      .set({
        stabilizationModeUntil: until,
        stabilizationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(websiteCadenceSettings.websiteId, websiteId));
  }

  /**
   * Disable stabilization mode
   */
  async disableStabilizationMode(websiteId: string): Promise<void> {
    await db.update(websiteCadenceSettings)
      .set({
        stabilizationModeUntil: null,
        stabilizationReason: null,
        updatedAt: new Date(),
      })
      .where(eq(websiteCadenceSettings.websiteId, websiteId));
  }

  /**
   * Update cadence settings
   */
  async updateSettings(websiteId: string, updates: Partial<{
    maxDeploysPerWeek: number;
    cooldowns: typeof DEFAULT_COOLDOWNS;
  }>): Promise<WebsiteCadenceSettings> {
    const [updated] = await db.update(websiteCadenceSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(websiteCadenceSettings.websiteId, websiteId))
      .returning();
    
    return updated;
  }
}

export const cadenceCheckerService = new CadenceCheckerService();
