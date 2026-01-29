/**
 * Notification Service
 * Consolidated from Worker-Notification into Hermes.
 *
 * Processes notification events with:
 * - Quiet hours enforcement (critical alerts bypass)
 * - Throttling / deduplication
 * - Severity-based filtering
 * - Email rendering and delivery via SendGrid
 * - Delivery audit trail
 */

import { db } from "../db";
import {
  notificationSettings,
  notificationRecipients,
  notificationRules,
  notificationEvents,
  notificationDeliveries,
  notificationSuppressions,
  type NotificationEvent,
  type NotificationSettings,
  type NotificationRecipient,
  type NotificationRule,
  type InsertNotificationEvent,
  type InsertNotificationDelivery,
} from "@shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { renderNotificationEmail, renderTestEmail } from "./notificationTemplates";
import { logger } from "../utils/logger";
import sgMail from "@sendgrid/mail";

// ═══════════════════════════════════════════════════════════════════════════
// SENDGRID HELPER
// ═══════════════════════════════════════════════════════════════════════════

let sgInitialized = false;

function ensureSendGrid() {
  if (sgInitialized) return;
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY not configured");
  }
  sgMail.setApiKey(apiKey);
  sgInitialized = true;
}

function getFromEmail(): string {
  return process.env.SENDGRID_FROM_EMAIL || "noreply@arclo.pro";
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  try {
    ensureSendGrid();
    const [response] = await sgMail.send({
      to,
      from: getFromEmail(),
      subject,
      html,
      text,
    });
    return {
      success: true,
      messageId: response.headers["x-message-id"] || `sg_${Date.now()}`,
    };
  } catch (error: any) {
    logger.error("Notifications", `SendGrid error: ${error?.response?.body?.errors?.[0]?.message || error.message}`);
    return {
      success: false,
      error: error?.response?.body?.errors?.[0]?.message || error.message || "Failed to send email",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// QUIET HOURS
// ═══════════════════════════════════════════════════════════════════════════

function isInQuietHours(settings: NotificationSettings | null): boolean {
  if (!settings?.quietHoursStart || !settings?.quietHoursEnd) return false;

  const now = new Date();
  const tz = settings.timezone || "America/Chicago";

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });
    const currentTime = formatter.format(now); // e.g. "21:30"
    const start = settings.quietHoursStart; // e.g. "21:00"
    const end = settings.quietHoursEnd;     // e.g. "07:00"

    // Handle overnight quiet hours (e.g. 21:00 - 07:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }
    return currentTime >= start && currentTime < end;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THROTTLING / DEDUP
// ═══════════════════════════════════════════════════════════════════════════

async function isThrottled(websiteId: string, dedupKey: string): Promise<boolean> {
  const now = new Date();
  const [suppression] = await db
    .select()
    .from(notificationSuppressions)
    .where(
      and(
        eq(notificationSuppressions.websiteId, websiteId),
        eq(notificationSuppressions.dedupKey, dedupKey),
        gte(notificationSuppressions.suppressedUntil, now)
      )
    )
    .limit(1);

  return !!suppression;
}

async function createSuppression(websiteId: string, dedupKey: string, minutes: number): Promise<void> {
  const suppressedUntil = new Date(Date.now() + minutes * 60 * 1000);
  await db.insert(notificationSuppressions).values({
    websiteId,
    dedupKey,
    suppressedUntil,
    reason: `Throttled for ${minutes} minutes`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SEVERITY ORDERING
// ═══════════════════════════════════════════════════════════════════════════

const SEVERITY_ORDER: Record<string, number> = { info: 0, warning: 1, critical: 2 };

function severityMeetsMinimum(eventSeverity: string, minSeverity: string): boolean {
  return (SEVERITY_ORDER[eventSeverity] ?? 0) >= (SEVERITY_ORDER[minSeverity] ?? 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export interface ProcessEventRequest {
  websiteId: string;
  eventType: string;
  severity: string;
  title: string;
  summary?: string;
  payload?: Record<string, any>;
  dedupKey?: string;
}

export interface ProcessEventResult {
  eventId: number;
  deliveriesCreated: number;
  deliveriesSent: number;
  suppressed: boolean;
  quietHours: boolean;
}

/**
 * Process an incoming notification event:
 * 1. Persist the event
 * 2. Check quiet hours (critical bypasses)
 * 3. Check throttle/dedup
 * 4. Find matching rules & recipients
 * 5. Render email and send
 * 6. Record delivery audit trail
 */
export async function processNotificationEvent(req: ProcessEventRequest): Promise<ProcessEventResult> {
  // 1. Persist event
  const [event] = await db
    .insert(notificationEvents)
    .values({
      websiteId: req.websiteId,
      eventType: req.eventType,
      severity: req.severity,
      title: req.title,
      summary: req.summary,
      payloadJson: req.payload,
      dedupKey: req.dedupKey || req.eventType,
      source: "hermes",
      occurredAt: new Date(),
    } as InsertNotificationEvent)
    .returning();

  const result: ProcessEventResult = {
    eventId: event.id,
    deliveriesCreated: 0,
    deliveriesSent: 0,
    suppressed: false,
    quietHours: false,
  };

  // 2. Check quiet hours (critical always bypasses)
  const [settings] = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.websiteId, req.websiteId))
    .limit(1);

  if (req.severity !== "critical" && isInQuietHours(settings || null)) {
    result.quietHours = true;
    logger.info("Notifications", `Event ${event.id} queued during quiet hours`);
    return result;
  }

  // 3. Check throttle
  const dedupKey = req.dedupKey || req.eventType;
  if (await isThrottled(req.websiteId, dedupKey)) {
    result.suppressed = true;
    logger.info("Notifications", `Event ${event.id} throttled (dedupKey: ${dedupKey})`);
    return result;
  }

  // 4. Find matching rules
  const rules = await db
    .select()
    .from(notificationRules)
    .where(
      and(
        eq(notificationRules.websiteId, req.websiteId),
        eq(notificationRules.eventType, req.eventType),
        eq(notificationRules.enabled, true)
      )
    );

  // If no rules, apply default behavior (send to all enabled recipients)
  const effectiveMinSeverity = rules.length > 0 ? rules[0].minSeverity || "info" : "info";
  const throttleMinutes = rules.length > 0 ? rules[0].throttleMinutes || 30 : 30;

  if (!severityMeetsMinimum(req.severity, effectiveMinSeverity)) {
    logger.info("Notifications", `Event ${event.id} below minimum severity (${req.severity} < ${effectiveMinSeverity})`);
    return result;
  }

  // 5. Get recipients
  const recipients = await db
    .select()
    .from(notificationRecipients)
    .where(
      and(
        eq(notificationRecipients.websiteId, req.websiteId),
        eq(notificationRecipients.enabled, true)
      )
    );

  if (recipients.length === 0) {
    logger.info("Notifications", `No recipients configured for ${req.websiteId}`);
    return result;
  }

  // 6. Render email
  const rendered = renderNotificationEmail(event, req.websiteId);

  // 7. Send to each recipient and record delivery
  for (const recipient of recipients) {
    result.deliveriesCreated++;

    const sendResult = await sendEmail(recipient.email, rendered.subject, rendered.html, rendered.text);

    await db.insert(notificationDeliveries).values({
      eventId: event.id,
      websiteId: req.websiteId,
      channel: "email",
      recipient: recipient.email,
      subject: rendered.subject,
      templateId: req.eventType,
      providerMessageId: sendResult.messageId,
      status: sendResult.success ? "sent" : "failed",
      errorCode: sendResult.success ? null : "send_failed",
      errorMessage: sendResult.error || null,
      attemptCount: 1,
      lastAttemptAt: new Date(),
    } as InsertNotificationDelivery);

    if (sendResult.success) {
      result.deliveriesSent++;
    }
  }

  // 8. Create suppression to throttle follow-up events
  await createSuppression(req.websiteId, dedupKey, throttleMinutes);

  logger.info("Notifications", `Event ${event.id}: ${result.deliveriesSent}/${result.deliveriesCreated} deliveries sent`);

  return result;
}

/**
 * Send a test notification email.
 */
export async function sendTestNotification(websiteId: string, recipientEmail: string): Promise<SendResult> {
  const rendered = renderTestEmail(websiteId);
  return sendEmail(recipientEmail, rendered.subject, rendered.html, rendered.text);
}

/**
 * Get notification settings for a website.
 */
export async function getNotificationSettings(websiteId: string): Promise<NotificationSettings | null> {
  const [settings] = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.websiteId, websiteId))
    .limit(1);
  return settings || null;
}

/**
 * Get recent notification events for a website.
 */
export async function getRecentEvents(websiteId: string, limit = 50): Promise<NotificationEvent[]> {
  return db
    .select()
    .from(notificationEvents)
    .where(eq(notificationEvents.websiteId, websiteId))
    .orderBy(desc(notificationEvents.createdAt))
    .limit(limit);
}

/**
 * Get recipients for a website.
 */
export async function getRecipients(websiteId: string): Promise<NotificationRecipient[]> {
  return db
    .select()
    .from(notificationRecipients)
    .where(eq(notificationRecipients.websiteId, websiteId));
}

/**
 * Get notification rules for a website.
 */
export async function getRules(websiteId: string): Promise<NotificationRule[]> {
  return db
    .select()
    .from(notificationRules)
    .where(eq(notificationRules.websiteId, websiteId));
}

/**
 * Check if SendGrid is configured.
 */
export function isSendGridConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}
