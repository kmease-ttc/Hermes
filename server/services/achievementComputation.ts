import { db } from "../db";
import {
  ga4Daily,
  gscPageDaily,
  contentDrafts,
  findings,
  seoSuggestions,
  agentActionLogs,
  ACHIEVEMENT_CATEGORIES,
  type AchievementMilestone,
} from "@shared/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { logger } from "../utils/logger";
import { storage } from "../storage";

const CATEGORY_IDS = Object.keys(ACHIEVEMENT_CATEGORIES) as Array<keyof typeof ACHIEVEMENT_CATEGORIES>;

/**
 * Compute achievements for a single site. Idempotent -- safe to re-run.
 * Uses absolute counts compared against currentValue to compute deltas.
 */
export async function computeAchievementsForSite(siteId: string): Promise<{
  tracksUpdated: number;
  milestonesAchieved: AchievementMilestone[];
}> {
  // Ensure all category tracks are initialized
  await storage.initializeAllCategoryAchievements(siteId);

  const milestonesAchieved: AchievementMilestone[] = [];
  let tracksUpdated = 0;

  // Evaluate each category
  const evaluators: Record<string, (siteId: string) => Promise<Record<string, number>>> = {
    website_traffic: evaluateWebsiteTraffic,
    leads: evaluateLeads,
    content_creation: evaluateContentCreation,
    content_updates: evaluateContentUpdates,
    technical_improvements: evaluateTechnicalImprovements,
  };

  for (const categoryId of CATEGORY_IDS) {
    try {
      const counts = await evaluators[categoryId](siteId);

      for (const [trackKey, absoluteCount] of Object.entries(counts)) {
        const track = await storage.getAchievementTrackByKey(siteId, categoryId, trackKey);
        if (!track) continue;

        const delta = Math.max(0, absoluteCount - track.currentValue);
        if (delta <= 0) continue;

        const result = await storage.incrementAchievementProgress(siteId, categoryId, trackKey, delta);
        if (!result) continue;

        tracksUpdated++;

        // Create milestone for tier transitions or every 5th level
        const isSignificantLevel = result.track.currentLevel % 5 === 0;
        if (result.tierChanged || isSignificantLevel) {
          const categoryMeta = ACHIEVEMENT_CATEGORIES[categoryId];
          const headline = result.tierChanged
            ? `${result.track.name} reached ${result.track.currentTier.charAt(0).toUpperCase() + result.track.currentTier.slice(1)} tier`
            : `${result.track.name} hit Level ${result.track.currentLevel}`;

          const milestone = await storage.createAchievementMilestone({
            siteId,
            trackId: result.track.id,
            categoryId,
            trackKey,
            level: result.track.currentLevel,
            tier: result.track.currentTier,
            previousTier: result.tierChanged ? result.previousTier : null,
            headline,
            notifiedAt: null,
            achievedAt: new Date(),
          });

          milestonesAchieved.push(milestone);
        }
      }
    } catch (err: any) {
      logger.error("AchievementComputation", `Failed to evaluate ${categoryId}`, {
        siteId,
        error: err.message,
      });
    }
  }

  return { tracksUpdated, milestonesAchieved };
}

// ─── Category Evaluators ──────────────────────────────────────────────

async function evaluateWebsiteTraffic(siteId: string): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  const dailyData = await db
    .select()
    .from(ga4Daily)
    .where(eq(ga4Daily.siteId, siteId))
    .orderBy(ga4Daily.date);

  if (dailyData.length < 2) return results;

  // sessions_increased: days where sessions > overall average
  const avgSessions = dailyData.reduce((s, d) => s + d.sessions, 0) / dailyData.length;
  results.sessions_increased = dailyData.filter((d) => d.sessions > avgSessions).length;

  // users_grew: days where users > prior day
  let usersGrew = 0;
  for (let i = 1; i < dailyData.length; i++) {
    if (dailyData[i].users > dailyData[i - 1].users) usersGrew++;
  }
  results.users_grew = usersGrew;

  // bounce_rate_improved: days where bounce < average (lower is better)
  const withBounce = dailyData.filter((d) => d.bounceRate != null);
  if (withBounce.length > 0) {
    const avgBounce = withBounce.reduce((s, d) => s + (d.bounceRate ?? 0), 0) / withBounce.length;
    results.bounce_rate_improved = withBounce.filter((d) => (d.bounceRate ?? 100) < avgBounce).length;
  }

  // engagement_streak: days with above-average session duration
  const withDuration = dailyData.filter((d) => d.avgSessionDuration != null);
  if (withDuration.length > 0) {
    const avgDuration =
      withDuration.reduce((s, d) => s + (d.avgSessionDuration ?? 0), 0) / withDuration.length;
    results.engagement_streak = withDuration.filter(
      (d) => (d.avgSessionDuration ?? 0) > avgDuration
    ).length;
  }

  return results;
}

async function evaluateLeads(siteId: string): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  const dailyData = await db
    .select()
    .from(ga4Daily)
    .where(eq(ga4Daily.siteId, siteId))
    .orderBy(ga4Daily.date);

  if (dailyData.length === 0) return results;

  // conversions_tracked: total conversions across all days
  results.conversions_tracked = dailyData.reduce((s, d) => s + d.conversions, 0);

  // goal_completions: days with at least one conversion
  results.goal_completions = dailyData.filter((d) => d.conversions > 0).length;

  // conversion_streaks: total days in streaks of consecutive conversion days
  let streakDays = 0;
  let currentStreak = 0;
  for (const day of dailyData) {
    if (day.conversions > 0) {
      currentStreak++;
      streakDays++;
    } else {
      currentStreak = 0;
    }
  }
  results.conversion_streaks = streakDays;

  return results;
}

async function evaluateContentCreation(siteId: string): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  // blog_posts_published
  const [blogCount] = await db
    .select({ value: count() })
    .from(contentDrafts)
    .where(
      and(
        eq(contentDrafts.websiteId, siteId),
        eq(contentDrafts.state, "published"),
        eq(contentDrafts.contentType, "blog_post")
      )
    );
  results.blog_posts_published = blogCount?.value ?? 0;

  // new_pages_created (non-blog published content)
  const [pageCount] = await db
    .select({ value: count() })
    .from(contentDrafts)
    .where(
      and(
        eq(contentDrafts.websiteId, siteId),
        eq(contentDrafts.state, "published"),
        sql`${contentDrafts.contentType} != 'blog_post'`
      )
    );
  results.new_pages_created = pageCount?.value ?? 0;

  // content_quality_scores: drafts with qaScore >= 80
  const [qualityCount] = await db
    .select({ value: count() })
    .from(contentDrafts)
    .where(
      and(
        eq(contentDrafts.websiteId, siteId),
        sql`${contentDrafts.qaScore} >= 80`
      )
    );
  results.content_quality_scores = qualityCount?.value ?? 0;

  return results;
}

async function evaluateContentUpdates(siteId: string): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  // pages_refreshed: agent action logs with actionType 'content_update'
  const [refreshCount] = await db
    .select({ value: count() })
    .from(agentActionLogs)
    .where(
      and(
        eq(agentActionLogs.siteId, siteId),
        eq(agentActionLogs.actionType, "content_update")
      )
    );
  results.pages_refreshed = refreshCount?.value ?? 0;

  // content_decay_reversed: content findings with status=fixed
  const [decayCount] = await db
    .select({ value: count() })
    .from(findings)
    .where(
      and(
        eq(findings.siteId, siteId),
        eq(findings.category, "content"),
        eq(findings.status, "fixed")
      )
    );
  results.content_decay_reversed = decayCount?.value ?? 0;

  // metadata_improved: seo suggestions with metadata-related types completed
  const [metadataCount] = await db
    .select({ value: count() })
    .from(seoSuggestions)
    .where(
      and(
        eq(seoSuggestions.siteId, siteId),
        eq(seoSuggestions.status, "completed"),
        sql`${seoSuggestions.suggestionType} IN ('metadata_fix', 'title_tag', 'meta_description', 'content_refresh')`
      )
    );
  results.metadata_improved = metadataCount?.value ?? 0;

  // click_growth_pages: pages where recent 7-day clicks > previous 7-day clicks
  // Compare last 7 days vs the 7 days before that
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const clickGrowthResult = await db.execute(sql`
      WITH recent AS (
        SELECT page, SUM(clicks) as clicks
        FROM gsc_page_daily
        WHERE site_id = ${siteId} AND date >= ${sevenDaysAgo}
        GROUP BY page
      ),
      previous AS (
        SELECT page, SUM(clicks) as clicks
        FROM gsc_page_daily
        WHERE site_id = ${siteId} AND date >= ${fourteenDaysAgo} AND date < ${sevenDaysAgo}
        GROUP BY page
      )
      SELECT COUNT(*) as value FROM recent r
      JOIN previous p ON r.page = p.page
      WHERE r.clicks > p.clicks AND p.clicks > 0
    `);
    results.click_growth_pages = Number(clickGrowthResult.rows?.[0]?.value ?? 0);
  } catch {
    results.click_growth_pages = 0;
  }

  return results;
}

async function evaluateTechnicalImprovements(siteId: string): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  // cwv_improved: count findings in 'performance' category that are fixed
  const [cwvCount] = await db
    .select({ value: count() })
    .from(findings)
    .where(
      and(
        eq(findings.siteId, siteId),
        eq(findings.category, "performance"),
        eq(findings.status, "fixed")
      )
    );
  results.cwv_improved = cwvCount?.value ?? 0;

  // crawl_errors_fixed
  const [crawlCount] = await db
    .select({ value: count() })
    .from(findings)
    .where(
      and(
        eq(findings.siteId, siteId),
        eq(findings.category, "crawlability"),
        eq(findings.status, "fixed")
      )
    );
  results.crawl_errors_fixed = crawlCount?.value ?? 0;

  // security_headers_added
  const [securityCount] = await db
    .select({ value: count() })
    .from(findings)
    .where(
      and(
        eq(findings.siteId, siteId),
        eq(findings.category, "security_headers"),
        eq(findings.status, "fixed")
      )
    );
  results.security_headers_added = securityCount?.value ?? 0;

  // indexation_wins
  const [indexCount] = await db
    .select({ value: count() })
    .from(findings)
    .where(
      and(
        eq(findings.siteId, siteId),
        eq(findings.category, "indexation"),
        eq(findings.status, "fixed")
      )
    );
  results.indexation_wins = indexCount?.value ?? 0;

  return results;
}
