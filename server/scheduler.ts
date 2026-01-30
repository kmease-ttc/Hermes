import cron from 'node-cron';
import { ga4Connector } from './connectors/ga4';
import { gscConnector } from './connectors/gsc';
import { adsConnector } from './connectors/ads';
import { validateRobotsTxt } from './connectors/robotsTxtValidator';
import { websiteChecker } from './website_checks';
import { analysisEngine } from './analysis';
import { googleAuth } from './auth/google-oauth';
import { logger } from './utils/logger';
import { storage } from './storage';
import { v4 as uuidv4 } from 'uuid';

async function runDailyDiagnostics() {
  try {
    logger.info('Scheduler', 'Starting scheduled diagnostic run');

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const isAuthenticated = await googleAuth.isAuthenticated();
    
    if (!isAuthenticated) {
      logger.warn('Scheduler', 'Not authenticated, skipping API data fetch');
    } else {
      await Promise.all([
        ga4Connector.fetchDailyData(startDate, endDate).catch(e => 
          logger.error('Scheduler', 'GA4 fetch failed', { error: e.message })
        ),
        gscConnector.fetchDailyData(startDate, endDate).catch(e => 
          logger.error('Scheduler', 'GSC fetch failed', { error: e.message })
        ),
        adsConnector.fetchDailyData(startDate, endDate).catch(e => 
          logger.error('Scheduler', 'Ads fetch failed', { error: e.message })
        ),
      ]);

      const [, sitemaps] = await Promise.all([
        ga4Connector.checkRealtimeHealth().catch(e =>
          logger.error('Scheduler', 'GA4 realtime check failed', { error: e.message })
        ),
        gscConnector.fetchSitemaps().catch(e => {
          logger.error('Scheduler', 'GSC sitemaps fetch failed', { error: e.message });
          return [] as import('./connectors/gsc').SitemapInfo[];
        }),
        adsConnector.getCampaignStatuses().catch(e =>
          logger.error('Scheduler', 'Ads campaign status check failed', { error: e.message })
        ),
        adsConnector.getPolicyIssues().catch(e =>
          logger.error('Scheduler', 'Ads policy issues check failed', { error: e.message })
        ),
      ]);

      // Run coverage inspection (URL Inspection API + robots.txt validation)
      await runCoverageInspection(startDate, endDate, sitemaps || []).catch(e =>
        logger.error('Scheduler', 'Coverage inspection failed', { error: e.message })
      );
    }

    const topPages = await ga4Connector.getLandingPagePerformance(startDate, endDate, 20)
      .then(pages => pages.map(p => `https://${process.env.DOMAIN || 'empathyhealthclinic.com'}${p.landingPage}`))
      .catch(() => []);
    
    await websiteChecker.runDailyChecks(topPages);

    const report = await analysisEngine.generateReport(startDate, endDate);

    const rootCauses = typeof report.rootCauses === 'string' 
      ? JSON.parse(report.rootCauses) 
      : report.rootCauses;
    
    await analysisEngine.generateTickets(report.id, rootCauses);

    logger.info('Scheduler', 'Scheduled diagnostic run completed', { reportId: report.id });
  } catch (error: any) {
    logger.error('Scheduler', 'Scheduled diagnostic run failed', { error: error.message });
  }
}

async function runCoverageInspection(
  startDate: string,
  endDate: string,
  sitemaps: import('./connectors/gsc').SitemapInfo[],
) {
  logger.info('Scheduler', 'Starting coverage inspection');

  const sites = await storage.getSites(true);
  const gscSite = process.env.GSC_SITE || '';

  for (const site of sites) {
    try {
      // Get top pages for inspection from GSC performance data
      const topPages = await gscConnector.getTopPagesForInspection(startDate, endDate).catch(() => [] as string[]);

      if (topPages.length > 0) {
        await gscConnector.batchUrlInspection(topPages, site.siteId);
        logger.info('Scheduler', `URL inspection complete for ${site.siteId}`, { pages: topPages.length });
      } else {
        logger.info('Scheduler', `No pages to inspect for ${site.siteId}`);
      }

      // Validate robots.txt
      const domain = site.baseUrl?.replace(/^https?:\/\//, '').replace(/\/$/, '') || process.env.DOMAIN || '';
      if (domain) {
        await validateRobotsTxt(domain, site.siteId, sitemaps);
        logger.info('Scheduler', `Robots.txt validation complete for ${site.siteId}`);
      }

      // Save manual action advisory (API unavailable)
      const gscLink = gscSite
        ? `https://search.google.com/search-console/manual-actions?resource_id=${encodeURIComponent(gscSite)}`
        : null;

      await storage.saveManualActionCheck({
        siteId: site.siteId,
        date: new Date().toISOString().split('T')[0],
        checkType: 'manual_actions',
        status: 'api_unavailable',
        gscWebUiLink: gscLink,
      });

      await storage.saveManualActionCheck({
        siteId: site.siteId,
        date: new Date().toISOString().split('T')[0],
        checkType: 'security_issues',
        status: 'api_unavailable',
        gscWebUiLink: gscSite
          ? `https://search.google.com/search-console/security-issues?resource_id=${encodeURIComponent(gscSite)}`
          : null,
      });
    } catch (siteError: any) {
      logger.error('Scheduler', `Coverage inspection failed for site ${site.siteId}`, {
        error: siteError.message,
      });
    }
  }

  logger.info('Scheduler', 'Coverage inspection completed for all sites');
}

async function generateWeeklyKBaseSynthesis() {
  try {
    logger.info('Scheduler', 'Starting weekly KBase synthesis');
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sites = await storage.getSites(true);
    
    for (const site of sites) {
      try {
        const logs = await storage.getAgentActionLogsByTimeWindow(site.siteId, startTime, endTime);
        
        if (logs.length === 0) {
          logger.debug('Scheduler', `No logs for site ${site.siteId}, skipping synthesis`);
          continue;
        }
        
        const runStarted = logs.filter(l => l.actionType === 'run_started').length;
        const runCompleted = logs.filter(l => l.actionType === 'run_completed').length;
        const runErrors = logs.filter(l => l.actionType === 'run_error').length;
        const recommendationsLogs = logs.filter(l => l.actionType === 'recommendations_emitted');
        
        const totalRecommendations = recommendationsLogs.reduce((acc, log) => {
          const impact = log.expectedImpact as { suggestionsCount?: number } | null;
          return acc + (impact?.suggestionsCount || 0);
        }, 0);
        
        const agentCounts: Record<string, { runs: number; errors: number }> = {};
        for (const log of logs) {
          if (!agentCounts[log.agentId]) {
            agentCounts[log.agentId] = { runs: 0, errors: 0 };
          }
          if (log.actionType === 'run_completed') {
            agentCounts[log.agentId].runs++;
          } else if (log.actionType === 'run_error') {
            agentCounts[log.agentId].errors++;
          }
        }
        
        const successRate = runCompleted + runErrors > 0 
          ? Math.round((runCompleted / (runCompleted + runErrors)) * 100) 
          : 0;
        
        const topAgents = Object.entries(agentCounts)
          .sort((a, b) => b[1].runs - a[1].runs)
          .slice(0, 5);
        
        const failingAgents = Object.entries(agentCounts)
          .filter(([_, stats]) => stats.errors > 0)
          .sort((a, b) => b[1].errors - a[1].errors);
        
        const runId = `weekly_${endTime.toISOString().split('T')[0]}`;
        const insightId = `ins_${Date.now()}_weekly_synthesis_${site.siteId}`;
        
        const whatWorked = topAgents
          .filter(([_, stats]) => stats.runs > 0 && stats.errors === 0)
          .map(([agent]) => agent);
        
        const whatFailed = failingAgents.map(([agent, stats]) => 
          `${agent}: ${stats.errors} errors`
        );
        
        let fullContent = `# Weekly SEO Operations Summary\n\n`;
        fullContent += `**Period**: ${startTime.toISOString().split('T')[0]} to ${endTime.toISOString().split('T')[0]}\n\n`;
        fullContent += `## Overview\n`;
        fullContent += `- Total runs started: ${runStarted}\n`;
        fullContent += `- Successful completions: ${runCompleted}\n`;
        fullContent += `- Errors: ${runErrors}\n`;
        fullContent += `- Success rate: ${successRate}%\n`;
        fullContent += `- Recommendations generated: ${totalRecommendations}\n\n`;
        
        if (whatWorked.length > 0) {
          fullContent += `## What Worked\n`;
          whatWorked.forEach(agent => {
            fullContent += `- **${agent}**: Ran without errors\n`;
          });
          fullContent += `\n`;
        }
        
        if (whatFailed.length > 0) {
          fullContent += `## What Failed\n`;
          whatFailed.forEach(failure => {
            fullContent += `- ${failure}\n`;
          });
          fullContent += `\n`;
        }
        
        fullContent += `## Heuristics Update\n`;
        if (successRate >= 90) {
          fullContent += `- System health: Excellent. Maintain current configuration.\n`;
        } else if (successRate >= 70) {
          fullContent += `- System health: Good. Minor issues detected - monitor failing agents.\n`;
        } else {
          fullContent += `- System health: Needs attention. Multiple failures detected - review agent configurations.\n`;
        }
        
        if (runErrors > runCompleted * 0.3) {
          fullContent += `- Anti-pattern detected: High error rate suggests connectivity or configuration issues.\n`;
        }
        
        fullContent += `\n## Velocity Guidance\n`;
        if (totalRecommendations > 20) {
          fullContent += `- High recommendation volume - prioritize high-severity items first.\n`;
        } else if (totalRecommendations > 0) {
          fullContent += `- Moderate recommendation load - all items can be addressed this sprint.\n`;
        } else {
          fullContent += `- No new recommendations - focus on implementing existing action items.\n`;
        }
        
        await storage.saveSeoKbaseInsights([{
          insightId,
          runId,
          siteId: site.siteId,
          title: `Weekly SEO Operations Summary - Week of ${startTime.toISOString().split('T')[0]}`,
          summary: `Success rate: ${successRate}% | Runs: ${runStarted} | Recommendations: ${totalRecommendations} | Errors: ${runErrors}`,
          fullContent,
          insightType: 'weekly_summary',
          articleRefsJson: null,
          suggestionIds: null,
          actionsJson: failingAgents.length > 0 
            ? [{ action: 'review_failing_agents', agents: failingAgents.map(([a]) => a) }]
            : null,
          priority: 80,
        }]);
        
        logger.info('Scheduler', `Weekly synthesis complete for ${site.siteId}`, {
          successRate,
          totalRecommendations,
          runErrors,
        });
      } catch (siteError: any) {
        logger.error('Scheduler', `Weekly synthesis failed for site ${site.siteId}`, { 
          error: siteError.message 
        });
      }
    }
    
    logger.info('Scheduler', 'Weekly KBase synthesis completed for all sites');
  } catch (error: any) {
    logger.error('Scheduler', 'Weekly KBase synthesis failed', { error: error.message });
  }
}

async function computeDailyAchievements() {
  try {
    logger.info('Scheduler', 'Starting daily achievement computation');
    const sites = await storage.getSites(true);

    for (const site of sites) {
      try {
        const { computeAchievementsForSite } = await import('./services/achievementComputation');
        const result = await computeAchievementsForSite(site.siteId);

        if (result.milestonesAchieved.length > 0) {
          // Get site owner email
          const siteData = await storage.getSiteById(site.siteId);
          const ownerEmail = siteData?.ownerContact;

          if (ownerEmail && ownerEmail.includes('@')) {
            const { sendAchievementMilestoneEmail } = await import('./services/email');
            const { ACHIEVEMENT_CATEGORIES } = await import('@shared/schema');

            const milestoneData = result.milestonesAchieved.map(m => {
              const cat = ACHIEVEMENT_CATEGORIES[m.categoryId as keyof typeof ACHIEVEMENT_CATEGORIES];
              return {
                trackName: m.trackKey,
                categoryLabel: cat?.label || m.categoryId,
                categoryColor: cat?.color || '#6b7280',
                newTier: m.tier,
                newLevel: m.level,
                headline: m.headline,
              };
            });

            await sendAchievementMilestoneEmail(ownerEmail, {
              displayName: siteData?.ownerName || undefined,
              siteName: siteData?.displayName || site.siteId,
              milestones: milestoneData,
            });

            // Mark milestones as notified
            for (const milestone of result.milestonesAchieved) {
              await storage.markMilestoneNotified(milestone.id);
            }
          }
        }

        logger.info('Scheduler', `Achievement computation complete for ${site.siteId}`, {
          tracksUpdated: result.tracksUpdated,
          milestones: result.milestonesAchieved.length,
        });
      } catch (siteError: any) {
        logger.error('Scheduler', `Achievement computation failed for ${site.siteId}`, {
          error: siteError.message,
        });
      }
    }

    logger.info('Scheduler', 'Daily achievement computation completed for all sites');
  } catch (error: any) {
    logger.error('Scheduler', 'Daily achievement computation failed', { error: error.message });
  }
}

async function runWeeklySiteScans() {
  try {
    logger.info('Scheduler', 'Starting weekly site scans');
    const { db } = await import('./db');
    const { sql } = await import('drizzle-orm');

    // Find all sites with weekly scan enabled and due
    const result = await db.execute(sql`
      SELECT wa.site_id, wa.domain, wa.user_id
      FROM website_automation wa
      WHERE wa.weekly_scan_enabled = true
        AND (wa.next_scheduled_at IS NULL OR wa.next_scheduled_at <= NOW())
    `);

    const rows = result.rows as Array<{ site_id: string; domain: string; user_id: number }>;

    if (rows.length === 0) {
      logger.info('Scheduler', 'No sites due for weekly scan');
      return;
    }

    for (const row of rows) {
      try {
        logger.info('Scheduler', 'scan_started', { websiteId: row.site_id, domain: row.domain });

        // Trigger scan via internal fetch to the scan API
        const scanUrl = `https://${row.domain}`;
        const scanRes = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: scanUrl }),
        });

        if (scanRes.ok) {
          const scanData = await scanRes.json();
          logger.info('Scheduler', 'scan_completed', {
            websiteId: row.site_id,
            scanId: scanData.scanId,
          });
        } else {
          logger.error('Scheduler', 'scan_failed', {
            websiteId: row.site_id,
            status: scanRes.status,
          });
        }

        // Update next scheduled time (7 days from now)
        const nextScheduled = new Date();
        nextScheduled.setDate(nextScheduled.getDate() + 7);
        nextScheduled.setHours(7, 0, 0, 0);

        await db.execute(sql`
          UPDATE website_automation
          SET last_weekly_scan_at = NOW(),
              next_scheduled_at = ${nextScheduled},
              updated_at = NOW()
          WHERE site_id = ${row.site_id}
        `);
      } catch (siteErr: any) {
        logger.error('Scheduler', 'scan_failed', {
          websiteId: row.site_id,
          error: siteErr.message,
        });
      }
    }

    logger.info('Scheduler', 'Weekly site scans completed', { count: rows.length });
  } catch (error: any) {
    logger.error('Scheduler', 'Weekly site scans failed', { error: error.message });
  }
}

export function startScheduler() {
  cron.schedule('0 7 * * *', runDailyDiagnostics, {
    scheduled: true,
    timezone: 'America/Chicago',
  });

  cron.schedule('0 8 * * 1', generateWeeklyKBaseSynthesis, {
    scheduled: true,
    timezone: 'America/Chicago',
  });

  cron.schedule('0 9 * * *', computeDailyAchievements, {
    scheduled: true,
    timezone: 'America/Chicago',
  });

  // Weekly site scans - Mondays at 6 AM (before other jobs)
  cron.schedule('0 6 * * 1', runWeeklySiteScans, {
    scheduled: true,
    timezone: 'America/Chicago',
  });

  logger.info('Scheduler', 'Schedulers started: Daily diagnostics (7am), Weekly KBase synthesis (Mondays 8am), Daily achievements (9am), Weekly site scans (Mondays 6am)');
}
