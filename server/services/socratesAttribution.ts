import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import type { OutcomeEventLog, AgentActionLog, InsertAttributionRecord, InsertSocratesKbEntry } from '@shared/schema';

// Time windows for different metric types (in hours)
const OBSERVATION_WINDOWS = {
  fast: 6,      // CWV, build errors, UI regressions
  standard: 24, // crawl health, general metrics
  slow: 336     // indexing, DA (14 days)
};

// Map metricKey to observation window type
const METRIC_WINDOW_MAP: Record<string, keyof typeof OBSERVATION_WINDOWS> = {
  'LCP': 'fast',
  'CLS': 'fast', 
  'INP': 'fast',
  'crawl_health': 'standard',
  'clicks': 'standard',
  'sessions': 'standard',
  'indexing_coverage': 'slow',
  'domain_authority': 'slow',
  'pages_losing_traffic': 'standard',
};

// Surface patterns - map action targets to affected metrics
const SURFACE_PATTERNS: Record<string, string[]> = {
  'crawl': ['crawl_health', 'indexing_coverage'],
  'deploy': ['LCP', 'CLS', 'INP', 'crawl_health'],
  'content_update': ['clicks', 'sessions', 'pages_losing_traffic'],
  'config_change': ['crawl_health', 'indexing_coverage'],
  'integration_setup': ['crawl_health', 'indexing_coverage'],
  'run': ['crawl_health', 'LCP', 'CLS', 'INP'],
};

export interface AttributionResult {
  eventId: string;
  candidateActions: AgentActionLog[];
  timeProximityScore: number;
  changeSurfaceScore: number;
  confidence: number;
  explanation: string;
}

// Calculate time proximity score (1.0 = very close, 0 = far)
function calculateTimeProximity(eventTime: Date, actionTime: Date, windowHours: number): number {
  const diffHours = Math.abs(eventTime.getTime() - actionTime.getTime()) / (1000 * 60 * 60);
  if (diffHours > windowHours) return 0;
  return 1 - (diffHours / windowHours);
}

// Calculate surface match score (1.0 = direct match, 0.5 = related, 0 = unrelated)
function calculateSurfaceMatch(action: AgentActionLog, metricKey: string): number {
  const relatedMetrics = SURFACE_PATTERNS[action.actionType] || [];
  if (relatedMetrics.includes(metricKey)) return 1.0;
  // Check if targets overlap with metric context
  return 0.3; // Weak match as fallback
}

// Attribute a single outcome event
export async function attributeOutcomeEvent(event: OutcomeEventLog): Promise<AttributionResult | null> {
  const windowType = METRIC_WINDOW_MAP[event.metricKey] || 'standard';
  const windowHours = OBSERVATION_WINDOWS[windowType];
  
  const eventTime = new Date(event.timestamp);
  const startTime = new Date(eventTime.getTime() - windowHours * 60 * 60 * 1000);
  
  // Get candidate actions in the time window
  const candidateActions = await storage.getAgentActionLogsByTimeWindow(event.siteId, startTime, eventTime);
  
  if (candidateActions.length === 0) {
    return null; // No actions to attribute
  }
  
  // Score each action
  let bestTimeScore = 0;
  let bestSurfaceScore = 0;
  
  for (const action of candidateActions) {
    const timeScore = calculateTimeProximity(eventTime, new Date(action.timestampStart), windowHours);
    const surfaceScore = calculateSurfaceMatch(action, event.metricKey);
    
    if (timeScore > bestTimeScore) bestTimeScore = timeScore;
    if (surfaceScore > bestSurfaceScore) bestSurfaceScore = surfaceScore;
  }
  
  // Combined confidence (weighted average)
  const confidence = (bestTimeScore * 0.4) + (bestSurfaceScore * 0.6);
  
  // Build explanation
  const actionTypes = [...new Set(candidateActions.map(a => a.actionType))].join(', ');
  const explanation = `${candidateActions.length} action(s) found within ${windowHours}h window. ` +
    `Action types: ${actionTypes}. Time proximity: ${(bestTimeScore * 100).toFixed(0)}%, Surface match: ${(bestSurfaceScore * 100).toFixed(0)}%`;
  
  return {
    eventId: event.eventId,
    candidateActions,
    timeProximityScore: bestTimeScore,
    changeSurfaceScore: bestSurfaceScore,
    confidence,
    explanation,
  };
}

// Create attribution record and potentially a KB entry
export async function processAttribution(event: OutcomeEventLog): Promise<{ attributionId: string; kbId?: string } | null> {
  const result = await attributeOutcomeEvent(event);
  
  if (!result || result.confidence < 0.3) {
    return null; // Too low confidence
  }
  
  // Create attribution record
  const attributionId = uuidv4();
  await storage.createAttributionRecord({
    attributionId,
    siteId: event.siteId,
    env: event.env,
    eventId: event.eventId,
    candidateActionIds: result.candidateActions.map(a => a.actionId),
    timeProximityScore: result.timeProximityScore,
    changeSurfaceScore: result.changeSurfaceScore,
    historicalLikelihoodScore: 0, // Not implemented in MVP
    confounders: [],
    confidence: result.confidence,
    explanation: result.explanation,
  });
  
  // Create KB entry if confidence >= 0.6
  let kbId: string | undefined;
  if (result.confidence >= 0.6) {
    kbId = uuidv4();
    const status = result.confidence >= 0.8 ? 'active' : 'draft';
    
    // Build learning from attribution
    await storage.createSocratesKbEntry({
      kbId,
      title: `${event.eventType} detected in ${event.metricKey}`,
      problemStatement: `${event.metricKey} changed from ${event.oldValue} to ${event.newValue} (delta: ${event.delta})`,
      contextScope: {
        metricKeys: [event.metricKey],
        siteId: event.siteId,
        env: event.env,
      },
      triggerPattern: `${event.eventType} on ${event.metricKey}`,
      rootCauseHypothesis: result.explanation,
      evidence: {
        eventIds: [event.eventId],
        actionIds: result.candidateActions.map(a => a.actionId),
      },
      recommendedAction: event.eventType === 'regression' ? 'Review recent changes and consider rollback' : null,
      avoidAction: null,
      guardrail: null,
      confidence: result.confidence,
      status,
      tags: [event.metricKey, event.eventType, ...result.candidateActions.map(a => a.actionType)],
    });
  }
  
  return { attributionId, kbId };
}

// Process all unattributed events for a site
export async function processUnattributedEvents(siteId: string): Promise<{ processed: number; attributions: number; learnings: number }> {
  const events = await storage.getUnattributedOutcomeEvents(siteId);
  
  let attributions = 0;
  let learnings = 0;
  
  for (const event of events) {
    const result = await processAttribution(event);
    if (result) {
      attributions++;
      if (result.kbId) learnings++;
    }
  }
  
  return { processed: events.length, attributions, learnings };
}
