/**
 * Notification Preferences Routes
 *
 * GET/PUT endpoints for managing digest email and real-time alert preferences.
 * Uses existing digestSchedule, digestHistory, and serviceEvents tables.
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { digestSchedule, digestHistory, serviceEvents, websites, users } from '@shared/schema';
import { eq, and, gte, desc, sql, count } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { requireAuth } from '../auth/session';
import {
  processNotificationEvent,
  sendTestNotification,
  getNotificationSettings,
  getRecentEvents,
  getRecipients,
  getRules,
  isSendGridConfigured,
} from '../services/notificationService';

const router = Router();

// Default alert preferences for new users
const DEFAULT_ALERT_PREFERENCES: Record<string, boolean> = {
  critical_issues: true,
  approval_needed: true,
  ranking_changes: true,
  content_published: false,
};

// ============================================
// GET /api/sites/:siteId/notifications/preferences
// ============================================

router.get('/sites/:siteId/notifications/preferences', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = req.session.userId!;

    // Fetch digest schedule for this user + site
    const [schedule] = await db
      .select()
      .from(digestSchedule)
      .where(and(
        eq(digestSchedule.websiteId, siteId),
        eq(digestSchedule.userId, userId),
      ))
      .limit(1);

    // Fetch recent digest history
    const history = schedule
      ? await db
          .select({
            sentAt: digestHistory.sentAt,
            opened: digestHistory.opened,
            clicked: digestHistory.clicked,
            summaryData: digestHistory.summaryData,
          })
          .from(digestHistory)
          .where(eq(digestHistory.digestScheduleId, schedule.id))
          .orderBy(desc(digestHistory.sentAt))
          .limit(5)
      : [];

    // Count alerts sent this month
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [alertStats] = await db
      .select({ count: count() })
      .from(serviceEvents)
      .where(and(
        eq(serviceEvents.websiteId, siteId),
        eq(serviceEvents.notify, true),
        eq(serviceEvents.notified, true),
        gte(serviceEvents.createdAt, thirtyDaysAgo),
      ));

    // Get user email
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Get website notification cadence
    const [website] = await db
      .select({ notificationCadence: websites.notificationCadence })
      .from(websites)
      .where(eq(websites.id, siteId))
      .limit(1);

    res.json({
      digest: schedule
        ? {
            enabled: schedule.enabled,
            frequency: schedule.frequency,
            dayOfWeek: schedule.dayOfWeek,
            dayOfMonth: schedule.dayOfMonth,
            includeOnlyIfChanges: schedule.includeOnlyIfChanges,
            lastSentAt: schedule.lastSentAt?.toISOString() ?? null,
            nextScheduledAt: schedule.nextScheduledAt?.toISOString() ?? null,
            deliveryCount: schedule.deliveryCount,
          }
        : null,
      alertPreferences: schedule?.alertPreferences ?? DEFAULT_ALERT_PREFERENCES,
      digestHistory: history.map(h => ({
        sentAt: h.sentAt.toISOString(),
        opened: h.opened,
        clicked: h.clicked,
        actionsCompleted: (h.summaryData as any)?.actionsCompleted ?? 0,
      })),
      stats: {
        alertsSentThisMonth: alertStats?.count ?? 0,
      },
      deliveryEmail: user?.email ?? '',
      websiteCadence: website?.notificationCadence ?? 'weekly',
    });
  } catch (error) {
    logger.error('Notifications', 'Failed to fetch preferences', { error });
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// ============================================
// PUT /api/sites/:siteId/notifications/preferences
// ============================================

const updatePreferencesSchema = z.object({
  digest: z.object({
    enabled: z.boolean().optional(),
    frequency: z.enum(['weekly', 'monthly']).optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(28).optional(),
    includeOnlyIfChanges: z.boolean().optional(),
  }).optional(),
  alertPreferences: z.record(z.string(), z.boolean()).optional(),
});

router.put('/sites/:siteId/notifications/preferences', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const userId = req.session.userId!;
    const updates = updatePreferencesSchema.parse(req.body);

    // Find or create digest schedule
    let [schedule] = await db
      .select()
      .from(digestSchedule)
      .where(and(
        eq(digestSchedule.websiteId, siteId),
        eq(digestSchedule.userId, userId),
      ))
      .limit(1);

    if (!schedule) {
      // Create default schedule
      const [newSchedule] = await db
        .insert(digestSchedule)
        .values({
          websiteId: siteId,
          userId,
          frequency: 'weekly',
          dayOfWeek: 1, // Monday
          includeOnlyIfChanges: true,
          minActionsToSend: 1,
          enabled: true,
          alertPreferences: DEFAULT_ALERT_PREFERENCES,
        })
        .returning();
      schedule = newSchedule;
    }

    // Build update payload
    const digestUpdates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (updates.digest) {
      if (updates.digest.enabled !== undefined) digestUpdates.enabled = updates.digest.enabled;
      if (updates.digest.frequency !== undefined) digestUpdates.frequency = updates.digest.frequency;
      if (updates.digest.dayOfWeek !== undefined) digestUpdates.dayOfWeek = updates.digest.dayOfWeek;
      if (updates.digest.dayOfMonth !== undefined) digestUpdates.dayOfMonth = updates.digest.dayOfMonth;
      if (updates.digest.includeOnlyIfChanges !== undefined) digestUpdates.includeOnlyIfChanges = updates.digest.includeOnlyIfChanges;
    }

    if (updates.alertPreferences) {
      digestUpdates.alertPreferences = {
        ...(schedule.alertPreferences as Record<string, boolean> ?? DEFAULT_ALERT_PREFERENCES),
        ...updates.alertPreferences,
      };
    }

    // Recalculate next scheduled date
    if (updates.digest?.frequency || updates.digest?.dayOfWeek !== undefined || updates.digest?.dayOfMonth !== undefined) {
      const freq = updates.digest?.frequency ?? schedule.frequency;
      const now = new Date();

      if (freq === 'weekly') {
        const targetDay = updates.digest?.dayOfWeek ?? schedule.dayOfWeek ?? 1;
        const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
        const next = new Date(now);
        next.setDate(now.getDate() + daysUntil);
        next.setHours(9, 0, 0, 0);
        digestUpdates.nextScheduledAt = next;
      } else if (freq === 'monthly') {
        const targetDay = updates.digest?.dayOfMonth ?? schedule.dayOfMonth ?? 1;
        const next = new Date(now.getFullYear(), now.getMonth() + 1, targetDay, 9, 0, 0);
        digestUpdates.nextScheduledAt = next;
      }
    }

    // Update
    const [updated] = await db
      .update(digestSchedule)
      .set(digestUpdates)
      .where(eq(digestSchedule.id, schedule.id))
      .returning();

    // Sync website notification cadence
    if (updates.digest?.enabled === false) {
      await db
        .update(websites)
        .set({ notificationCadence: 'none' })
        .where(eq(websites.id, siteId));
    } else if (updates.digest?.frequency) {
      await db
        .update(websites)
        .set({ notificationCadence: updates.digest.frequency })
        .where(eq(websites.id, siteId));
    }

    logger.info('Notifications', 'Preferences updated', { siteId, userId });

    res.json({
      ok: true,
      digest: {
        enabled: updated.enabled,
        frequency: updated.frequency,
        dayOfWeek: updated.dayOfWeek,
        dayOfMonth: updated.dayOfMonth,
        includeOnlyIfChanges: updated.includeOnlyIfChanges,
        lastSentAt: updated.lastSentAt?.toISOString() ?? null,
        nextScheduledAt: updated.nextScheduledAt?.toISOString() ?? null,
        deliveryCount: updated.deliveryCount,
      },
      alertPreferences: updated.alertPreferences ?? DEFAULT_ALERT_PREFERENCES,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation failed' });
    }
    logger.error('Notifications', 'Failed to update preferences', { error });
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATION EVENT PROCESSING (consolidated from Worker-Notification)
// ════════════════════════════════════════════════════════════════════════════

const notificationEventSchema = z.object({
  website_id: z.string().min(1),
  event_type: z.string().min(1),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string().min(1),
  summary: z.string().optional(),
  payload: z.record(z.any()).optional(),
  dedup_key: z.string().optional(),
});

// POST /api/notifications/events — Process a notification event
router.post('/notifications/events', async (req, res) => {
  try {
    const body = notificationEventSchema.parse(req.body);

    const result = await processNotificationEvent({
      websiteId: body.website_id,
      eventType: body.event_type,
      severity: body.severity,
      title: body.title,
      summary: body.summary,
      payload: body.payload,
      dedupKey: body.dedup_key,
    });

    res.json({
      ok: true,
      event_id: result.eventId,
      deliveries_created: result.deliveriesCreated,
      deliveries_sent: result.deliveriesSent,
      suppressed: result.suppressed,
      quiet_hours: result.quietHours,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: error.errors[0]?.message || 'Validation failed' });
    }
    logger.error('Notifications', 'Failed to process notification event', { error });
    res.status(500).json({ ok: false, error: 'Failed to process notification event' });
  }
});

// POST /api/notifications/test — Send a test email
router.post('/notifications/test', requireAuth, async (req, res) => {
  try {
    const { website_id, email } = req.body;
    if (!website_id || !email) {
      return res.status(400).json({ ok: false, error: 'website_id and email are required' });
    }

    const result = await sendTestNotification(website_id, email);
    res.json({ ok: result.success, message_id: result.messageId, error: result.error });
  } catch (error) {
    logger.error('Notifications', 'Failed to send test email', { error });
    res.status(500).json({ ok: false, error: 'Failed to send test email' });
  }
});

// GET /api/notifications/health — Notification service health
router.get('/notifications/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'notifications',
    sendgrid_configured: isSendGridConfigured(),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/sites/:siteId/notifications/events — Recent notification events
router.get('/sites/:siteId/notifications/events', requireAuth, async (req, res) => {
  try {
    const events = await getRecentEvents(req.params.siteId, 50);
    res.json({ ok: true, events });
  } catch (error) {
    logger.error('Notifications', 'Failed to fetch events', { error });
    res.status(500).json({ ok: false, error: 'Failed to fetch events' });
  }
});

// GET /api/sites/:siteId/notifications/recipients — Notification recipients
router.get('/sites/:siteId/notifications/recipients', requireAuth, async (req, res) => {
  try {
    const recipients = await getRecipients(req.params.siteId);
    res.json({ ok: true, recipients });
  } catch (error) {
    logger.error('Notifications', 'Failed to fetch recipients', { error });
    res.status(500).json({ ok: false, error: 'Failed to fetch recipients' });
  }
});

// GET /api/sites/:siteId/notifications/rules — Notification rules
router.get('/sites/:siteId/notifications/rules', requireAuth, async (req, res) => {
  try {
    const rules = await getRules(req.params.siteId);
    res.json({ ok: true, rules });
  } catch (error) {
    logger.error('Notifications', 'Failed to fetch rules', { error });
    res.status(500).json({ ok: false, error: 'Failed to fetch rules' });
  }
});

// GET /api/sites/:siteId/notifications/settings — Notification settings
router.get('/sites/:siteId/notifications/settings', requireAuth, async (req, res) => {
  try {
    const settings = await getNotificationSettings(req.params.siteId);
    res.json({ ok: true, settings });
  } catch (error) {
    logger.error('Notifications', 'Failed to fetch settings', { error });
    res.status(500).json({ ok: false, error: 'Failed to fetch settings' });
  }
});

export default router;
