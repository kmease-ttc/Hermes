/**
 * Step 9.4: Digest Email Service
 *
 * Generates and sends weekly/monthly digest emails summarizing:
 * - Actions completed
 * - Traffic/visibility changes
 * - Top improvements
 * - What needs attention
 */

import { db } from '../db';
import {
  digestSchedule,
  digestHistory,
  websites,
  users,
  approvalQueue,
  runErrors,
  firstRunResults,
  type DigestSchedule,
  type InsertDigestHistory,
} from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { sendMonthlySummaryEmail } from './email';
import { getKbaseClient } from '@arclo/kbase-client';

// ═══════════════════════════════════════════════════════════════════════════
// DIGEST GENERATION
// ═══════════════════════════════════════════════════════════════════════════

export interface DigestData {
  actionsCompleted: number;
  newPages?: number;
  blogPosts?: number;
  technicalFixes?: number;
  trafficChange?: string;
  trafficChangeType?: 'positive' | 'negative' | 'neutral';
  visibilityChange?: string;
  visibilityChangeType?: 'positive' | 'negative' | 'neutral';
  topActions?: { type: string; description: string }[];
}

/**
 * Generate digest data for a website over a time period
 */
export async function generateDigestData(
  websiteId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<DigestData> {
  const kbase = getKbaseClient();

  // Query KBase for events in this period
  const events = await (kbase as any).queryEvents({
    website_id: websiteId,
    start_time: periodStart.toISOString(),
    end_time: periodEnd.toISOString(),
  });

  // Count actions by type
  let actionsCompleted = 0;
  let newPages = 0;
  let blogPosts = 0;
  let technicalFixes = 0;

  const topActions: { type: string; description: string }[] = [];

  for (const event of events) {
    if (event.type === 'action_executed') {
      actionsCompleted++;

      const payload = event.payload as any;
      if (payload.category === 'content') {
        if (payload.action_type === 'publish_blog') {
          blogPosts++;
          topActions.push({
            type: 'Content',
            description: payload.title || 'New blog post published',
          });
        } else if (payload.action_type === 'create_page') {
          newPages++;
          topActions.push({
            type: 'Content',
            description: payload.title || 'New page created',
          });
        }
      } else if (payload.category === 'technical') {
        technicalFixes++;
        topActions.push({
          type: 'Technical',
          description: payload.description || 'Technical improvement',
        });
      }
    }
  }

  // Get traffic/visibility trends from latest GA4/GSC data
  const { trafficChange, trafficChangeType, visibilityChange, visibilityChangeType } =
    await getTrendData(websiteId, periodStart, periodEnd);

  return {
    actionsCompleted,
    newPages: newPages > 0 ? newPages : undefined,
    blogPosts: blogPosts > 0 ? blogPosts : undefined,
    technicalFixes: technicalFixes > 0 ? technicalFixes : undefined,
    trafficChange,
    trafficChangeType,
    visibilityChange,
    visibilityChangeType,
    topActions: topActions.slice(0, 5), // Top 5 recent actions
  };
}

/**
 * Get traffic and visibility trend data
 */
async function getTrendData(
  websiteId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  trafficChange?: string;
  trafficChangeType?: 'positive' | 'negative' | 'neutral';
  visibilityChange?: string;
  visibilityChangeType?: 'positive' | 'negative' | 'neutral';
}> {
  const kbase = getKbaseClient();

  // Query for latest metrics
  const events = await (kbase as any).queryEvents({
    website_id: websiteId,
    type: 'metrics',
    start_time: periodStart.toISOString(),
    end_time: periodEnd.toISOString(),
    limit: 2, // Get latest two to compare
  });

  if (events.length < 2) {
    return {}; // Not enough data
  }

  const latest = events[0].payload as any;
  const previous = events[1].payload as any;

  // Calculate traffic change (GA4 sessions)
  let trafficChange: string | undefined;
  let trafficChangeType: 'positive' | 'negative' | 'neutral' | undefined;

  if (latest['ga4.sessions'] && previous['ga4.sessions']) {
    const current = latest['ga4.sessions'];
    const prev = previous['ga4.sessions'];
    const changePercent = ((current - prev) / prev) * 100;

    if (Math.abs(changePercent) < 5) {
      trafficChangeType = 'neutral';
      trafficChange = 'Stable';
    } else if (changePercent > 0) {
      trafficChangeType = 'positive';
      trafficChange = `+${changePercent.toFixed(1)}%`;
    } else {
      trafficChangeType = 'negative';
      trafficChange = `${changePercent.toFixed(1)}%`;
    }
  }

  // Calculate visibility change (GSC impressions)
  let visibilityChange: string | undefined;
  let visibilityChangeType: 'positive' | 'negative' | 'neutral' | undefined;

  if (latest['gsc.impressions'] && previous['gsc.impressions']) {
    const current = latest['gsc.impressions'];
    const prev = previous['gsc.impressions'];
    const changePercent = ((current - prev) / prev) * 100;

    if (Math.abs(changePercent) < 5) {
      visibilityChangeType = 'neutral';
      visibilityChange = 'Stable';
    } else if (changePercent > 0) {
      visibilityChangeType = 'positive';
      visibilityChange = `+${changePercent.toFixed(1)}%`;
    } else {
      visibilityChangeType = 'negative';
      visibilityChange = `${changePercent.toFixed(1)}%`;
    }
  }

  return {
    trafficChange,
    trafficChangeType,
    visibilityChange,
    visibilityChangeType,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DIGEST SENDING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send digest email for a specific schedule
 */
export async function sendDigestForSchedule(scheduleId: number): Promise<boolean> {
  const [schedule] = await db
    .select()
    .from(digestSchedule)
    .where(eq(digestSchedule.id, scheduleId))
    .limit(1);

  if (!schedule || !schedule.enabled) {
    return false;
  }

  // Get website and user
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, schedule.websiteId))
    .limit(1);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, schedule.userId))
    .limit(1);

  if (!website || !user) {
    return false;
  }

  // Calculate period
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);

  if (schedule.frequency === 'weekly') {
    periodStart.setDate(periodStart.getDate() - 7);
  } else {
    periodStart.setMonth(periodStart.getMonth() - 1);
  }

  // Generate digest data
  const digestData = await generateDigestData(schedule.websiteId, periodStart, periodEnd);

  // Check if we should send (based on filters)
  if (schedule.includeOnlyIfChanges && digestData.actionsCompleted === 0) {
    logger.info("DigestEmail", "Skipping digest - no changes", {
      scheduleId,
      websiteId: schedule.websiteId,
    });
    return false;
  }

  if (digestData.actionsCompleted < schedule.minActionsToSend) {
    logger.info("DigestEmail", "Skipping digest - below minimum actions", {
      scheduleId,
      websiteId: schedule.websiteId,
      actionsCompleted: digestData.actionsCompleted,
      minRequired: schedule.minActionsToSend,
    });
    return false;
  }

  // Send email
  const sent = await sendMonthlySummaryEmail(user.email, {
    displayName: user.displayName || undefined,
    siteName: website.name || '',
    siteUrl: website.domain || '',
    period: schedule.frequency === 'weekly' ? 'This Week' : 'This Month',
    ...digestData,
  });

  if (sent) {
    // Record in history
    await db.insert(digestHistory).values({
      digestScheduleId: schedule.id,
      websiteId: schedule.websiteId,
      userId: schedule.userId,
      periodStart,
      periodEnd,
      summaryData: digestData,
      sentAt: new Date(),
      emailSentTo: user.email,
    } as InsertDigestHistory);

    // Update schedule
    await db
      .update(digestSchedule)
      .set({
        lastSentAt: new Date(),
        deliveryCount: schedule.deliveryCount + 1,
        nextScheduledAt: calculateNextScheduledDate(schedule),
      })
      .where(eq(digestSchedule.id, schedule.id));

    logger.info("DigestEmail", "Digest sent successfully", {
      scheduleId,
      websiteId: schedule.websiteId,
      userId: schedule.userId,
      actionsCompleted: digestData.actionsCompleted,
    });

    return true;
  }

  return false;
}

/**
 * Calculate next scheduled date based on frequency and day preference
 */
function calculateNextScheduledDate(schedule: DigestSchedule): Date {
  const next = new Date();

  if (schedule.frequency === 'weekly') {
    // Find next occurrence of dayOfWeek
    const targetDay = schedule.dayOfWeek || 1; // Default to Monday
    const currentDay = next.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;

    next.setDate(next.getDate() + daysUntilTarget);
  } else {
    // Monthly - set to dayOfMonth next month
    next.setMonth(next.getMonth() + 1);
    next.setDate(schedule.dayOfMonth || 1);
  }

  // Set to midnight
  next.setHours(0, 0, 0, 0);

  return next;
}

// ═══════════════════════════════════════════════════════════════════════════
// DIGEST SCHEDULER (Background Job)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find and send all digests that are due
 *
 * This should be called by a cron job every hour
 */
export async function processScheduledDigests(): Promise<number> {
  const now = new Date();

  // Find all schedules that are due
  const dueSchedules = await db
    .select()
    .from(digestSchedule)
    .where(
      and(
        eq(digestSchedule.enabled, true),
        lte(digestSchedule.nextScheduledAt, now)
      )
    );

  let sentCount = 0;

  for (const schedule of dueSchedules) {
    try {
      const sent = await sendDigestForSchedule(schedule.id);
      if (sent) {
        sentCount++;
      }
    } catch (error: any) {
      logger.error("DigestEmail", "Failed to send scheduled digest", {
        scheduleId: schedule.id,
        error: error.message,
      });
    }
  }

  logger.info("DigestEmail", "Processed scheduled digests", {
    dueCount: dueSchedules.length,
    sentCount,
  });

  return sentCount;
}

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL DIGEST TRIGGER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manually trigger a digest for a website (for testing or on-demand)
 */
export async function sendManualDigest(
  websiteId: string,
  userId: number,
  daysBack: number = 7
): Promise<boolean> {
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!website || !user) {
    return false;
  }

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - daysBack);

  const digestData = await generateDigestData(websiteId, periodStart, periodEnd);

  return await sendMonthlySummaryEmail(user.email, {
    displayName: user.displayName || undefined,
    siteName: website.name || '',
    siteUrl: website.domain || '',
    period: `Last ${daysBack} Days`,
    ...digestData,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const DigestService = {
  generateDigestData,
  sendDigestForSchedule,
  processScheduledDigests,
  sendManualDigest,
};
