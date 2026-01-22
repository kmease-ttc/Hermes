import { storage } from "../storage";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

export type AgentEventType =
  | "run_started"
  | "run_inputs"
  | "run_outputs"
  | "recommendations_emitted"
  | "run_error"
  | "run_completed";

export interface AgentEventPayload {
  runId?: string;
  domain?: string;
  workerKey?: string;
  durationMs?: number;
  metrics?: Record<string, any>;
  suggestionsCount?: number;
  insightsCount?: number;
  ticketsCount?: number;
  errorCode?: string;
  errorDetail?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  recommendations?: Array<{
    id: string;
    type: string;
    title: string;
    severity: string;
  }>;
  status?: "success" | "failed" | "timeout" | "skipped" | "partial" | "complete";
  [key: string]: any;
}

export async function logAgentEvent(
  siteId: string,
  agentId: string,
  eventType: AgentEventType,
  payload?: AgentEventPayload
): Promise<void> {
  const actionId = `${eventType}_${uuidv4()}`;
  const now = new Date();

  try {
    await storage.createAgentActionLog({
      actionId,
      agentId,
      siteId,
      env: process.env.NODE_ENV === "production" ? "prod" : "dev",
      timestampStart: now,
      timestampEnd: eventType === "run_completed" || eventType === "run_error" ? now : undefined,
      actionType: eventType,
      runId: payload?.runId,
      targets: payload?.inputs || undefined,
      expectedImpact: payload?.metrics || payload?.outputs || undefined,
      notes: payload?.errorDetail || undefined,
      riskLevel: eventType === "run_error" ? "high" : "low",
    });

    logger.debug("SocratesLogger", `Logged ${eventType} for ${agentId}`, {
      siteId,
      runId: payload?.runId,
    });
  } catch (error: any) {
    logger.error("SocratesLogger", `Failed to log ${eventType}`, {
      agentId,
      siteId,
      error: error.message,
    });
  }
}

export async function logRunStarted(
  siteId: string,
  agentId: string,
  runId: string,
  inputs: Record<string, any>
): Promise<void> {
  await logAgentEvent(siteId, agentId, "run_started", {
    runId,
    inputs,
  });
}

export async function logRunInputs(
  siteId: string,
  agentId: string,
  runId: string,
  inputs: Record<string, any>
): Promise<void> {
  await logAgentEvent(siteId, agentId, "run_inputs", {
    runId,
    inputs,
  });
}

export async function logRunOutputs(
  siteId: string,
  agentId: string,
  runId: string,
  outputs: Record<string, any>
): Promise<void> {
  await logAgentEvent(siteId, agentId, "run_outputs", {
    runId,
    outputs,
  });
}

export async function logRecommendationsEmitted(
  siteId: string,
  agentId: string,
  runId: string,
  recommendations: Array<{ id: string; type: string; title: string; severity: string }>
): Promise<void> {
  await logAgentEvent(siteId, agentId, "recommendations_emitted", {
    runId,
    recommendations,
    suggestionsCount: recommendations.length,
  });
}

export async function logRunError(
  siteId: string,
  agentId: string,
  runId: string,
  errorCode: string,
  errorDetail: string
): Promise<void> {
  await logAgentEvent(siteId, agentId, "run_error", {
    runId,
    errorCode,
    errorDetail,
    status: "failed",
  });
}

export async function logRunCompleted(
  siteId: string,
  agentId: string,
  runId: string,
  status: "success" | "partial" | "complete",
  metrics: Record<string, any>
): Promise<void> {
  await logAgentEvent(siteId, agentId, "run_completed", {
    runId,
    status,
    metrics,
  });
}

export const socratesLogger = {
  logAgentEvent,
  logRunStarted,
  logRunInputs,
  logRunOutputs,
  logRecommendationsEmitted,
  logRunError,
  logRunCompleted,
};
