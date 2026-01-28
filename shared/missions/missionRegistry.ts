/**
 * CANONICAL MISSION REGISTRY - Single Source of Truth for Crew Missions
 * 
 * This file defines all available missions for each crew member.
 * Missions are executable tasks that crews can perform.
 */

import type { CrewId } from '../registry';

export interface MissionDefinition {
  missionId: string;
  crewId: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'S' | 'M' | 'L';
  cooldownHours: number;
  autoFixable: boolean;
  handlerKey: string;
}

export const MISSION_REGISTRY: Record<string, MissionDefinition> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // POPULAR (Analytics & Signals)
  // ═══════════════════════════════════════════════════════════════════════════
  fetch_analytics: {
    missionId: 'fetch_analytics',
    crewId: 'popular',
    title: 'Fetch Analytics',
    description: 'Pull latest GA4 and GSC metrics for all tracked properties',
    impact: 'high',
    effort: 'S',
    cooldownHours: 24,
    autoFixable: true,
    handlerKey: 'popular.fetchAnalytics',
  },
  analyze_traffic: {
    missionId: 'analyze_traffic',
    crewId: 'popular',
    title: 'Analyze Traffic Trends',
    description: 'Identify traffic patterns, anomalies, and growth opportunities',
    impact: 'medium',
    effort: 'M',
    cooldownHours: 24,
    autoFixable: false,
    handlerKey: 'popular.analyzeTraffic',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPEEDSTER (Performance Monitoring)
  // ═══════════════════════════════════════════════════════════════════════════
  run_vitals_scan: {
    missionId: 'run_vitals_scan',
    crewId: 'speedster',
    title: 'Run Vitals Scan',
    description: 'Measure Core Web Vitals (LCP, CLS, INP) across key pages',
    impact: 'high',
    effort: 'M',
    cooldownHours: 24,
    autoFixable: true,
    handlerKey: 'speedster.runVitalsScan',
  },
  analyze_performance: {
    missionId: 'analyze_performance',
    crewId: 'speedster',
    title: 'Analyze Performance',
    description: 'Deep-dive into performance bottlenecks and optimization opportunities',
    impact: 'medium',
    effort: 'L',
    cooldownHours: 48,
    autoFixable: false,
    handlerKey: 'speedster.analyzePerformance',
  },
  detect_performance_regressions: {
    missionId: 'detect_performance_regressions',
    crewId: 'speedster',
    title: 'Detect Performance Regressions',
    description: 'Pull regression data from CWV monitoring and surface material performance changes',
    impact: 'high',
    effort: 'S',
    cooldownHours: 12,
    autoFixable: false,
    handlerKey: 'speedster.detectRegressions',
  },
  compare_mobile_desktop: {
    missionId: 'compare_mobile_desktop',
    crewId: 'speedster',
    title: 'Compare Mobile vs Desktop',
    description: 'Run CWV scans for both mobile and desktop strategies and surface performance differences',
    impact: 'medium',
    effort: 'M',
    cooldownHours: 24,
    autoFixable: false,
    handlerKey: 'speedster.compareMobileDesktop',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOOKOUT (SERP Tracking)
  // ═══════════════════════════════════════════════════════════════════════════
  track_rankings: {
    missionId: 'track_rankings',
    crewId: 'lookout',
    title: 'Track Rankings',
    description: 'Update keyword rankings and position changes',
    impact: 'high',
    effort: 'M',
    cooldownHours: 24,
    autoFixable: true,
    handlerKey: 'lookout.trackRankings',
  },
  analyze_serp_features: {
    missionId: 'analyze_serp_features',
    crewId: 'lookout',
    title: 'Analyze SERP Features',
    description: 'Identify featured snippets, PAA, and other SERP opportunities',
    impact: 'medium',
    effort: 'M',
    cooldownHours: 48,
    autoFixable: false,
    handlerKey: 'lookout.analyzeSerpFeatures',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCOTTY (Technical SEO)
  // ═══════════════════════════════════════════════════════════════════════════
  run_crawl: {
    missionId: 'run_crawl',
    crewId: 'scotty',
    title: 'Run Site Crawl',
    description: 'Perform a technical crawl to identify SEO issues',
    impact: 'high',
    effort: 'L',
    cooldownHours: 48,
    autoFixable: true,
    handlerKey: 'scotty.runCrawl',
  },
  check_indexing: {
    missionId: 'check_indexing',
    crewId: 'scotty',
    title: 'Check Indexing Status',
    description: 'Verify which pages are indexed and identify indexing issues',
    impact: 'high',
    effort: 'S',
    cooldownHours: 24,
    autoFixable: false,
    handlerKey: 'scotty.checkIndexing',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BEACON (Domain Authority)
  // ═══════════════════════════════════════════════════════════════════════════
  monitor_backlinks: {
    missionId: 'monitor_backlinks',
    crewId: 'beacon',
    title: 'Monitor Backlinks',
    description: 'Track new and lost backlinks, analyze link velocity',
    impact: 'high',
    effort: 'M',
    cooldownHours: 24,
    autoFixable: true,
    handlerKey: 'beacon.monitorBacklinks',
  },
  check_authority: {
    missionId: 'check_authority',
    crewId: 'beacon',
    title: 'Check Domain Authority',
    description: 'Evaluate domain authority metrics and trends',
    impact: 'medium',
    effort: 'S',
    cooldownHours: 72,
    autoFixable: false,
    handlerKey: 'beacon.checkAuthority',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTINEL (Content Decay Monitor)
  // ═══════════════════════════════════════════════════════════════════════════
  detect_decay: {
    missionId: 'detect_decay',
    crewId: 'sentinel',
    title: 'Detect Content Decay',
    description: 'Identify pages losing traffic or rankings over time',
    impact: 'high',
    effort: 'M',
    cooldownHours: 24,
    autoFixable: true,
    handlerKey: 'sentinel.detectDecay',
  },
  prioritize_refresh: {
    missionId: 'prioritize_refresh',
    crewId: 'sentinel',
    title: 'Prioritize Content Refresh',
    description: 'Rank decaying content by refresh priority and impact potential',
    impact: 'medium',
    effort: 'S',
    cooldownHours: 48,
    autoFixable: false,
    handlerKey: 'sentinel.prioritizeRefresh',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NATASHA (Competitive Intelligence)
  // ═══════════════════════════════════════════════════════════════════════════
  competitor_scan: {
    missionId: 'competitor_scan',
    crewId: 'natasha',
    title: 'Competitor Scan',
    description: 'Analyze competitor rankings, content, and backlink strategies',
    impact: 'high',
    effort: 'L',
    cooldownHours: 72,
    autoFixable: true,
    handlerKey: 'natasha.competitorScan',
  },
  find_gaps: {
    missionId: 'find_gaps',
    crewId: 'natasha',
    title: 'Find Content Gaps',
    description: 'Identify keywords and topics competitors rank for that you don\'t',
    impact: 'high',
    effort: 'M',
    cooldownHours: 48,
    autoFixable: false,
    handlerKey: 'natasha.findGaps',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAPER (Paid Ads)
  // ═══════════════════════════════════════════════════════════════════════════
  campaign_review: {
    missionId: 'campaign_review',
    crewId: 'draper',
    title: 'Campaign Review',
    description: 'Analyze ad campaign performance and ROAS metrics',
    impact: 'high',
    effort: 'M',
    cooldownHours: 24,
    autoFixable: true,
    handlerKey: 'draper.campaignReview',
  },
  spend_analysis: {
    missionId: 'spend_analysis',
    crewId: 'draper',
    title: 'Spend Analysis',
    description: 'Evaluate ad spend efficiency and budget allocation',
    impact: 'medium',
    effort: 'S',
    cooldownHours: 24,
    autoFixable: false,
    handlerKey: 'draper.spendAnalysis',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEMINGWAY (Content Strategy)
  // ═══════════════════════════════════════════════════════════════════════════
  content_audit: {
    missionId: 'content_audit',
    crewId: 'hemingway',
    title: 'Content Audit',
    description: 'Review content inventory for quality, relevance, and SEO alignment',
    impact: 'high',
    effort: 'L',
    cooldownHours: 72,
    autoFixable: true,
    handlerKey: 'hemingway.contentAudit',
  },
  generate_recommendations: {
    missionId: 'generate_recommendations',
    crewId: 'hemingway',
    title: 'Generate Content Recommendations',
    description: 'Create data-driven content improvement and creation suggestions',
    impact: 'medium',
    effort: 'M',
    cooldownHours: 48,
    autoFixable: false,
    handlerKey: 'hemingway.generateRecommendations',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCRATES (Knowledge Base)
  // ═══════════════════════════════════════════════════════════════════════════
  collect_learnings: {
    missionId: 'collect_learnings',
    crewId: 'socrates',
    title: 'Collect Learnings',
    description: 'Gather and store insights from all crew activities',
    impact: 'high',
    effort: 'S',
    cooldownHours: 24,
    autoFixable: true,
    handlerKey: 'socrates.collectLearnings',
  },
  synthesize_insights: {
    missionId: 'synthesize_insights',
    crewId: 'socrates',
    title: 'Synthesize Insights',
    description: 'Combine learnings into actionable patterns and best practices',
    impact: 'medium',
    effort: 'M',
    cooldownHours: 48,
    autoFixable: false,
    handlerKey: 'socrates.synthesizeInsights',
  },
  export_knowledge: {
    missionId: 'export_knowledge',
    crewId: 'socrates',
    title: 'Export Knowledge',
    description: 'Generate knowledge reports and documentation exports',
    impact: 'low',
    effort: 'S',
    cooldownHours: 24,
    autoFixable: true,
    handlerKey: 'socrates.exportKnowledge',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ATLAS (AI Optimization)
  // ═══════════════════════════════════════════════════════════════════════════
  ai_readiness_scan: {
    missionId: 'ai_readiness_scan',
    crewId: 'atlas',
    title: 'AI Readiness Scan',
    description: 'Evaluate content readiness for AI assistants and LLMs',
    impact: 'high',
    effort: 'M',
    cooldownHours: 48,
    autoFixable: true,
    handlerKey: 'atlas.aiReadinessScan',
  },
  optimize_llm_visibility: {
    missionId: 'optimize_llm_visibility',
    crewId: 'atlas',
    title: 'Optimize LLM Visibility',
    description: 'Improve content structure for AI citation and visibility',
    impact: 'medium',
    effort: 'L',
    cooldownHours: 72,
    autoFixable: false,
    handlerKey: 'atlas.optimizeLlmVisibility',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MAJOR TOM (Mission Control / Orchestrator)
  // ═══════════════════════════════════════════════════════════════════════════
  run_diagnostics: {
    missionId: 'run_diagnostics',
    crewId: 'major_tom',
    title: 'Run Diagnostics',
    description: 'Execute full diagnostic scan across all crews and services',
    impact: 'high',
    effort: 'L',
    cooldownHours: 24,
    autoFixable: true,
    handlerKey: 'majorTom.runDiagnostics',
  },
  fix_all_issues: {
    missionId: 'fix_all_issues',
    crewId: 'major_tom',
    title: 'Fix All Issues',
    description: 'Auto-fix all auto-fixable issues across the system',
    impact: 'high',
    effort: 'L',
    cooldownHours: 24,
    autoFixable: true,
    handlerKey: 'majorTom.fixAllIssues',
  },
};

export type MissionId = keyof typeof MISSION_REGISTRY;

/**
 * Get all missions assigned to a specific crew
 */
export function getMissionsForCrew(crewId: string): MissionDefinition[] {
  return Object.values(MISSION_REGISTRY).filter(
    (mission) => mission.crewId === crewId
  );
}

/**
 * Get a specific mission by ID
 */
export function getMission(missionId: string): MissionDefinition | undefined {
  return MISSION_REGISTRY[missionId];
}

/**
 * Get all missions in the registry
 */
export function getAllMissions(): MissionDefinition[] {
  return Object.values(MISSION_REGISTRY);
}

/**
 * Get missions grouped by crew
 */
export function getMissionsGroupedByCrew(): Record<string, MissionDefinition[]> {
  const grouped: Record<string, MissionDefinition[]> = {};
  for (const mission of Object.values(MISSION_REGISTRY)) {
    if (!grouped[mission.crewId]) {
      grouped[mission.crewId] = [];
    }
    grouped[mission.crewId].push(mission);
  }
  return grouped;
}

/**
 * Get all auto-fixable missions
 */
export function getAutoFixableMissions(): MissionDefinition[] {
  return Object.values(MISSION_REGISTRY).filter((mission) => mission.autoFixable);
}

/**
 * Get missions by impact level
 */
export function getMissionsByImpact(
  impact: 'high' | 'medium' | 'low'
): MissionDefinition[] {
  return Object.values(MISSION_REGISTRY).filter(
    (mission) => mission.impact === impact
  );
}
