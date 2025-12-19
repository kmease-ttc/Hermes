import { storage } from "../storage";
import { type InsertReport, type InsertTicket } from "@shared/schema";
import { logger } from "../utils/logger";

interface DropDetection {
  date: string;
  metric: string;
  value: number;
  previousAvg: number;
  dropPercentage: number;
  zScore: number;
}

interface RootCause {
  hypothesis: string;
  confidence: 'High' | 'Medium' | 'Low';
  evidence: string[];
  owner: 'SEO' | 'Dev' | 'Ads';
  priority: 'High' | 'Medium' | 'Low';
}

export class AnalysisEngine {
  async detectDrops(startDate: string, endDate: string): Promise<DropDetection[]> {
    const ga4Data = await storage.getGA4DataByDateRange(startDate, endDate);
    const gscData = await storage.getGSCDataByDateRange(startDate, endDate);
    const adsData = await storage.getAdsDataByDateRange(startDate, endDate);

    const drops: DropDetection[] = [];

    const ga4ByDate = new Map<string, number>();
    ga4Data.forEach(d => {
      const current = ga4ByDate.get(d.date) || 0;
      ga4ByDate.set(d.date, current + d.sessions);
    });

    const dates = Array.from(ga4ByDate.keys()).sort();
    
    for (let i = 7; i < dates.length; i++) {
      const currentDate = dates[i];
      const currentValue = ga4ByDate.get(currentDate) || 0;
      
      const previousValues = dates.slice(i - 7, i).map(d => ga4ByDate.get(d) || 0);
      const avg = previousValues.reduce((a, b) => a + b, 0) / previousValues.length;
      const stdDev = Math.sqrt(
        previousValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / previousValues.length
      );

      const zScore = stdDev > 0 ? (currentValue - avg) / stdDev : 0;
      const dropPercentage = ((currentValue - avg) / avg) * 100;

      if (zScore < -2 && dropPercentage < -15) {
        drops.push({
          date: currentDate,
          metric: 'Organic Traffic (Sessions)',
          value: currentValue,
          previousAvg: Math.round(avg),
          dropPercentage: Math.round(dropPercentage * 10) / 10,
          zScore: Math.round(zScore * 100) / 100,
        });
      }
    }

    logger.info('Analysis', `Detected ${drops.length} significant drops`);
    return drops;
  }

  async classifyRootCauses(drops: DropDetection[]): Promise<RootCause[]> {
    if (drops.length === 0) {
      return [];
    }

    const webChecks = await storage.getWebChecksByDate(drops[0].date);
    const causes: RootCause[] = [];

    const failedChecks = webChecks.filter(c => c.statusCode !== 200);
    if (failedChecks.length > 0) {
      causes.push({
        hypothesis: `${failedChecks.length} pages returning non-200 status codes`,
        confidence: 'High',
        evidence: failedChecks.map(c => `${c.url}: ${c.statusCode}`),
        owner: 'Dev',
        priority: 'High',
      });
    }

    const canonicalIssues = webChecks.filter(c => c.canonical === null && c.statusCode === 200);
    if (canonicalIssues.length > 2) {
      causes.push({
        hypothesis: `${canonicalIssues.length} pages missing canonical tags`,
        confidence: 'Medium',
        evidence: canonicalIssues.slice(0, 5).map(c => c.url),
        owner: 'SEO',
        priority: 'Medium',
      });
    }

    const noindexPages = webChecks.filter(c => c.metaRobots?.includes('noindex'));
    if (noindexPages.length > 0) {
      causes.push({
        hypothesis: `${noindexPages.length} pages with noindex directive`,
        confidence: 'High',
        evidence: noindexPages.map(c => c.url),
        owner: 'Dev',
        priority: 'High',
      });
    }

    if (causes.length === 0) {
      causes.push({
        hypothesis: 'Seasonal traffic variation or algorithm update',
        confidence: 'Low',
        evidence: ['No technical issues detected', 'Check Google Search Central for updates'],
        owner: 'SEO',
        priority: 'Medium',
      });
    }

    return causes.sort((a, b) => {
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  async generateReport(startDate: string, endDate: string): Promise<InsertReport> {
    logger.info('Analysis', `Generating report for ${startDate} to ${endDate}`);

    const drops = await this.detectDrops(startDate, endDate);
    const rootCauses = await this.classifyRootCauses(drops);

    const summary = drops.length > 0
      ? `Detected ${drops.length} significant traffic drop(s). Primary concern: ${rootCauses[0]?.hypothesis || 'Unknown'}`
      : 'No significant traffic anomalies detected.';

    const markdownReport = this.buildMarkdownReport(drops, rootCauses, startDate, endDate);

    const report: InsertReport = {
      date: endDate,
      reportType: 'daily',
      summary,
      dropDates: drops.map(d => ({ date: d.date, metric: d.metric, drop: d.dropPercentage })),
      rootCauses: rootCauses.map(rc => ({
        hypothesis: rc.hypothesis,
        confidence: rc.confidence,
        owner: rc.owner,
      })),
      markdownReport,
    };

    const savedReport = await storage.saveReport(report);
    logger.info('Analysis', `Report generated with ID ${savedReport.id}`);

    return savedReport;
  }

  private buildMarkdownReport(drops: DropDetection[], causes: RootCause[], startDate: string, endDate: string): string {
    let md = `# Traffic & Spend Diagnostic Report\n\n`;
    md += `**Period:** ${startDate} to ${endDate}\n`;
    md += `**Generated:** ${new Date().toISOString()}\n\n`;

    md += `## Summary\n\n`;
    if (drops.length === 0) {
      md += `✅ No significant traffic drops detected.\n\n`;
    } else {
      md += `⚠️ Detected ${drops.length} significant drop(s):\n\n`;
      drops.forEach(drop => {
        md += `- **${drop.date}**: ${drop.metric} dropped ${drop.dropPercentage}% (z-score: ${drop.zScore})\n`;
      });
      md += `\n`;
    }

    if (causes.length > 0) {
      md += `## Root Cause Analysis\n\n`;
      causes.forEach((cause, idx) => {
        md += `### ${idx + 1}. ${cause.hypothesis}\n`;
        md += `- **Confidence:** ${cause.confidence}\n`;
        md += `- **Owner:** ${cause.owner}\n`;
        md += `- **Priority:** ${cause.priority}\n`;
        md += `- **Evidence:**\n`;
        cause.evidence.forEach(e => {
          md += `  - ${e}\n`;
        });
        md += `\n`;
      });
    }

    return md;
  }

  async generateTickets(reportId: number, rootCauses: RootCause[]): Promise<InsertTicket[]> {
    const ticketCounter = await storage.getLatestTickets(1);
    let nextId = ticketCounter.length > 0 
      ? parseInt(ticketCounter[0].ticketId.split('-')[1]) + 1 
      : 1000;

    const tickets: InsertTicket[] = rootCauses.map(cause => ({
      ticketId: `TICK-${nextId++}`,
      title: cause.hypothesis,
      owner: cause.owner,
      priority: cause.priority,
      status: 'Open',
      steps: cause.evidence.map((e, i) => ({ step: i + 1, action: e })),
      expectedImpact: `Resolve ${cause.priority.toLowerCase()} priority issue`,
      evidence: { sources: cause.evidence, confidence: cause.confidence },
      reportId,
    }));

    const savedTickets = await storage.saveTickets(tickets);
    logger.info('Analysis', `Generated ${savedTickets.length} tickets`);

    return savedTickets;
  }
}

export const analysisEngine = new AnalysisEngine();
