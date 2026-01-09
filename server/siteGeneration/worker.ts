import { eq, and, lte, asc } from "drizzle-orm";
import { db } from "../db";
import { siteGenerationJobs, generatedSites } from "@shared/schema";
import { generateWebsiteContent, type BusinessInfo } from "./contentGenerator";
import { buildStaticSiteBundle } from "./siteBuilder";
import { publishSiteBundle } from "./sitePublisher";
import { logger } from "../utils/logger";

const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1000;

let isRunning = false;
let pollTimeout: NodeJS.Timeout | null = null;

function calculateBackoffMs(attempts: number): number {
  return BASE_BACKOFF_MS * Math.pow(2, attempts);
}

export async function enqueueJob(
  type: string,
  siteId: number,
  payload: Record<string, unknown>
): Promise<number> {
  const [job] = await db
    .insert(siteGenerationJobs)
    .values({
      type,
      siteId,
      payloadJson: JSON.stringify(payload),
      status: "queued",
      progress: 0,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      runAfter: new Date(),
    })
    .returning({ id: siteGenerationJobs.id });

  logger.info("SiteGenWorker", `Enqueued job ${job.id}`, { type, siteId });
  return job.id;
}

async function updateJobProgress(
  jobId: number,
  progress: number,
  message: string
): Promise<void> {
  await db
    .update(siteGenerationJobs)
    .set({
      progress,
      progressMessage: message,
      updatedAt: new Date(),
    })
    .where(eq(siteGenerationJobs.id, jobId));
}

async function markJobRunning(jobId: number): Promise<boolean> {
  const result = await db
    .update(siteGenerationJobs)
    .set({
      status: "running",
      startedAt: new Date(),
      attempts: db.$with("increment", (qb) => 
        qb.select({ val: siteGenerationJobs.attempts }).from(siteGenerationJobs).where(eq(siteGenerationJobs.id, jobId))
      ) as any,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(siteGenerationJobs.id, jobId),
        eq(siteGenerationJobs.status, "queued")
      )
    )
    .returning({ id: siteGenerationJobs.id });

  return result.length > 0;
}

async function markJobComplete(jobId: number): Promise<void> {
  await db
    .update(siteGenerationJobs)
    .set({
      status: "completed",
      progress: 100,
      progressMessage: "Completed successfully",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(siteGenerationJobs.id, jobId));
}

async function markJobFailed(
  jobId: number,
  errorMessage: string,
  currentAttempts: number
): Promise<void> {
  const shouldRetry = currentAttempts < MAX_ATTEMPTS;

  if (shouldRetry) {
    const backoffMs = calculateBackoffMs(currentAttempts);
    const runAfter = new Date(Date.now() + backoffMs);

    await db
      .update(siteGenerationJobs)
      .set({
        status: "queued",
        errorMessage,
        runAfter,
        updatedAt: new Date(),
      })
      .where(eq(siteGenerationJobs.id, jobId));

    logger.info("SiteGenWorker", `Job ${jobId} will retry after ${backoffMs}ms`, {
      attempts: currentAttempts,
      maxAttempts: MAX_ATTEMPTS,
    });
  } else {
    await db
      .update(siteGenerationJobs)
      .set({
        status: "failed",
        errorMessage,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(siteGenerationJobs.id, jobId));

    logger.error("SiteGenWorker", `Job ${jobId} failed permanently`, {
      error: errorMessage,
      attempts: currentAttempts,
    });
  }
}

async function processGeneratePreviewSite(
  jobId: number,
  siteId: number
): Promise<void> {
  logger.info("SiteGenWorker", `Processing generate_preview_site for job ${jobId}, site ${siteId}`);

  await updateJobProgress(jobId, 10, "Fetching site record...");
  const [site] = await db
    .select()
    .from(generatedSites)
    .where(eq(generatedSites.id, siteId));

  if (!site) {
    throw new Error(`Site not found: ${siteId}`);
  }

  await updateJobProgress(jobId, 20, "Generating website content...");
  const businessInfo: BusinessInfo = {
    businessName: site.businessName,
    businessCategory: site.businessCategory,
    city: site.city || undefined,
    description: site.description || undefined,
    services: site.services || undefined,
    phone: site.phone || undefined,
    email: site.email,
  };

  const content = await generateWebsiteContent(businessInfo);

  await updateJobProgress(jobId, 50, "Building static site bundle...");
  const bundle = await buildStaticSiteBundle({
    businessName: site.businessName,
    content,
    colorTheme: site.colorTheme || "violet",
    brandPreference: site.brandPreference || "modern",
    logoUrl: site.logoUrl || undefined,
    heroImageUrl: site.heroImageUrl || undefined,
    phone: site.phone || undefined,
    email: site.email,
    city: site.city || undefined,
  });

  await updateJobProgress(jobId, 75, "Publishing site to storage...");
  const { previewUrl } = await publishSiteBundle(site.siteId, bundle);

  await updateJobProgress(jobId, 90, "Updating site record...");
  await db
    .update(generatedSites)
    .set({
      previewUrl,
      status: "preview_ready",
      buildState: "completed",
      updatedAt: new Date(),
    })
    .where(eq(generatedSites.id, siteId));

  logger.info("SiteGenWorker", `Site ${siteId} preview ready at ${previewUrl}`);
}

async function processJob(job: typeof siteGenerationJobs.$inferSelect): Promise<void> {
  const jobId = job.id;
  const currentAttempts = (job.attempts || 0) + 1;

  await db
    .update(siteGenerationJobs)
    .set({
      status: "running",
      startedAt: new Date(),
      attempts: currentAttempts,
      updatedAt: new Date(),
    })
    .where(eq(siteGenerationJobs.id, jobId));

  try {
    if (job.type === "generate_preview_site") {
      if (!job.siteId) {
        throw new Error("Missing siteId for generate_preview_site job");
      }
      await processGeneratePreviewSite(jobId, job.siteId);
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }

    await markJobComplete(jobId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("SiteGenWorker", `Job ${jobId} failed`, {
      error: errorMessage,
      attempt: currentAttempts,
    });
    await markJobFailed(jobId, errorMessage, currentAttempts);
  }
}

async function pollForJobs(): Promise<void> {
  if (!isRunning) return;

  try {
    const now = new Date();
    const jobs = await db
      .select()
      .from(siteGenerationJobs)
      .where(
        and(
          eq(siteGenerationJobs.status, "queued"),
          lte(siteGenerationJobs.runAfter, now)
        )
      )
      .orderBy(asc(siteGenerationJobs.createdAt))
      .limit(1);

    if (jobs.length > 0) {
      const job = jobs[0];
      logger.info("SiteGenWorker", `Found job ${job.id} to process`, { type: job.type });
      await processJob(job);
    }
  } catch (error) {
    logger.error("SiteGenWorker", "Error polling for jobs", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (isRunning) {
    pollTimeout = setTimeout(pollForJobs, POLL_INTERVAL_MS);
  }
}

export function startWorker(): void {
  if (isRunning) {
    logger.warn("SiteGenWorker", "Worker already running");
    return;
  }

  isRunning = true;
  logger.info("SiteGenWorker", "Starting site generation worker", {
    pollInterval: POLL_INTERVAL_MS,
    maxAttempts: MAX_ATTEMPTS,
  });

  pollForJobs();
}

export function stopWorker(): void {
  isRunning = false;
  if (pollTimeout) {
    clearTimeout(pollTimeout);
    pollTimeout = null;
  }
  logger.info("SiteGenWorker", "Worker stopped");
}
