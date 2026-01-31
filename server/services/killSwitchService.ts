/**
 * Kill Switch Service - Step 10.6: Governance & Kill Switches
 *
 * Provides emergency controls and safety switches:
 * - Global kill switch (stops all processing)
 * - Per-service kill switches
 * - Per-website kill switches
 * - System operation modes (normal, observe_only, safe_mode)
 * - Audit logging for all changes
 */

import { db } from '../db';
import { systemConfig, systemAuditLog, SystemModes } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

export interface KillSwitchState {
  enabled: boolean;
  reason?: string;
  activatedAt?: string;
}

export interface SystemModeState {
  mode: typeof SystemModes[keyof typeof SystemModes];
  reason?: string;
  changedAt?: string;
}

export interface ActivateKillSwitchOptions {
  reason: string;
  triggeredBy: string; // user email or 'system'
}

export interface DeactivateKillSwitchOptions {
  reason?: string;
  triggeredBy: string;
}

/**
 * Get system configuration value
 */
async function getConfigValue<T = any>(configKey: string): Promise<T | null> {
  const [config] = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, configKey))
    .limit(1);

  return config ? (config.value as T) : null;
}

/**
 * Set system configuration value with audit logging
 */
async function setConfigValue(
  configKey: string,
  newValue: any,
  actionType: string,
  targetType: string,
  targetId: string | null,
  reason: string | undefined,
  triggeredBy: string
): Promise<void> {
  // Get old value for audit
  const oldConfig = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, configKey))
    .limit(1);

  const oldValue = oldConfig[0]?.value ?? null;

  // Update config
  await db
    .update(systemConfig)
    .set({
      value: newValue,
      updatedAt: new Date(),
    })
    .where(eq(systemConfig.key, configKey));

  // Log audit trail
  await db.insert(systemAuditLog).values({
    action: actionType,
    actor: triggeredBy,
    details: {
      targetType,
      targetId,
      oldValue,
      newValue,
      reason: reason ?? null,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL KILL SWITCH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if global kill switch is activated
 */
export async function isGlobalKillSwitchActive(): Promise<boolean> {
  const state = await getConfigValue<KillSwitchState>('global_kill_switch');
  return state?.enabled ?? false;
}

/**
 * Activate global kill switch - STOPS ALL PROCESSING
 */
export async function activateGlobalKillSwitch(options: ActivateKillSwitchOptions): Promise<void> {
  const { reason, triggeredBy } = options;

  const newState: KillSwitchState = {
    enabled: true,
    reason,
    activatedAt: new Date().toISOString(),
  };

  await setConfigValue(
    'global_kill_switch',
    newState,
    'kill_switch_activated',
    'global',
    null,
    reason,
    triggeredBy
  );

  logger.warn('KillSwitchService', `🔴 GLOBAL KILL SWITCH ACTIVATED by ${triggeredBy}: ${reason}`);
}

/**
 * Deactivate global kill switch - RESUMES PROCESSING
 */
export async function deactivateGlobalKillSwitch(options: DeactivateKillSwitchOptions): Promise<void> {
  const { reason, triggeredBy } = options;

  const newState: KillSwitchState = {
    enabled: false,
    reason: reason ?? 'Manually deactivated',
    activatedAt: new Date().toISOString(),
  };

  await setConfigValue(
    'global_kill_switch',
    newState,
    'kill_switch_deactivated',
    'global',
    null,
    reason,
    triggeredBy
  );

  logger.info('KillSwitchService', `🟢 Global kill switch deactivated by ${triggeredBy}`);
}

/**
 * Get global kill switch state
 */
export async function getGlobalKillSwitchState(): Promise<KillSwitchState> {
  const state = await getConfigValue<KillSwitchState>('global_kill_switch');
  return state ?? { enabled: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM MODE (normal, observe_only, safe_mode)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get current system operation mode
 */
export async function getSystemMode(): Promise<typeof SystemModes[keyof typeof SystemModes]> {
  const state = await getConfigValue<SystemModeState>('global_mode');
  return state?.mode ?? SystemModes.NORMAL;
}

/**
 * Set system operation mode
 */
export async function setSystemMode(
  mode: typeof SystemModes[keyof typeof SystemModes],
  options: { reason?: string; triggeredBy: string }
): Promise<void> {
  const { reason, triggeredBy } = options;

  const newState: SystemModeState = {
    mode,
    reason,
    changedAt: new Date().toISOString(),
  };

  await setConfigValue(
    'global_mode',
    newState,
    'mode_changed',
    'global',
    null,
    reason,
    triggeredBy
  );

  logger.info('KillSwitchService', `System mode changed to ${mode} by ${triggeredBy}`);
}

/**
 * Check if system is in observe-only mode (no changes executed)
 */
export async function isObserveOnlyMode(): Promise<boolean> {
  const mode = await getSystemMode();
  return mode === 'observe_only';
}

/**
 * Check if system is in safe mode (limited functionality)
 */
export async function isSafeMode(): Promise<boolean> {
  const mode = await getSystemMode();
  return mode === 'safe_mode';
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE-LEVEL KILL SWITCHES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a specific service is disabled
 */
export async function isServiceDisabled(serviceName: string): Promise<boolean> {
  const switches = await getConfigValue<Record<string, KillSwitchState>>('service_kill_switches');
  return switches?.[serviceName]?.enabled ?? false;
}

/**
 * Disable a specific service
 */
export async function disableService(
  serviceName: string,
  options: ActivateKillSwitchOptions
): Promise<void> {
  const { reason, triggeredBy } = options;

  const switches = await getConfigValue<Record<string, KillSwitchState>>('service_kill_switches') ?? {};

  switches[serviceName] = {
    enabled: true,
    reason,
    activatedAt: new Date().toISOString(),
  };

  await setConfigValue(
    'service_kill_switches',
    switches,
    'kill_switch_activated',
    'service',
    serviceName,
    reason,
    triggeredBy
  );

  logger.warn('KillSwitchService', `Service ${serviceName} disabled by ${triggeredBy}: ${reason}`);
}

/**
 * Enable a specific service
 */
export async function enableService(
  serviceName: string,
  options: DeactivateKillSwitchOptions
): Promise<void> {
  const { reason, triggeredBy } = options;

  const switches = await getConfigValue<Record<string, KillSwitchState>>('service_kill_switches') ?? {};

  switches[serviceName] = {
    enabled: false,
    reason: reason ?? 'Manually enabled',
    activatedAt: new Date().toISOString(),
  };

  await setConfigValue(
    'service_kill_switches',
    switches,
    'kill_switch_deactivated',
    'service',
    serviceName,
    reason,
    triggeredBy
  );

  logger.info('KillSwitchService', `Service ${serviceName} enabled by ${triggeredBy}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBSITE-LEVEL KILL SWITCHES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a specific website is paused
 */
export async function isWebsitePaused(websiteId: string): Promise<boolean> {
  const switches = await getConfigValue<Record<string, KillSwitchState>>('website_kill_switches');
  return switches?.[websiteId]?.enabled ?? false;
}

/**
 * Pause processing for a specific website
 */
export async function pauseWebsite(
  websiteId: string,
  options: ActivateKillSwitchOptions
): Promise<void> {
  const { reason, triggeredBy } = options;

  const switches = await getConfigValue<Record<string, KillSwitchState>>('website_kill_switches') ?? {};

  switches[websiteId] = {
    enabled: true,
    reason,
    activatedAt: new Date().toISOString(),
  };

  await setConfigValue(
    'website_kill_switches',
    switches,
    'kill_switch_activated',
    'website',
    websiteId,
    reason,
    triggeredBy
  );

  logger.warn('KillSwitchService', `Website ${websiteId} paused by ${triggeredBy}: ${reason}`);
}

/**
 * Resume processing for a specific website
 */
export async function resumeWebsite(
  websiteId: string,
  options: DeactivateKillSwitchOptions
): Promise<void> {
  const { reason, triggeredBy } = options;

  const switches = await getConfigValue<Record<string, KillSwitchState>>('website_kill_switches') ?? {};

  switches[websiteId] = {
    enabled: false,
    reason: reason ?? 'Manually resumed',
    activatedAt: new Date().toISOString(),
  };

  await setConfigValue(
    'website_kill_switches',
    switches,
    'kill_switch_deactivated',
    'website',
    websiteId,
    reason,
    triggeredBy
  );

  logger.info('KillSwitchService', `Website ${websiteId} resumed by ${triggeredBy}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY CHECKS (to be called before executing any work)
// ═══════════════════════════════════════════════════════════════════════════

export interface SafetyCheckResult {
  allowed: boolean;
  reason?: string;
  checks: {
    globalKillSwitch: boolean;
    serviceDisabled: boolean;
    websitePaused: boolean;
    observeOnlyMode: boolean;
    safeMode: boolean;
  };
}

/**
 * Comprehensive safety check before executing work
 *
 * Returns whether the operation is allowed to proceed
 */
export async function performSafetyCheck(params: {
  serviceName?: string;
  websiteId?: string;
  requiresChanges?: boolean; // If true, fails in observe-only mode
}): Promise<SafetyCheckResult> {
  const { serviceName, websiteId, requiresChanges = false } = params;

  const checks = {
    globalKillSwitch: await isGlobalKillSwitchActive(),
    serviceDisabled: serviceName ? await isServiceDisabled(serviceName) : false,
    websitePaused: websiteId ? await isWebsitePaused(websiteId) : false,
    observeOnlyMode: requiresChanges ? await isObserveOnlyMode() : false,
    safeMode: await isSafeMode(),
  };

  // Determine if operation is allowed
  let allowed = true;
  let reason: string | undefined;

  if (checks.globalKillSwitch) {
    allowed = false;
    reason = 'Global kill switch is active';
  } else if (checks.serviceDisabled) {
    allowed = false;
    reason = `Service ${serviceName} is disabled`;
  } else if (checks.websitePaused) {
    allowed = false;
    reason = `Website ${websiteId} is paused`;
  } else if (checks.observeOnlyMode) {
    allowed = false;
    reason = 'System is in observe-only mode (no changes allowed)';
  }

  return {
    allowed,
    reason,
    checks,
  };
}
