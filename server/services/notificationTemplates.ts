/**
 * Notification Email Templates
 * Consolidated from Worker-Notification/server/templates.ts
 *
 * Renders HTML + plain-text emails for SEO notification events:
 * - Critical metric drops
 * - Crawl/connector failures
 * - Approval requests
 * - Daily diagnosis summaries
 * - Test emails
 */

import type { NotificationEvent } from "@shared/schema";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: white; }
  .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 24px; text-align: center; }
  .header h1 { color: white; margin: 0; font-size: 18px; font-weight: 600; }
  .content { padding: 32px 24px; }
  .alert-box { padding: 16px; border-radius: 8px; margin-bottom: 24px; }
  .alert-critical { background: #fef2f2; border-left: 4px solid #dc2626; }
  .alert-warning { background: #fffbeb; border-left: 4px solid #f59e0b; }
  .alert-info { background: #eff6ff; border-left: 4px solid #3b82f6; }
  .metric-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .metric-table th, .metric-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  .metric-table th { background: #f9fafb; font-weight: 500; color: #6b7280; font-size: 12px; text-transform: uppercase; }
  .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
  .btn-secondary { background: #e5e7eb; color: #374151; }
  .footer { padding: 24px; background: #f9fafb; text-align: center; font-size: 12px; color: #6b7280; }
  .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
  .badge-critical { background: #fee2e2; color: #dc2626; }
  .badge-warning { background: #fef3c7; color: #d97706; }
  .badge-info { background: #dbeafe; color: #2563eb; }
`;

function getSeverityClass(severity: string): string {
  switch (severity) {
    case "critical": return "alert-critical";
    case "warning": return "alert-warning";
    default: return "alert-info";
  }
}

function getBadgeClass(severity: string): string {
  switch (severity) {
    case "critical": return "badge-critical";
    case "warning": return "badge-warning";
    default: return "badge-info";
  }
}

function formatTimestamp(date: Date | null | undefined): string {
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function renderCriticalDropDetected(event: NotificationEvent, websiteId: string): RenderedEmail {
  const payload = event.payloadJson as any || {};
  const metric = payload.metric || "clicks";
  const deltaPct = payload.delta_pct || 0;
  const currentValue = payload.current_value || 0;
  const previousValue = payload.previous_value || 0;

  const subject = `[Arclo] ${websiteId}: Critical drop in ${metric} (${deltaPct}% WoW)`;

  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>Arclo Notifications</h1></div>
    <div class="content">
      <div class="alert-box ${getSeverityClass(event.severity)}">
        <span class="badge ${getBadgeClass(event.severity)}">${(event.severity || "info").toUpperCase()}</span>
        <h2 style="margin: 12px 0 8px 0; font-size: 18px;">${event.title}</h2>
        <p style="margin: 0; color: #6b7280;">${event.summary || ""}</p>
      </div>
      <h3 style="margin-bottom: 12px; font-size: 14px; color: #374151;">Key Metrics</h3>
      <table class="metric-table">
        <tr><th>Metric</th><th>Current</th><th>Previous</th><th>Change</th></tr>
        <tr>
          <td>${metric}</td>
          <td>${currentValue.toLocaleString()}</td>
          <td>${previousValue.toLocaleString()}</td>
          <td style="color: ${deltaPct < 0 ? '#dc2626' : '#16a34a'}">${deltaPct > 0 ? '+' : ''}${deltaPct}%</td>
        </tr>
      </table>
      <p style="margin: 24px 0;">
        <a href="#" class="btn">View Dashboard</a>
        <a href="#" class="btn btn-secondary" style="margin-left: 12px;">View Details</a>
      </p>
    </div>
    <div class="footer">
      <p>Notification sent by Arclo for ${websiteId}</p>
      <p>Event ID: ${event.id} | ${formatTimestamp(event.occurredAt)}</p>
    </div>
  </div>
</body>
</html>`;

  const text = `[Arclo] ${(event.severity || "info").toUpperCase()}: ${event.title}\n\n${event.summary || ""}\n\nKey Metrics:\n- Metric: ${metric}\n- Current: ${currentValue}\n- Previous: ${previousValue}\n- Change: ${deltaPct}%\n\n---\nWebsite: ${websiteId}\nEvent ID: ${event.id}\nTime: ${formatTimestamp(event.occurredAt)}`;

  return { subject, html, text };
}

export function renderCrawlFailure(event: NotificationEvent, websiteId: string): RenderedEmail {
  const subject = `[Arclo] ${websiteId}: Crawl Failure Detected`;

  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>Arclo Notifications</h1></div>
    <div class="content">
      <div class="alert-box ${getSeverityClass(event.severity)}">
        <span class="badge ${getBadgeClass(event.severity)}">${(event.severity || "info").toUpperCase()}</span>
        <h2 style="margin: 12px 0 8px 0; font-size: 18px;">${event.title}</h2>
        <p style="margin: 0; color: #6b7280;">${event.summary || ""}</p>
      </div>
      <p style="margin: 24px 0;"><a href="#" class="btn">View Details</a></p>
    </div>
    <div class="footer">
      <p>Notification sent by Arclo for ${websiteId}</p>
      <p>Event ID: ${event.id} | ${formatTimestamp(event.occurredAt)}</p>
    </div>
  </div>
</body>
</html>`;

  const text = `[Arclo] ${(event.severity || "info").toUpperCase()}: ${event.title}\n\n${event.summary || ""}\n\n---\nWebsite: ${websiteId}\nEvent ID: ${event.id}\nTime: ${formatTimestamp(event.occurredAt)}`;

  return { subject, html, text };
}

export function renderApprovalNeeded(event: NotificationEvent, websiteId: string): RenderedEmail {
  const payload = event.payloadJson as any || {};
  const changeType = payload.change_type || "update";
  const riskLevel = payload.risk_level || "low";

  const subject = `[Arclo] ${websiteId}: Approval Needed - ${changeType}`;

  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>Arclo Notifications</h1></div>
    <div class="content">
      <div class="alert-box ${getSeverityClass(event.severity)}">
        <span class="badge ${getBadgeClass(event.severity)}">${(event.severity || "info").toUpperCase()}</span>
        <h2 style="margin: 12px 0 8px 0; font-size: 18px;">${event.title}</h2>
        <p style="margin: 0; color: #6b7280;">${event.summary || ""}</p>
      </div>
      <p style="margin-bottom: 8px;"><strong>Change Type:</strong> ${changeType}</p>
      <p style="margin-bottom: 8px;"><strong>Risk Level:</strong> ${riskLevel}</p>
      <p style="margin: 24px 0;">
        <a href="#" class="btn" style="background: #16a34a;">Approve</a>
        <a href="#" class="btn btn-secondary" style="margin-left: 12px;">Decline</a>
      </p>
    </div>
    <div class="footer">
      <p>Notification sent by Arclo for ${websiteId}</p>
      <p>Event ID: ${event.id} | ${formatTimestamp(event.occurredAt)}</p>
    </div>
  </div>
</body>
</html>`;

  const text = `[Arclo] Approval Needed: ${event.title}\n\n${event.summary || ""}\n\nChange Type: ${changeType}\nRisk Level: ${riskLevel}\n\n---\nWebsite: ${websiteId}\nEvent ID: ${event.id}\nTime: ${formatTimestamp(event.occurredAt)}`;

  return { subject, html, text };
}

export function renderDailySummary(event: NotificationEvent, websiteId: string): RenderedEmail {
  const subject = `[Arclo] ${websiteId}: Daily Diagnosis Summary`;

  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>Arclo Notifications</h1></div>
    <div class="content">
      <h2 style="margin: 0 0 16px 0; font-size: 20px;">Daily Diagnosis Summary</h2>
      <p style="color: #6b7280; margin-bottom: 24px;">${formatTimestamp(new Date())}</p>
      <div class="alert-box alert-info">
        <h3 style="margin: 0 0 8px 0; font-size: 14px;">What's Changed</h3>
        <p style="margin: 0; color: #6b7280;">${event.summary || "No significant changes detected in the last 24 hours."}</p>
      </div>
      <p style="margin: 24px 0;"><a href="#" class="btn">View Full Report</a></p>
    </div>
    <div class="footer">
      <p>Summary sent by Arclo for ${websiteId}</p>
      <p>Event ID: ${event.id}</p>
    </div>
  </div>
</body>
</html>`;

  const text = `[Arclo] Daily Diagnosis Summary for ${websiteId}\n${formatTimestamp(new Date())}\n\nWhat's Changed:\n${event.summary || "No significant changes detected in the last 24 hours."}\n\n---\nEvent ID: ${event.id}`;

  return { subject, html, text };
}

export function renderTestEmail(websiteId: string): RenderedEmail {
  const subject = `[Arclo] Test Email - ${websiteId}`;

  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>Arclo Notifications</h1></div>
    <div class="content">
      <div class="alert-box alert-info">
        <span class="badge badge-info">TEST</span>
        <h2 style="margin: 12px 0 8px 0; font-size: 18px;">Test Email</h2>
        <p style="margin: 0; color: #6b7280;">This is a test email to verify your notification setup is working correctly.</p>
      </div>
      <p style="margin-bottom: 8px;"><strong>Website:</strong> ${websiteId}</p>
      <p style="margin-bottom: 8px;"><strong>Sent:</strong> ${formatTimestamp(new Date())}</p>
      <p style="margin: 24px 0;"><a href="#" class="btn">Go to Dashboard</a></p>
    </div>
    <div class="footer"><p>Test notification sent by Arclo</p></div>
  </div>
</body>
</html>`;

  const text = `[Arclo] Test Email\n\nThis is a test to verify your notification setup.\n\nWebsite: ${websiteId}\nSent: ${formatTimestamp(new Date())}`;

  return { subject, html, text };
}

/**
 * Route an event to the appropriate template renderer.
 */
export function renderNotificationEmail(event: NotificationEvent, websiteId: string): RenderedEmail {
  switch (event.eventType) {
    case "critical_drop_detected":
      return renderCriticalDropDetected(event, websiteId);
    case "crawl_failure":
    case "connector_failure":
      return renderCrawlFailure(event, websiteId);
    case "approval_needed":
    case "approval_reminder":
      return renderApprovalNeeded(event, websiteId);
    case "daily_diagnosis_summary":
      return renderDailySummary(event, websiteId);
    default:
      return renderCrawlFailure(event, websiteId);
  }
}
