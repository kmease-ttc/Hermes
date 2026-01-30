import type { Pool } from "pg";

export interface AgentRunConfig {
  scanId: string;
  crewId: string;      // scotty, speedster, lookout, natasha, atlas
  agentStep: string;    // technical_crawl, cwv, serp, competitive, atlas_ai
  scanMode: "light" | "full";
}

export interface AgentResult<T = unknown> {
  result: T | null;
  error: string | null;
  durationMs: number;
  runId: number;
  status: "completed" | "failed" | "skipped";
}

/**
 * Wraps an agent execution function with DB tracking in agent_runs.
 * Records start time, completion/failure, duration, and optional summary.
 */
export async function runAgent<T>(
  config: AgentRunConfig,
  pool: Pool,
  fn: () => Promise<T>,
  opts?: { rowsWritten?: number; resultSummary?: Record<string, unknown> }
): Promise<AgentResult<T>> {
  const startTime = Date.now();

  // Insert agent_runs row with status=running
  const insertRes = await pool.query(
    `INSERT INTO agent_runs (scan_id, crew_id, agent_step, status, scan_mode, started_at)
     VALUES ($1, $2, $3, 'running', $4, NOW())
     RETURNING id`,
    [config.scanId, config.crewId, config.agentStep, config.scanMode]
  );
  const runId = insertRes.rows[0].id as number;

  console.log(
    `[AgentRun] agent_started { scanId: "${config.scanId}", crewId: "${config.crewId}", agentStep: "${config.agentStep}", scanMode: "${config.scanMode}" }`
  );

  try {
    const result = await fn();
    const durationMs = Date.now() - startTime;

    await pool.query(
      `UPDATE agent_runs
       SET status = 'completed', completed_at = NOW(), duration_ms = $1, rows_written = $2, result_summary = $3
       WHERE id = $4`,
      [durationMs, opts?.rowsWritten ?? 0, JSON.stringify(opts?.resultSummary ?? null), runId]
    );

    console.log(
      `[AgentRun] agent_completed { scanId: "${config.scanId}", crewId: "${config.crewId}", durationMs: ${durationMs}, rowsWritten: ${opts?.rowsWritten ?? 0} }`
    );

    return { result, error: null, durationMs, runId, status: "completed" };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    await pool.query(
      `UPDATE agent_runs
       SET status = 'failed', completed_at = NOW(), duration_ms = $1, error_message = $2
       WHERE id = $3`,
      [durationMs, errorMessage, runId]
    );

    console.error(
      `[AgentRun] agent_failed { scanId: "${config.scanId}", crewId: "${config.crewId}", durationMs: ${durationMs}, error: "${errorMessage}" }`
    );

    return { result: null, error: errorMessage, durationMs, runId, status: "failed" };
  }
}

/**
 * Marks an agent as skipped (e.g. when Natasha env vars are not configured).
 */
export async function skipAgent(
  config: AgentRunConfig,
  pool: Pool,
  reason: string
): Promise<AgentResult<null>> {
  const insertRes = await pool.query(
    `INSERT INTO agent_runs (scan_id, crew_id, agent_step, status, scan_mode, started_at, completed_at, duration_ms, error_message)
     VALUES ($1, $2, $3, 'skipped', $4, NOW(), NOW(), 0, $5)
     RETURNING id`,
    [config.scanId, config.crewId, config.agentStep, config.scanMode, reason]
  );
  const runId = insertRes.rows[0].id as number;

  console.log(
    `[AgentRun] agent_skipped { scanId: "${config.scanId}", crewId: "${config.crewId}", reason: "${reason}" }`
  );

  return { result: null, error: null, durationMs: 0, runId, status: "skipped" };
}

/**
 * After all agents complete, builds the agent_summary object
 * and updates scan_requests with it.
 */
export async function finalizeAgentSummary(
  scanId: string,
  pool: Pool
): Promise<{ agents_run: number; completed: number; failed: number; skipped: number }> {
  const res = await pool.query(
    `SELECT status, COUNT(*)::int as count FROM agent_runs WHERE scan_id = $1 GROUP BY status`,
    [scanId]
  );

  const counts: Record<string, number> = {};
  for (const row of res.rows) {
    counts[row.status] = row.count;
  }

  const summary = {
    agents_run: (counts.completed ?? 0) + (counts.failed ?? 0) + (counts.skipped ?? 0),
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    skipped: counts.skipped ?? 0,
  };

  await pool.query(
    `UPDATE scan_requests SET agent_summary = $1 WHERE scan_id = $2`,
    [JSON.stringify(summary), scanId]
  );

  console.log(
    `[ScanComplete] { scanId: "${scanId}", agentsRun: ${summary.agents_run}, completed: ${summary.completed}, failed: ${summary.failed}, skipped: ${summary.skipped} }`
  );

  return summary;
}
