import { db } from "../db";
import { serpKeywords, serpRankings, keywordActions } from "@shared/schema";
import { eq, desc, and, isNull, sql, inArray } from "drizzle-orm";

export interface GeneratedMission {
  id: number;
  actionType: string;
  title: string;
  description: string | null;
  targetKeywords: string[];
  targetUrl: string | null;
  impactScore: number;
  effortScore: number;
  reason: string | null;
  status: string;
}

export interface MissionGenerationResult {
  generated: number;
  topMissions: GeneratedMission[];
  totalPending: number;
}

const ACTION_TYPES = {
  CREATE_PAGE: "create_page",
  IMPROVE_PAGE: "improve_page", 
  ADD_LINKS: "add_links",
  ADD_CONTENT: "add_content",
  IMPROVE_INTENT: "improve_intent",
  LOCAL_SIGNALS: "local_signals",
  OPTIMIZE_SPEED: "optimize_speed",
  ADD_SCHEMA: "add_schema",
} as const;

function calculateActionPriority(impactScore: number, effortScore: number): number {
  return Math.round(impactScore * 0.7 + (100 - effortScore) * 0.3);
}

function getImpactFromPriority(priority: number | null): number {
  if (!priority) return 50;
  return Math.min(100, priority * 20);
}

function getImpactFromPosition(position: number | null): number {
  if (!position) return 30;
  if (position <= 3) return 40;
  if (position <= 10) return 80;
  if (position <= 20) return 70;
  if (position <= 50) return 50;
  return 30;
}

export async function generateMissionsForKeywords(): Promise<MissionGenerationResult> {
  const keywords = await db
    .select()
    .from(serpKeywords)
    .where(eq(serpKeywords.active, true));

  const latestRankings = await db
    .select({
      keywordId: serpRankings.keywordId,
      position: serpRankings.position,
      url: serpRankings.url,
      change: serpRankings.change,
    })
    .from(serpRankings)
    .where(
      sql`(${serpRankings.keywordId}, ${serpRankings.createdAt}) IN (
        SELECT keyword_id, MAX(created_at) 
        FROM serp_rankings 
        GROUP BY keyword_id
      )`
    );

  const rankingMap = new Map(latestRankings.map(r => [r.keywordId, r]));

  const actionsToCreate: Array<{
    keywordId: number | null;
    actionType: string;
    title: string;
    description: string;
    targetKeywords: string[];
    targetUrl: string | null;
    impactScore: number;
    effortScore: number;
    reason: string;
    priority: number;
    status: string;
  }> = [];

  for (const kw of keywords) {
    const ranking = rankingMap.get(kw.id);
    const position = ranking?.position ?? null;
    const url = ranking?.url ?? kw.targetUrl;
    const change = ranking?.change ?? 0;
    const priorityImpact = getImpactFromPriority(kw.priority);
    const positionImpact = getImpactFromPosition(position);
    const combinedImpact = Math.round((priorityImpact + positionImpact) / 2);

    if (!position || position > 100) {
      const impactScore = Math.min(100, combinedImpact + 20);
      const effortScore = url ? 40 : 70;
      actionsToCreate.push({
        keywordId: kw.id,
        actionType: ACTION_TYPES.CREATE_PAGE,
        title: `Create landing page for '${kw.keyword}'`,
        description: `No ranking detected. Create or optimize a dedicated page targeting this keyword.`,
        targetKeywords: [kw.keyword],
        targetUrl: kw.targetUrl,
        impactScore,
        effortScore,
        reason: "Keyword not ranking in top 100",
        priority: calculateActionPriority(impactScore, effortScore),
        status: "pending",
      });
    } else if (position > 10 && position <= 20) {
      const impactScore = combinedImpact;
      const effortScore = 35;
      actionsToCreate.push({
        keywordId: kw.id,
        actionType: ACTION_TYPES.IMPROVE_PAGE,
        title: `Improve page for '${kw.keyword}' (currently #${position})`,
        description: `Close to page 1. Optimize title, H1, and content relevance.`,
        targetKeywords: [kw.keyword],
        targetUrl: url,
        impactScore,
        effortScore,
        reason: `High-potential keyword at position #${position}`,
        priority: calculateActionPriority(impactScore, effortScore),
        status: "pending",
      });
    } else if (position > 3 && position <= 10) {
      const impactScore = combinedImpact + 10;
      const effortScore = 25;
      actionsToCreate.push({
        keywordId: kw.id,
        actionType: ACTION_TYPES.ADD_LINKS,
        title: `Add internal links for '${kw.keyword}' (#${position})`,
        description: `Already on page 1. Strengthen with internal links to push into top 3.`,
        targetKeywords: [kw.keyword],
        targetUrl: url,
        impactScore: Math.min(100, impactScore),
        effortScore,
        reason: `Page 1 keyword stuck at #${position}`,
        priority: calculateActionPriority(impactScore, effortScore),
        status: "pending",
      });
    }

    if (position && position > 20 && position <= 50 && kw.priority && kw.priority >= 80) {
      const impactScore = combinedImpact;
      const effortScore = 50;
      actionsToCreate.push({
        keywordId: kw.id,
        actionType: ACTION_TYPES.ADD_CONTENT,
        title: `Create supporting content for '${kw.keyword}'`,
        description: `Add blog posts or FAQ content to build topical authority.`,
        targetKeywords: [kw.keyword],
        targetUrl: null,
        impactScore,
        effortScore,
        reason: `High-priority keyword needs content support`,
        priority: calculateActionPriority(impactScore, effortScore),
        status: "pending",
      });
    }

    if (kw.intent === "location" && position && position > 5) {
      const impactScore = Math.round(combinedImpact * 0.8);
      const effortScore = 30;
      actionsToCreate.push({
        keywordId: kw.id,
        actionType: ACTION_TYPES.LOCAL_SIGNALS,
        title: `Strengthen local signals for '${kw.keyword}'`,
        description: `Add location modifiers, LocalBusiness schema, and geo-targeting.`,
        targetKeywords: [kw.keyword],
        targetUrl: url,
        impactScore,
        effortScore,
        reason: `Local keyword needs stronger geo signals`,
        priority: calculateActionPriority(impactScore, effortScore),
        status: "pending",
      });
    }

    if (change && change < -3 && position && position <= 20) {
      const impactScore = Math.min(100, combinedImpact + 15);
      const effortScore = 35;
      actionsToCreate.push({
        keywordId: kw.id,
        actionType: ACTION_TYPES.IMPROVE_INTENT,
        title: `Recover dropped ranking for '${kw.keyword}'`,
        description: `Position dropped by ${Math.abs(change)}. Check content freshness and intent match.`,
        targetKeywords: [kw.keyword],
        targetUrl: url,
        impactScore,
        effortScore,
        reason: `Ranking dropped ${Math.abs(change)} positions`,
        priority: calculateActionPriority(impactScore, effortScore),
        status: "pending",
      });
    }
  }

  await db.delete(keywordActions).where(eq(keywordActions.status, "pending"));

  if (actionsToCreate.length > 0) {
    await db.insert(keywordActions).values(actionsToCreate);
  }

  const topMissions = await db
    .select()
    .from(keywordActions)
    .where(eq(keywordActions.status, "pending"))
    .orderBy(desc(keywordActions.priority))
    .limit(5);

  const pendingCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(keywordActions)
    .where(eq(keywordActions.status, "pending"));

  return {
    generated: actionsToCreate.length,
    topMissions: topMissions.map(m => ({
      id: m.id,
      actionType: m.actionType,
      title: m.title,
      description: m.description,
      targetKeywords: m.targetKeywords || [],
      targetUrl: m.targetUrl,
      impactScore: m.impactScore,
      effortScore: m.effortScore,
      reason: m.reason,
      status: m.status,
    })),
    totalPending: pendingCount[0]?.count || 0,
  };
}

export async function getTopMissions(limit: number = 5): Promise<GeneratedMission[]> {
  const missions = await db
    .select()
    .from(keywordActions)
    .where(eq(keywordActions.status, "pending"))
    .orderBy(desc(keywordActions.priority))
    .limit(limit);

  return missions.map(m => ({
    id: m.id,
    actionType: m.actionType,
    title: m.title,
    description: m.description,
    targetKeywords: m.targetKeywords || [],
    targetUrl: m.targetUrl,
    impactScore: m.impactScore,
    effortScore: m.effortScore,
    reason: m.reason,
    status: m.status,
  }));
}

export async function getPendingActionsCount(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(keywordActions)
    .where(eq(keywordActions.status, "pending"));
  return result[0]?.count || 0;
}

export async function queueAllPendingActions(): Promise<number> {
  const result = await db
    .update(keywordActions)
    .set({ status: "queued", updatedAt: new Date() })
    .where(eq(keywordActions.status, "pending"));
  return result.rowCount || 0;
}

export async function executeNextQueuedAction(): Promise<{
  action: GeneratedMission | null;
  remaining: number;
}> {
  const nextAction = await db
    .select()
    .from(keywordActions)
    .where(eq(keywordActions.status, "queued"))
    .orderBy(desc(keywordActions.priority))
    .limit(1);

  if (!nextAction.length) {
    return { action: null, remaining: 0 };
  }

  const action = nextAction[0];
  
  await db
    .update(keywordActions)
    .set({ status: "in_progress", executedAt: new Date(), updatedAt: new Date() })
    .where(eq(keywordActions.id, action.id));

  await new Promise(resolve => setTimeout(resolve, 500));

  await db
    .update(keywordActions)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(keywordActions.id, action.id));

  const remaining = await db
    .select({ count: sql<number>`count(*)` })
    .from(keywordActions)
    .where(eq(keywordActions.status, "queued"));

  return {
    action: {
      id: action.id,
      actionType: action.actionType,
      title: action.title,
      description: action.description,
      targetKeywords: action.targetKeywords || [],
      targetUrl: action.targetUrl,
      impactScore: action.impactScore,
      effortScore: action.effortScore,
      reason: action.reason,
      status: "completed",
    },
    remaining: remaining[0]?.count || 0,
  };
}

export async function getFixEverythingStatus(): Promise<{
  queued: number;
  inProgress: number;
  completed: number;
  failed: number;
  total: number;
}> {
  const stats = await db
    .select({
      status: keywordActions.status,
      count: sql<number>`count(*)`,
    })
    .from(keywordActions)
    .groupBy(keywordActions.status);

  const statusCounts = {
    queued: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    pending: 0,
  };

  for (const row of stats) {
    if (row.status in statusCounts) {
      statusCounts[row.status as keyof typeof statusCounts] = row.count;
    }
  }

  return {
    queued: statusCounts.queued,
    inProgress: statusCounts.in_progress,
    completed: statusCounts.completed,
    failed: statusCounts.failed,
    total: statusCounts.queued + statusCounts.in_progress + statusCounts.completed + statusCounts.failed,
  };
}
