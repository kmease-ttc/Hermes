export const trackAnalyticsEvent = async (
  eventType: "free_report_cta_clicked" | "free_report_viewed" | "implementation_plan_copied",
  data: { reportId?: string; ctaId?: string; ctaLabel?: string; metadata?: Record<string, unknown> }
) => {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, ...data }),
    });
  } catch (error) {
    console.error("Failed to track analytics event:", error);
  }
};
