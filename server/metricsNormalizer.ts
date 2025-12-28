/**
 * Metrics Normalizer - Transforms worker outputs to canonical metric keys
 * 
 * This layer ensures all metrics are stored with consistent, canonical keys
 * as defined in shared/registry.ts
 */

import { 
  LEGACY_TO_CANONICAL, 
  SERVICE_TO_CREW, 
  SERVICES,
  type MetricKey 
} from '../shared/registry';
import type { InsertSeoMetricEvent } from '@shared/schema';

interface WorkerMetrics {
  [key: string]: any;
}

/**
 * Normalizes raw worker output metrics to canonical keys
 */
export function normalizeMetrics(
  serviceId: string, 
  rawMetrics: WorkerMetrics
): Record<MetricKey, number | null> {
  const normalized: Record<string, number | null> = {};
  const service = SERVICES[serviceId];
  
  if (!service) {
    console.warn(`[Normalizer] Unknown service: ${serviceId}`);
    return normalized as Record<MetricKey, number | null>;
  }
  
  for (const [rawKey, value] of Object.entries(rawMetrics)) {
    // Skip non-metric fields
    if (typeof value !== 'number' && value !== null) continue;
    
    // Try to map legacy key to canonical key
    const canonicalKey = mapToCanonicalKey(rawKey, serviceId);
    if (canonicalKey) {
      normalized[canonicalKey] = value;
    }
  }
  
  return normalized as Record<MetricKey, number | null>;
}

/**
 * Maps a raw metric key to its canonical form
 */
function mapToCanonicalKey(rawKey: string, serviceId: string): MetricKey | null {
  // Check if already canonical
  if (rawKey.includes('.')) {
    return rawKey as MetricKey;
  }
  
  // Check legacy mapping
  if (rawKey in LEGACY_TO_CANONICAL) {
    return LEGACY_TO_CANONICAL[rawKey];
  }
  
  // Try service-specific prefix mapping
  const service = SERVICES[serviceId];
  if (service) {
    // Look for a metric in this service that matches
    for (const metricKey of service.metricsProduced) {
      const suffix = metricKey.split('.')[1];
      if (suffix === rawKey || rawKey.toLowerCase() === suffix?.toLowerCase()) {
        return metricKey;
      }
    }
  }
  
  return null;
}

/**
 * Creates a normalized metric event from worker results
 */
export function createMetricEvent(
  siteId: string,
  serviceId: string,
  rawMetrics: WorkerMetrics,
  runId?: string
): InsertSeoMetricEvent {
  const crewId = SERVICE_TO_CREW[serviceId] || 'unknown';
  const normalizedMetrics = normalizeMetrics(serviceId, rawMetrics);
  
  return {
    siteId,
    serviceId,
    crewId,
    runId: runId || undefined,
    collectedAt: new Date(),
    metricsJson: normalizedMetrics,
    rawJson: rawMetrics,
  };
}

/**
 * Normalizes Core Web Vitals worker output
 */
export function normalizeCWVMetrics(rawOutput: WorkerMetrics): Record<MetricKey, number | null> {
  const normalized: Record<string, number | null> = {};
  
  // Handle LCP (may be in seconds or milliseconds)
  if ('lcp' in rawOutput) {
    normalized['vitals.lcp'] = rawOutput.lcp;
  } else if ('lcp_ms' in rawOutput && rawOutput.lcp_ms != null) {
    // Convert milliseconds to seconds
    normalized['vitals.lcp'] = rawOutput.lcp_ms / 1000;
  }
  
  // CLS (no conversion needed)
  if ('cls' in rawOutput) {
    normalized['vitals.cls'] = rawOutput.cls;
  }
  
  // INP (milliseconds)
  if ('inp' in rawOutput) {
    normalized['vitals.inp'] = rawOutput.inp;
  }
  
  // Performance score
  if ('performance_score' in rawOutput) {
    normalized['vitals.performance_score'] = rawOutput.performance_score;
  }
  
  return normalized as Record<MetricKey, number | null>;
}

/**
 * Normalizes Google Data Connector (GA4 + GSC) metrics
 */
export function normalizeGoogleMetrics(
  ga4Metrics: WorkerMetrics,
  gscMetrics: WorkerMetrics
): Record<MetricKey, number | null> {
  const normalized: Record<string, number | null> = {};
  
  // GA4 metrics
  if (ga4Metrics) {
    if ('sessions' in ga4Metrics) normalized['ga4.sessions'] = ga4Metrics.sessions;
    if ('users' in ga4Metrics) normalized['ga4.users'] = ga4Metrics.users;
    if ('conversions' in ga4Metrics) normalized['ga4.conversions'] = ga4Metrics.conversions;
    if ('bounceRate' in ga4Metrics) normalized['ga4.bounce_rate'] = ga4Metrics.bounceRate;
    if ('avgSessionDuration' in ga4Metrics) normalized['ga4.session_duration'] = ga4Metrics.avgSessionDuration;
    if ('pagesPerSession' in ga4Metrics) normalized['ga4.pages_per_session'] = ga4Metrics.pagesPerSession;
  }
  
  // GSC metrics
  if (gscMetrics) {
    if ('clicks' in gscMetrics) normalized['gsc.clicks'] = gscMetrics.clicks;
    if ('impressions' in gscMetrics) normalized['gsc.impressions'] = gscMetrics.impressions;
    if ('ctr' in gscMetrics) normalized['gsc.ctr'] = gscMetrics.ctr;
    if ('position' in gscMetrics) normalized['gsc.position'] = gscMetrics.position;
  }
  
  return normalized as Record<MetricKey, number | null>;
}

/**
 * Flattens metrics from seoWorkerResults metricsJson into canonical format
 * This is a bridge to translate existing stored data to canonical keys
 */
export function flattenWorkerResultsToCanonical(
  workerResults: Array<{ workerKey: string; metricsJson: any }>
): Record<string, number | null> {
  const allMetrics: Record<string, number | null> = {};
  
  for (const result of workerResults) {
    if (!result.metricsJson) continue;
    
    const raw = result.metricsJson as Record<string, any>;
    
    // Normalize based on worker key
    switch (result.workerKey) {
      case 'core_web_vitals': {
        const cwv = normalizeCWVMetrics(raw);
        Object.assign(allMetrics, cwv);
        break;
      }
      case 'google_data_connector': {
        // Worker stores aggregated metrics
        if ('ga4_sessions' in raw) allMetrics['ga4.sessions'] = raw.ga4_sessions;
        if ('ga4_users' in raw) allMetrics['ga4.users'] = raw.ga4_users;
        if ('ga4_conversions' in raw) allMetrics['ga4.conversions'] = raw.ga4_conversions;
        if ('gsc_clicks' in raw) allMetrics['gsc.clicks'] = raw.gsc_clicks;
        if ('gsc_impressions' in raw) allMetrics['gsc.impressions'] = raw.gsc_impressions;
        break;
      }
      default: {
        // Generic normalization for other workers
        const normalized = normalizeMetrics(result.workerKey, raw);
        Object.assign(allMetrics, normalized);
      }
    }
  }
  
  return allMetrics;
}
