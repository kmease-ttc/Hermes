import cron from 'node-cron';
import { ga4Connector } from './connectors/ga4';
import { gscConnector } from './connectors/gsc';
import { adsConnector } from './connectors/ads';
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

      await Promise.all([
        ga4Connector.checkRealtimeHealth().catch(e =>
          logger.error('Scheduler', 'GA4 realtime check failed', { error: e.message })
        ),
        gscConnector.fetchSitemaps().catch(e =>
          logger.error('Scheduler', 'GSC sitemaps fetch failed', { error: e.message })
        ),
        adsConnector.getCampaignStatuses().catch(e =>
          logger.error('Scheduler', 'Ads campaign status check failed', { error: e.message })
        ),
        adsConnector.getPolicyIssues().catch(e =>
          logger.error('Scheduler', 'Ads policy issues check failed', { error: e.message })
        ),
      ]);
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

export function startScheduler() {
  cron.schedule('0 7 * * *', runDailyDiagnostics, {
    scheduled: true,
    timezone: 'America/Chicago',
  });

  cron.schedule('0 8 * * 1', generateWeeklyKBaseSynthesis, {
    scheduled: true,
    timezone: 'America/Chicago',
  });

  logger.info('Scheduler', 'Schedulers started: Daily diagnostics (7am), Weekly KBase synthesis (Mondays 8am)');
}
