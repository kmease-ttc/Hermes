import { ReactNode } from "react";

export type WidgetState = "loading" | "ready" | "empty" | "unavailable";

export interface KpiDescriptor {
  id: string;
  label: string;
  value: string | number | null;
  delta?: number | null;
  deltaLabel?: string;
  deltaIsGood?: boolean;
  tooltip?: string;
  unit?: string;
  icon?: ReactNode;
  status?: WidgetState;
  sparklineData?: number[];
  trendIsGood?: "up" | "down";
}

export interface MissionItem {
  id: string;
  title: string;
  reason?: string;
  expectedOutcome?: string;
  status: "pending" | "in_progress" | "done" | "blocked";
  impact?: "high" | "medium" | "low";
  effort?: "S" | "M" | "L";
  agents?: string[];
  category?: string;
  actions?: MissionAction[];
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  meta?: Record<string, unknown>;
  completedAt?: string;
}

export interface CompletedAction {
  id: string;
  title: string;
  completedAt: string;
}

export interface MissionAction {
  id: string;
  label: string;
  variant?: "default" | "outline" | "ghost" | "gold";
  onClick?: () => void;
}

export interface MissionStatusState {
  tier: "looking_good" | "doing_okay" | "needs_attention";
  summaryLine: string;
  nextStep: string;
  priorityCount: number;
  blockerCount: number;
  missingIntegrations?: number;
  autoFixableCount: number;
  status?: WidgetState;
  score?: { value: number | null; status: 'ok' | 'unknown' };
  missions?: { open: number; total: number; completedThisWeek: number };
  pendingCount?: number;
}

export interface InspectorTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  state?: WidgetState;
  badge?: string | number;
}

export interface CrewIdentity {
  crewId: string;
  crewName: string;
  subtitle: string;
  description: string;
  avatar: ReactNode;
  accentColor: string;
  capabilities?: string[];
  monitors: string[];
}

export interface MissionPromptConfig {
  label: string;
  placeholder: string;
  onSubmit: (question: string) => void;
  isLoading?: boolean;
}

export interface HeaderAction {
  id: string;
  icon: ReactNode;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface CrewDashboardShellProps {
  crew: CrewIdentity;
  agentScore?: number | null;
  agentScoreTooltip?: string;
  missionStatus?: MissionStatusState;
  missions?: MissionItem[];
  recentlyCompleted?: CompletedAction | null;
  kpis?: KpiDescriptor[];
  customMetrics?: ReactNode;
  inspectorTabs: InspectorTab[];
  missionPrompt?: MissionPromptConfig;
  headerActions?: HeaderAction[];
  onRefresh?: () => void;
  onSettings?: () => void;
  onFixEverything?: () => void;
  onViewAllMissions?: () => void;
  isRefreshing?: boolean;
  isError?: boolean;
  dataUpdatedAt?: number;
  children?: ReactNode;
}
