export interface AgentFinding {
  label: string;
  value: string | number;
}

export interface AgentNextStep {
  step: 1 | 2 | 3;
  action: string;
  reason?: string;
}

export interface AgentInsight {
  agent_id: string;
  agent_name: string;
  role: string;
  watch_description: string;
  findings: AgentFinding[];
  last_run_at: string | null;
  next_steps: AgentNextStep[];
}

export const DEFAULT_NEXT_STEPS: AgentNextStep[] = [
  { step: 1, action: "Connect required credentials" },
  { step: 2, action: "Run first scan" },
  { step: 3, action: "Review results after completion" },
];

export function createFallbackInsight(
  agentId: string,
  agentName: string,
  role: string,
  watchDescription: string
): AgentInsight {
  return {
    agent_id: agentId,
    agent_name: agentName,
    role,
    watch_description: watchDescription,
    findings: [],
    last_run_at: null,
    next_steps: DEFAULT_NEXT_STEPS,
  };
}
