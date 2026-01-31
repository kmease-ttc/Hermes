/**
 * Website Registry Routes
 * 
 * Manages target websites that Hermes can orchestrate and modify.
 * These are NOT internal sites - they are managed targets like empathyhealthclinic.com.
 * 
 * IMPORTANT: Secrets are NOT stored in DB. Only secret key NAME references
 * that map to env/Bitwarden at runtime.
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import {
  websites,
  websiteSettings,
  managedWebsiteIntegrations,
  websiteJobs,
  WebsiteStatuses,
  type InsertWebsite,
  type InsertWebsiteSettings,
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { publishWebsiteJob } from '../services/websiteJobPublisher';

const router = Router();

// ============================================
// Validation Schemas
// ============================================

const createWebsiteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  domain: z.string().min(1, "Domain is required")
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/, "Invalid domain format"),
});

const updateWebsiteSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'paused']).optional(),
  settings: z.object({
    competitors: z.array(z.string()).optional(),
    targetServicesEnabled: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }).optional(),
});

const publishJobSchema = z.object({
  job_type: z.enum(['health_check', 'crawl_technical_seo', 'content_audit', 'performance_check']),
});

// ============================================
// Website CRUD Routes
// ============================================

/**
 * POST /api/websites - Create a new managed website
 */
router.post('/websites', async (req, res) => {
  try {
    const parsed = createWebsiteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
      });
    }

    const { name, domain } = parsed.data;
    const id = randomUUID();

    // Check if domain already exists
    const existing = await db.select().from(websites).where(eq(websites.domain, domain)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Website with this domain already exists" });
    }

    // Create website
    const [newWebsite] = await db.insert(websites).values({
      id,
      name,
      domain,
      status: WebsiteStatuses.ACTIVE,
    }).returning();

    // Create default settings
    await db.insert(websiteSettings).values({
      websiteId: id,
      competitors: [],
      targetServicesEnabled: ['health_check', 'crawl_technical_seo'],
      notes: '',
    } as any);

    logger.info("Websites", "Website created", { id, name, domain });

    res.status(201).json(newWebsite);
  } catch (error: any) {
    logger.error("Websites", "Failed to create website", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/websites - List all managed websites
 */
router.get('/websites', async (req, res) => {
  try {
    const allWebsites = await db
      .select({
        id: websites.id,
        name: websites.name,
        domain: websites.domain,
        status: websites.status,
        createdAt: websites.createdAt,
        updatedAt: websites.updatedAt,
      })
      .from(websites)
      .orderBy(desc(websites.createdAt));

    // Get last job for each website
    const websitesWithLastRun = await Promise.all(
      allWebsites.map(async (website) => {
        const [lastJob] = await db
          .select({
            jobId: websiteJobs.id,
            jobType: websiteJobs.jobType,
            status: websiteJobs.status,
            createdAt: websiteJobs.createdAt,
          })
          .from(websiteJobs)
          .where(eq(websiteJobs.websiteId, website.id))
          .orderBy(desc(websiteJobs.createdAt))
          .limit(1);

        return {
          ...website,
          lastJob: lastJob || null,
        };
      })
    );

    res.json(websitesWithLastRun);
  } catch (error: any) {
    logger.error("Websites", "Failed to fetch websites", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/websites/:id - Get website details with settings
 */
router.get('/websites/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [website] = await db
      .select()
      .from(websites)
      .where(eq(websites.id, id))
      .limit(1);

    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    // Get settings
    const [settings] = await db
      .select()
      .from(websiteSettings)
      .where(eq(websiteSettings.websiteId, id))
      .limit(1);

    // Get integrations
    const integrations = await db
      .select()
      .from(managedWebsiteIntegrations)
      .where(eq(managedWebsiteIntegrations.websiteId, id));

    // Get recent jobs
    const recentJobs = await db
      .select()
      .from(websiteJobs)
      .where(eq(websiteJobs.websiteId, id))
      .orderBy(desc(websiteJobs.createdAt))
      .limit(10);

    res.json({
      ...website,
      settings: settings || null,
      integrations,
      recentJobs,
    });
  } catch (error: any) {
    logger.error("Websites", "Failed to fetch website", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/websites/:id - Update website and/or settings
 */
router.patch('/websites/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const parsed = updateWebsiteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
      });
    }

    const { name, status, settings } = parsed.data;

    // Check website exists
    const [existing] = await db.select().from(websites).where(eq(websites.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Website not found" });
    }

    // Update website if name or status changed
    if (name !== undefined || status !== undefined) {
      await db.update(websites)
        .set({
          ...(name !== undefined && { name }),
          ...(status !== undefined && { status }),
          updatedAt: new Date(),
        })
        .where(eq(websites.id, id));
    }

    // Update settings if provided
    if (settings) {
      const existingSettings = await db.select().from(websiteSettings).where(eq(websiteSettings.websiteId, id)).limit(1);
      
      if (existingSettings.length > 0) {
        await db.update(websiteSettings)
          .set({
            ...(settings.competitors !== undefined && { competitors: settings.competitors }),
            ...(settings.targetServicesEnabled !== undefined && { targetServicesEnabled: settings.targetServicesEnabled }),
            ...(settings.notes !== undefined && { notes: settings.notes }),
            updatedAt: new Date(),
          })
          .where(eq(websiteSettings.websiteId, id));
      } else {
        await db.insert(websiteSettings).values({
          websiteId: id,
          competitors: settings.competitors || [],
          targetServicesEnabled: settings.targetServicesEnabled || [],
          notes: settings.notes || '',
        } as any);
      }
    }

    // Fetch updated website
    const [updated] = await db.select().from(websites).where(eq(websites.id, id)).limit(1);
    const [updatedSettings] = await db.select().from(websiteSettings).where(eq(websiteSettings.websiteId, id)).limit(1);

    logger.info("Websites", "Website updated", { id });

    res.json({
      ...updated,
      settings: updatedSettings || null,
    });
  } catch (error: any) {
    logger.error("Websites", "Failed to update website", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Job Publishing Route
// ============================================

/**
 * POST /api/websites/:id/jobs - Publish a job to the queue for this website
 */
router.post('/websites/:id/jobs', async (req, res) => {
  try {
    const { id } = req.params;

    const parsed = publishJobSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
      });
    }

    const { job_type } = parsed.data;

    // Get website
    const [website] = await db.select().from(websites).where(eq(websites.id, id)).limit(1);
    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    if (website.status !== WebsiteStatuses.ACTIVE) {
      return res.status(400).json({ error: "Cannot publish jobs for paused websites" });
    }

    // Publish job using the job publisher service
    const result = await publishWebsiteJob({
      websiteId: website.id,
      domain: website.domain,
      jobType: job_type,
      requestedBy: 'hermes',
    });

    logger.info("Websites", "Job published", { 
      websiteId: id, 
      jobId: result.jobId, 
      jobType: job_type 
    });

    res.status(201).json({
      ok: true,
      job_id: result.jobId,
      trace_id: result.traceId,
      message: `Job ${job_type} queued successfully`,
    });
  } catch (error: any) {
    logger.error("Websites", "Failed to publish job", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/websites/:id/jobs - Get jobs for a website
 */
router.get('/websites/:id/jobs', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const jobs = await db
      .select()
      .from(websiteJobs)
      .where(eq(websiteJobs.websiteId, id))
      .orderBy(desc(websiteJobs.createdAt))
      .limit(limit);

    res.json(jobs);
  } catch (error: any) {
    logger.error("Websites", "Failed to fetch jobs", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
