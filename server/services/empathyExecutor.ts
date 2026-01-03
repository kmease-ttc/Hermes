import { logger } from "../utils/logger";

const EMPATHY_BASE_URL = process.env.EMPATHY_BASE_URL?.replace(/\/$/, "") || "";
const EMPATHY_API_KEY = process.env.EMPATHY_API_KEY || "";

export interface FileChange {
  file: string;
  operation: "replace" | "overwrite" | "append" | "insert_before" | "insert_after";
  find?: string;
  replace_with?: string;
  content?: string;
  position?: string;
}

export interface ApplyChangesRequest {
  changes: FileChange[];
  dry_run: boolean;
}

export interface FileResult {
  file: string;
  status: "updated" | "skipped" | "failed" | "would_update";
  reason?: string;
  changes_made?: number;
}

export interface ApplyChangesResponse {
  ok: boolean;
  dry_run: boolean;
  results: FileResult[];
  summary: {
    total: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  error?: string;
}

export class EmpathyExecutorError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = "EmpathyExecutorError";
  }
}

export async function getEmpathyConfig(): Promise<{
  configured: boolean;
  baseUrl: string;
  hasApiKey: boolean;
}> {
  return {
    configured: !!EMPATHY_BASE_URL,
    baseUrl: EMPATHY_BASE_URL,
    hasApiKey: !!EMPATHY_API_KEY,
  };
}

export async function pushChangesToEmpathy(
  changes: FileChange[],
  dryRun: boolean = false,
  timeoutMs: number = 30000
): Promise<ApplyChangesResponse> {
  if (!EMPATHY_BASE_URL) {
    throw new EmpathyExecutorError("Missing EMPATHY_BASE_URL environment variable");
  }

  const url = `${EMPATHY_BASE_URL}/apply-changes`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (EMPATHY_API_KEY) {
    headers["X-API-Key"] = EMPATHY_API_KEY;
  }

  const payload: ApplyChangesRequest = {
    changes,
    dry_run: dryRun,
  };

  logger.info("EmpathyExecutor", `Sending ${changes.length} change(s) to Empathy (dry_run=${dryRun})`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();

    if (!response.ok) {
      logger.error("EmpathyExecutor", `Empathy apply-changes failed: ${response.status}`);
      throw new EmpathyExecutorError(
        `Empathy apply-changes failed with status ${response.status}`,
        response.status,
        responseText
      );
    }

    let result: ApplyChangesResponse;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      logger.error("EmpathyExecutor", "Failed to parse Empathy response as JSON");
      throw new EmpathyExecutorError(
        "Invalid response from Empathy server - not valid JSON",
        response.status,
        responseText
      );
    }

    if (!result.ok && result.error) {
      throw new EmpathyExecutorError(
        `Empathy returned error: ${result.error}`,
        response.status,
        responseText
      );
    }

    logger.info("EmpathyExecutor", `Empathy response: ${result.summary?.updated || 0} updated, ${result.summary?.skipped || 0} skipped, ${result.summary?.failed || 0} failed`);
    
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof EmpathyExecutorError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new EmpathyExecutorError(`Request to Empathy timed out after ${timeoutMs}ms`);
    }

    throw new EmpathyExecutorError(
      `Failed to connect to Empathy: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function testEmpathyConnection(): Promise<{
  ok: boolean;
  message: string;
  latencyMs?: number;
}> {
  if (!EMPATHY_BASE_URL) {
    return {
      ok: false,
      message: "EMPATHY_BASE_URL not configured",
    };
  }

  const startTime = Date.now();

  try {
    const result = await pushChangesToEmpathy([], true);
    const latencyMs = Date.now() - startTime;
    
    return {
      ok: result.ok,
      message: "Connection successful",
      latencyMs,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
