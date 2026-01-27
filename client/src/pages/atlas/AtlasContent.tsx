import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getCrewMember } from "@/config/agents";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { toast } from "sonner";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type InspectorTab,
  type HeaderAction,
} from "@/components/crew-dashboard";
import { KeyMetricsGrid } from "@/components/key-metrics";
import { CrewPageLayout } from "@/components/crew/CrewPageLayout";
import { NoDeadEndsState, TableEmptyState, ChartEmptyState } from "@/components/empty-states";
import type { MetaStatus, RemediationAction } from "@shared/noDeadEnds";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Info,
  Search,
  BarChart3,
  Play,
  Sparkles,
  BrainCircuit,
  Database,
  Users,
  MessageCircle,
  FileCheck,
  Building2,
  MapPin,
  Stethoscope,
  Shield,
  HelpCircle,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ATLAS_ACCENT_COLOR = "#D946EF";

interface AtlasMetrics {
  aiVisibilityScore: number;
  structuredDataCoverage: number;
  entityCoverage: number;
  llmAnswerability: number;
  lastScanAt: string | null;
  isConfigured: boolean;
}

interface AtlasFinding {
  id: string;
  url: string;
  findingType: string;
  severity: "critical" | "warning" | "info";
  category: string;
  description: string;
  impactEstimate: string;
  recommendedAction: string;
  fixAction?: string;
  isAutoFixable: boolean;
}

interface StructuredDataItem {
  url: string;
  schemaTypes: string[];
  validationStatus: "valid" | "errors" | "warnings";
  errors: string[];
  warnings: string[];
}

interface EntityItem {
  url: string;
  entityType: "clinic" | "provider" | "service" | "location" | "insurance";
  status: "complete" | "partial" | "missing";
  issues: string[];
}

interface SummaryItem {
  url: string;
  hasSummary: boolean;
  length: number;
  hasEntities: boolean;
  issues: string[];
}

interface LlmVisibilityItem {
  question: string;
  bestUrl: string;
  confidenceScore: number;
  canAnswer: boolean;
}

interface AtlasTrendDataPoint {
  date: string;
  aiVisibilityScore: number;
  structuredDataCoverage: number;
  entityCoverage: number;
  llmAnswerability: number;
}

interface AtlasData {
  metrics: AtlasMetrics;
  findings: AtlasFinding[];
  structuredData: StructuredDataItem[];
  entities: EntityItem[];
  summaries: SummaryItem[];
  llmVisibility: LlmVisibilityItem[];
  trends: AtlasTrendDataPoint[];
}

const MOCK_ATLAS_DATA: AtlasData = {
  metrics: {
    aiVisibilityScore: 68,
    structuredDataCoverage: 72,
    entityCoverage: 65,
    llmAnswerability: 58,
    lastScanAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isConfigured: true,
  },
  findings: [
    {
      id: "1",
      url: "/services/therapy",
      findingType: "Missing Schema",
      severity: "critical",
      category: "Structured Data",
      description: "No LocalBusiness or MedicalBusiness schema found",
      impactEstimate: "High - AI assistants cannot identify your business type",
      recommendedAction: "Add LocalBusiness or MedicalBusiness schema markup",
      fixAction: "add_schema",
      isAutoFixable: true,
    },
    {
      id: "2",
      url: "/about/team",
      findingType: "Incomplete Entity",
      severity: "critical",
      category: "Entity Optimization",
      description: "Provider entities missing credentials and specializations",
      impactEstimate: "High - LLMs cannot accurately describe your team",
      recommendedAction: "Add Person schema with credentials, education, and specializations",
      fixAction: "enhance_entity",
      isAutoFixable: true,
    },
    {
      id: "3",
      url: "/blog/anxiety-guide",
      findingType: "Missing AI Summary",
      severity: "warning",
      category: "LLM Visibility",
      description: "Page lacks structured summary for AI consumption",
      impactEstimate: "Medium - Reduces chance of being cited by AI assistants",
      recommendedAction: "Add FAQ schema or structured summary section",
      fixAction: "add_summary",
      isAutoFixable: true,
    },
    {
      id: "4",
      url: "/services/counseling",
      findingType: "Schema Validation Error",
      severity: "warning",
      category: "Structured Data",
      description: "Service schema missing required 'provider' field",
      impactEstimate: "Medium - Incomplete data may be ignored by AI",
      recommendedAction: "Add provider reference to Service schema",
      fixAction: "fix_schema",
      isAutoFixable: true,
    },
    {
      id: "5",
      url: "/locations/downtown",
      findingType: "Inconsistent NAP",
      severity: "warning",
      category: "Entity Optimization",
      description: "Address format differs from other location pages",
      impactEstimate: "Medium - Inconsistency may confuse AI location understanding",
      recommendedAction: "Standardize address format across all location pages",
      fixAction: "standardize_entity",
      isAutoFixable: false,
    },
    {
      id: "6",
      url: "/insurance",
      findingType: "Unstructured Content",
      severity: "info",
      category: "LLM Visibility",
      description: "Insurance list not marked up for easy parsing",
      impactEstimate: "Low - AI may miss some accepted insurances",
      recommendedAction: "Add ItemList schema for insurance providers",
      fixAction: "add_list_schema",
      isAutoFixable: true,
    },
    {
      id: "7",
      url: "/faq",
      findingType: "Partial FAQ Schema",
      severity: "info",
      category: "Structured Data",
      description: "Only 3 of 12 FAQs have proper schema markup",
      impactEstimate: "Low - Missing FAQ answers for AI citation",
      recommendedAction: "Extend FAQPage schema to cover all questions",
      fixAction: "extend_schema",
      isAutoFixable: true,
    },
  ],
  structuredData: [
    {
      url: "/",
      schemaTypes: ["Organization", "WebSite"],
      validationStatus: "valid",
      errors: [],
      warnings: [],
    },
    {
      url: "/services/therapy",
      schemaTypes: [],
      validationStatus: "errors",
      errors: ["Missing required schema for service page"],
      warnings: [],
    },
    {
      url: "/about/team",
      schemaTypes: ["Person"],
      validationStatus: "warnings",
      errors: [],
      warnings: ["Missing credentials property", "Missing alumniOf property"],
    },
    {
      url: "/locations/downtown",
      schemaTypes: ["LocalBusiness", "Place"],
      validationStatus: "valid",
      errors: [],
      warnings: [],
    },
    {
      url: "/services/counseling",
      schemaTypes: ["Service"],
      validationStatus: "errors",
      errors: ["Missing provider field"],
      warnings: ["Recommended: Add areaServed"],
    },
    {
      url: "/faq",
      schemaTypes: ["FAQPage"],
      validationStatus: "warnings",
      errors: [],
      warnings: ["Only 3/12 questions marked up"],
    },
  ],
  entities: [
    { url: "/about/team", entityType: "provider", status: "partial", issues: ["Missing credentials", "Missing specialization"] },
    { url: "/locations/downtown", entityType: "location", status: "complete", issues: [] },
    { url: "/locations/westside", entityType: "location", status: "complete", issues: [] },
    { url: "/services/therapy", entityType: "service", status: "missing", issues: ["No service schema found"] },
    { url: "/services/counseling", entityType: "service", status: "partial", issues: ["Missing provider reference"] },
    { url: "/insurance", entityType: "insurance", status: "partial", issues: ["List not structured"] },
    { url: "/", entityType: "clinic", status: "complete", issues: [] },
  ],
  summaries: [
    { url: "/blog/anxiety-guide", hasSummary: false, length: 0, hasEntities: false, issues: ["No structured summary"] },
    { url: "/blog/depression-help", hasSummary: true, length: 150, hasEntities: true, issues: [] },
    { url: "/services/therapy", hasSummary: false, length: 0, hasEntities: false, issues: ["No summary section"] },
    { url: "/faq", hasSummary: true, length: 85, hasEntities: false, issues: ["Entities not linked"] },
    { url: "/about", hasSummary: true, length: 120, hasEntities: true, issues: [] },
  ],
  llmVisibility: [
    { question: "What therapy services do you offer?", bestUrl: "/services/therapy", confidenceScore: 45, canAnswer: false },
    { question: "Who are the therapists at your clinic?", bestUrl: "/about/team", confidenceScore: 62, canAnswer: true },
    { question: "What insurance do you accept?", bestUrl: "/insurance", confidenceScore: 38, canAnswer: false },
    { question: "Where are you located?", bestUrl: "/locations/downtown", confidenceScore: 92, canAnswer: true },
    { question: "Do you offer online therapy?", bestUrl: "/services/telehealth", confidenceScore: 78, canAnswer: true },
    { question: "What are your hours?", bestUrl: "/contact", confidenceScore: 85, canAnswer: true },
  ],
  trends: [
    { date: "2025-12-27", aiVisibilityScore: 58, structuredDataCoverage: 62, entityCoverage: 55, llmAnswerability: 48 },
    { date: "2025-12-28", aiVisibilityScore: 60, structuredDataCoverage: 64, entityCoverage: 58, llmAnswerability: 50 },
    { date: "2025-12-29", aiVisibilityScore: 62, structuredDataCoverage: 66, entityCoverage: 60, llmAnswerability: 52 },
    { date: "2025-12-30", aiVisibilityScore: 64, structuredDataCoverage: 68, entityCoverage: 62, llmAnswerability: 54 },
    { date: "2025-12-31", aiVisibilityScore: 66, structuredDataCoverage: 70, entityCoverage: 64, llmAnswerability: 56 },
    { date: "2026-01-01", aiVisibilityScore: 67, structuredDataCoverage: 71, entityCoverage: 64, llmAnswerability: 57 },
    { date: "2026-01-02", aiVisibilityScore: 68, structuredDataCoverage: 72, entityCoverage: 65, llmAnswerability: 58 },
  ],
};

interface AtlasApiResult {
  data: AtlasData | null;
  isPreviewMode: boolean;
  errorStatus: number | null;
}

function getAtlasMeta(result: AtlasApiResult): MetaStatus {
  if (result.errorStatus === 401 || result.errorStatus === 403) {
    return {
      status: "needs_setup",
      reasonCode: "ATLAS_WORKER_NOT_CONNECTED",
      userMessage: "Connect Atlas worker to see AI optimization insights",
      developerMessage: "API key required for /api/atlas/data endpoint",
      actions: [
        { id: "configure", label: "Configure Atlas", kind: "route", route: "/settings/integrations", priority: 1 },
        { id: "docs", label: "View Setup Guide", kind: "href", href: "#atlas-setup", priority: 2 },
      ],
    };
  }
  if (result.errorStatus) {
    return {
      status: "error",
      reasonCode: "ATLAS_API_ERROR",
      userMessage: "Failed to load Atlas data. Please try again.",
      developerMessage: `API returned status ${result.errorStatus}`,
      actions: [
        { id: "retry", label: "Retry", kind: "retry", priority: 1 },
        { id: "view_logs", label: "View Logs", kind: "view_logs", priority: 2 },
      ],
    };
  }
  if (!result.data || (result.data as any).status === "stub") {
    return {
      status: "empty",
      reasonCode: "NO_ATLAS_DATA",
      userMessage: "No AI optimization data yet. Run an Atlas scan to get started.",
      actions: [
        { id: "run_scan", label: "Run Atlas Scan", kind: "run_scan", priority: 1 },
      ],
    };
  }
  return { status: "ok", reasonCode: "SUCCESS", userMessage: "Data loaded", actions: [] };
}

function getSeverityColor(severity: "critical" | "warning" | "info"): string {
  switch (severity) {
    case "critical":
      return "bg-semantic-danger-soft border-semantic-danger-border";
    case "warning":
      return "bg-semantic-warning-soft border-semantic-warning-border";
    case "info":
      return "bg-semantic-info-soft border-semantic-info-border";
    default:
      return "bg-muted/50 border-muted";
  }
}

function getSeverityIcon(severity: "critical" | "warning" | "info") {
  switch (severity) {
    case "critical":
      return <XCircle className="w-4 h-4 text-semantic-danger" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-semantic-warning" />;
    case "info":
      return <Info className="w-4 h-4 text-semantic-info" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />;
  }
}

function getValidationBadge(status: "valid" | "errors" | "warnings") {
  switch (status) {
    case "valid":
      return <Badge className="bg-semantic-success-soft text-semantic-success border-semantic-success-border">Valid</Badge>;
    case "errors":
      return <Badge className="bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border">Errors</Badge>;
    case "warnings":
      return <Badge className="bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border">Warnings</Badge>;
  }
}

function getEntityStatusBadge(status: "complete" | "partial" | "missing") {
  switch (status) {
    case "complete":
      return <Badge className="bg-semantic-success-soft text-semantic-success border-semantic-success-border">Complete</Badge>;
    case "partial":
      return <Badge className="bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border">Partial</Badge>;
    case "missing":
      return <Badge className="bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border">Missing</Badge>;
  }
}

function getEntityIcon(entityType: string) {
  switch (entityType) {
    case "clinic":
      return <Building2 className="w-4 h-4" />;
    case "provider":
      return <Users className="w-4 h-4" />;
    case "service":
      return <Stethoscope className="w-4 h-4" />;
    case "location":
      return <MapPin className="w-4 h-4" />;
    case "insurance":
      return <Shield className="w-4 h-4" />;
    default:
      return <Database className="w-4 h-4" />;
  }
}

function FindingsTable({
  findings,
  onFix,
  fixingIssueId,
}: {
  findings: AtlasFinding[];
  onFix: (finding: AtlasFinding) => void;
  fixingIssueId: string | null;
}) {
  const groupedFindings = useMemo(() => {
    const critical = findings.filter(f => f.severity === "critical");
    const warning = findings.filter(f => f.severity === "warning");
    const info = findings.filter(f => f.severity === "info");
    return { critical, warning, info };
  }, [findings]);

  const renderGroup = (
    title: string,
    icon: React.ReactNode,
    items: AtlasFinding[],
    description: string
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-semibold text-sm">{title}</h4>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
          <span className="text-xs text-muted-foreground ml-auto">{description}</span>
        </div>
        <div className="space-y-2">
          {items.map((finding) => (
            <div
              key={finding.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                getSeverityColor(finding.severity)
              )}
              data-testid={`finding-${finding.id}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getSeverityIcon(finding.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">{finding.findingType}</span>
                    <Badge variant="outline" className="text-xs">{finding.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{finding.url}</p>
                  <p className="text-xs text-muted-foreground mt-1">{finding.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">Impact: {finding.impactEstimate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Info className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-sm">{finding.recommendedAction}</p>
                  </TooltipContent>
                </Tooltip>
                {finding.isAutoFixable ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onFix(finding)}
                    disabled={fixingIssueId === finding.id}
                    data-testid={`button-fix-${finding.id}`}
                  >
                    {fixingIssueId === finding.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 mr-1" />
                        Fix
                      </>
                    )}
                  </Button>
                ) : (
                  <Badge variant="secondary" className="text-xs">Manual</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderGroup(
        "Critical",
        <XCircle className="w-4 h-4 text-semantic-danger" />,
        groupedFindings.critical,
        "Major AI visibility issues - fix immediately"
      )}
      {renderGroup(
        "Warning",
        <AlertTriangle className="w-4 h-4 text-semantic-warning" />,
        groupedFindings.warning,
        "Moderate issues affecting discoverability"
      )}
      {renderGroup(
        "Info",
        <Info className="w-4 h-4 text-semantic-info" />,
        groupedFindings.info,
        "Opportunities for improvement"
      )}
      {findings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-semantic-success mb-3" />
          <p className="font-medium">All AI optimization checks passed</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run Atlas scan to check for new issues.
          </p>
        </div>
      )}
    </div>
  );
}

function StructuredDataTable({ items }: { items: StructuredDataItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
          data-testid={`structured-data-${i}`}
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Database className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.url}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.schemaTypes.length > 0 ? (
                  item.schemaTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">{type}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No schemas found</span>
                )}
              </div>
              {item.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {item.errors.map((err, j) => (
                    <p key={j} className="text-xs text-semantic-danger">• {err}</p>
                  ))}
                </div>
              )}
              {item.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {item.warnings.map((warn, j) => (
                    <p key={j} className="text-xs text-semantic-warning">• {warn}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="ml-4">
            {getValidationBadge(item.validationStatus)}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Database className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No structured data analyzed yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run Atlas scan to analyze structured data.
          </p>
        </div>
      )}
    </div>
  );
}

function EntityTable({ items }: { items: EntityItem[] }) {
  const groupedByType = useMemo(() => {
    const groups: Record<string, EntityItem[]> = {};
    items.forEach((item) => {
      if (!groups[item.entityType]) groups[item.entityType] = [];
      groups[item.entityType].push(item);
    });
    return groups;
  }, [items]);

  return (
    <div className="space-y-6">
      {Object.entries(groupedByType).map(([entityType, entities]) => (
        <div key={entityType} className="space-y-3">
          <div className="flex items-center gap-2">
            {getEntityIcon(entityType)}
            <h4 className="font-semibold text-sm capitalize">{entityType}s</h4>
            <Badge variant="secondary" className="text-xs">{entities.length}</Badge>
          </div>
          <div className="space-y-2">
            {entities.map((entity, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                data-testid={`entity-${entityType}-${i}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entity.url}</p>
                    {entity.issues.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {entity.issues.map((issue, j) => (
                          <p key={j} className="text-xs text-muted-foreground">• {issue}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  {getEntityStatusBadge(entity.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No entities analyzed yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run Atlas scan to analyze entity coverage.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryTable({ items }: { items: SummaryItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
          data-testid={`summary-${i}`}
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.url}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {item.hasSummary ? (
                    <CheckCircle2 className="w-3 h-3 text-semantic-success" />
                  ) : (
                    <XCircle className="w-3 h-3 text-semantic-danger" />
                  )}
                  Summary
                </span>
                {item.hasSummary && (
                  <span>{item.length} chars</span>
                )}
                <span className="flex items-center gap-1">
                  {item.hasEntities ? (
                    <CheckCircle2 className="w-3 h-3 text-semantic-success" />
                  ) : (
                    <XCircle className="w-3 h-3 text-semantic-danger" />
                  )}
                  Entities
                </span>
              </div>
              {item.issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {item.issues.map((issue, j) => (
                    <p key={j} className="text-xs text-semantic-warning">• {issue}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="ml-4">
            {item.hasSummary && item.hasEntities ? (
              <Badge className="bg-semantic-success-soft text-semantic-success border-semantic-success-border">Ready</Badge>
            ) : item.hasSummary ? (
              <Badge className="bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border">Partial</Badge>
            ) : (
              <Badge className="bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border">Missing</Badge>
            )}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No AI summaries analyzed yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run Atlas scan to analyze AI summary coverage.
          </p>
        </div>
      )}
    </div>
  );
}

function LlmVisibilityTable({ items }: { items: LlmVisibilityItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
          data-testid={`llm-visibility-${i}`}
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <HelpCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">"{item.question}"</p>
              <p className="text-xs text-muted-foreground mt-1">
                Best match: <span className="font-mono">{item.bestUrl}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <div className="flex items-center gap-2">
              <Progress 
                value={item.confidenceScore} 
                className="w-16 h-2"
              />
              <span className="text-xs font-medium w-8">{item.confidenceScore}%</span>
            </div>
            {item.canAnswer ? (
              <Badge className="bg-semantic-success-soft text-semantic-success border-semantic-success-border">Can Answer</Badge>
            ) : (
              <Badge className="bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border">Cannot Answer</Badge>
            )}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BrainCircuit className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No LLM visibility tests yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run Atlas scan to test LLM answerability.
          </p>
        </div>
      )}
    </div>
  );
}

function TrendChart({
  data,
  dataKey,
  label,
  color,
}: {
  data: AtlasTrendDataPoint[];
  dataKey: keyof AtlasTrendDataPoint;
  label: string;
  color: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold mb-3 text-muted-foreground">—</div>
        <div className="flex items-center justify-center h-12 text-xs text-muted-foreground">
          Run Atlas scan to start tracking
        </div>
      </div>
    );
  }

  const values = data.map(d => d[dataKey] as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const latest = values[values.length - 1];
  const previous = values.length > 1 ? values[values.length - 2] : latest;
  const trend = latest - previous;
  const trendIsGood = trend > 0;

  return (
    <div className="p-4 rounded-lg border bg-card/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {values.length > 1 && trend !== 0 && (
            <>
              {trendIsGood ? (
                <TrendingUp className="w-3 h-3 text-semantic-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-semantic-danger" />
              )}
              <span className={cn(
                "text-xs font-medium",
                trendIsGood ? "text-semantic-success" : "text-semantic-danger"
              )}>
                {trend > 0 ? "+" : ""}{trend.toFixed(0)}%
              </span>
            </>
          )}
        </div>
      </div>
      <div className="text-2xl font-bold mb-3">{latest}%</div>
      <div className="flex items-end gap-1 h-12">
        {values.map((value, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all hover:opacity-80"
            style={{
              height: `${((value - min) / range) * 100}%`,
              minHeight: "4px",
              backgroundColor: color,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">{data[0]?.date?.slice(5) || ""}</span>
        <span className="text-xs text-muted-foreground">{data[data.length - 1]?.date?.slice(5) || ""}</span>
      </div>
    </div>
  );
}

export default function AtlasContent() {
  const crew = getCrewMember("ai_optimization");
  const { activeSite } = useSiteContext();
  const siteId = activeSite?.id || "default";
  const { score: unifiedScore, isRefreshing: crewIsRefreshing, dataUpdatedAt: crewDataUpdatedAt } = useCrewStatus({ siteId, crewId: 'atlas' });
  const queryClient = useQueryClient();
  const [fixingIssue, setFixingIssue] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const { data: atlasResult, isLoading, refetch, isRefetching } = useQuery<AtlasApiResult>({
    queryKey: ["atlas-data", siteId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/atlas/data?site_id=${siteId}`);
        if (!res.ok) {
          return {
            data: null,
            isPreviewMode: true,
            errorStatus: res.status,
          };
        }
        const responseData = await res.json();
        return {
          data: responseData,
          isPreviewMode: false,
          errorStatus: null,
        };
      } catch {
        return {
          data: null,
          isPreviewMode: true,
          errorStatus: 500,
        };
      }
    },
    refetchInterval: 60000,
  });

  const atlasMeta = getAtlasMeta(atlasResult || { data: null, isPreviewMode: true, errorStatus: null });
  const isPreviewMode = atlasResult?.isPreviewMode ?? true;
  const showPreviewBanner = isPreviewMode && atlasMeta.status !== "ok";

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/atlas/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      if (!res.ok) throw new Error("Failed to start AI readiness scan");
      return res.json();
    },
    onSuccess: () => {
      toast.success("AI readiness scan started");
      queryClient.invalidateQueries({ queryKey: ["atlas-data"] });
    },
    onError: () => {
      toast.error("Failed to start scan");
    },
  });

  const fixStructuredDataMutation = useMutation({
    mutationFn: async (finding?: AtlasFinding) => {
      if (finding) setFixingIssue(finding.id);
      const res = await fetch(`/api/atlas/structured-data/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          finding_id: finding?.id,
          url: finding?.url,
          fix_action: finding?.fixAction,
          bulk: !finding,
        }),
      });
      if (!res.ok) throw new Error("Failed to fix structured data");
      return res.json();
    },
    onSuccess: (_, finding) => {
      toast.success(finding ? `Fixed: ${finding.findingType}` : "Bulk structured data fixes applied");
      queryClient.invalidateQueries({ queryKey: ["atlas-data"] });
    },
    onError: () => {
      toast.error("Failed to fix structured data");
    },
    onSettled: () => setFixingIssue(null),
  });

  const improveSummariesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/atlas/llm-summaries/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      if (!res.ok) throw new Error("Failed to improve LLM summaries");
      return res.json();
    },
    onSuccess: () => {
      toast.success("LLM summary improvements queued");
      queryClient.invalidateQueries({ queryKey: ["atlas-data"] });
    },
    onError: () => {
      toast.error("Failed to queue improvements");
    },
  });

  const optimizeEntitiesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/atlas/entities/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      if (!res.ok) throw new Error("Failed to optimize entities");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Entity optimization started");
      queryClient.invalidateQueries({ queryKey: ["atlas-data"] });
    },
    onError: () => {
      toast.error("Failed to optimize entities");
    },
  });

  const handleRemediationAction = (action: RemediationAction) => {
    switch (action.kind) {
      case "route":
        if (action.route) navigate(action.route);
        break;
      case "href":
        if (action.href) window.open(action.href, "_blank");
        break;
      case "retry":
        refetch();
        break;
      case "run_scan":
        scanMutation.mutate();
        break;
      case "view_logs":
        toast.info("Opening logs...");
        break;
      default:
        break;
    }
  };

  const hasRealData = atlasResult?.data && atlasMeta.status === "ok";
  const data = hasRealData ? atlasResult.data! : (isPreviewMode ? MOCK_ATLAS_DATA : null);
  const metrics = data?.metrics ?? { aiVisibilityScore: 0, structuredDataCoverage: 0, entityCoverage: 0, llmAnswerability: 0, lastScanAt: null, isConfigured: false };
  const findings = data?.findings ?? [];
  const structuredData = data?.structuredData ?? [];
  const entities = data?.entities ?? [];
  const summaries = data?.summaries ?? [];
  const llmVisibility = data?.llmVisibility ?? [];
  const trends = data?.trends ?? [];

  const Icon = crew?.icon || BrainCircuit;

  const crewIdentity: CrewIdentity = {
    crewId: "ai_optimization",
    crewName: crew?.nickname || "Atlas",
    subtitle: crew?.role || "AI Optimization",
    description: "Maximizes discoverability from AI assistants by ensuring content is LLM-friendly, structured data is complete, and entities are consistent.",
    avatar: <Icon className="w-6 h-6" style={{ color: ATLAS_ACCENT_COLOR }} />,
    accentColor: ATLAS_ACCENT_COLOR,
    capabilities: ["Schema Validation", "Entity Optimization", "AI Summaries", "LLM Visibility"],
    monitors: ["AI Visibility", "Structured Data", "Entity Coverage"],
  };

  const getAIVisibilityStatus = (score: number): "good" | "warning" | "neutral" => {
    if (score >= 75) return "good";
    if (score >= 50) return "warning";
    return "warning";
  };

  const getStructuredDataStatus = (coverage: number): "good" | "warning" | "neutral" => {
    if (coverage >= 80) return "good";
    if (coverage >= 50) return "warning";
    return "warning";
  };

  const getEntityCoverageStatus = (coverage: number): "good" | "warning" | "neutral" => {
    if (coverage >= 80) return "good";
    if (coverage >= 60) return "warning";
    return "warning";
  };

  const getLLMAnswerabilityStatus = (score: number): "good" | "warning" | "neutral" => {
    if (score >= 70) return "good";
    if (score >= 50) return "warning";
    return "warning";
  };

  const keyMetrics = useMemo(() => [
    {
      id: "ai-visibility-score",
      label: "AI Visibility Score",
      value: metrics.aiVisibilityScore,
      icon: BrainCircuit,
      status: getAIVisibilityStatus(metrics.aiVisibilityScore),
    },
    {
      id: "structured-data-coverage",
      label: "Structured Data Coverage",
      value: `${metrics.structuredDataCoverage}%`,
      icon: Database,
      status: getStructuredDataStatus(metrics.structuredDataCoverage),
    },
    {
      id: "entity-coverage",
      label: "Entity Coverage",
      value: `${metrics.entityCoverage}%`,
      icon: Users,
      status: getEntityCoverageStatus(metrics.entityCoverage),
    },
    {
      id: "llm-answerability",
      label: "LLM Answerability",
      value: `${metrics.llmAnswerability}%`,
      icon: MessageCircle,
      status: getLLMAnswerabilityStatus(metrics.llmAnswerability),
    },
  ], [metrics]);

  const criticalCount = findings.filter(f => f.severity === "critical").length;
  const warningCount = findings.filter(f => f.severity === "warning").length;
  const autoFixableCount = findings.filter(f => f.isAutoFixable).length;

  const handleFixFinding = (finding: AtlasFinding) => {
    fixStructuredDataMutation.mutate(finding);
  };

  const headerActions: HeaderAction[] = [
    {
      id: "refresh",
      icon: <RefreshCw className="w-4 h-4" />,
      tooltip: "Refresh data",
      onClick: () => refetch(),
      loading: isRefetching,
    },
    {
      id: "scan",
      icon: <Play className="w-4 h-4" />,
      tooltip: "Run AI readiness scan",
      onClick: () => scanMutation.mutate(),
      loading: scanMutation.isPending,
    },
  ];

  const tableEmptyMeta: MetaStatus = {
    status: "empty",
    reasonCode: "NO_DATA_YET",
    userMessage: "No data yet. Run an Atlas scan to analyze your site.",
    actions: [
      { id: "run_scan", label: "Run Atlas Scan", kind: "run_scan", priority: 1 },
    ],
  };

  const needsSetupForTable = atlasMeta.status === "needs_setup" && !isPreviewMode;

  const findingsTab: InspectorTab = {
    id: "findings",
    label: "Findings",
    icon: <AlertTriangle className="w-4 h-4" />,
    badge: findings.length || undefined,
    state: isLoading ? "loading" : findings.length > 0 ? "ready" : "empty",
    content: (
      <div className="p-4">
        {needsSetupForTable ? (
          <TableEmptyState
            meta={atlasMeta}
            title="Connect Atlas Worker"
            onAction={handleRemediationAction}
          />
        ) : findings.length === 0 && !isPreviewMode ? (
          <TableEmptyState
            meta={tableEmptyMeta}
            title="No Findings Yet"
            onAction={handleRemediationAction}
          />
        ) : (
          <FindingsTable
            findings={findings}
            onFix={handleFixFinding}
            fixingIssueId={fixingIssue}
          />
        )}
      </div>
    ),
  };

  const structuredDataTab: InspectorTab = {
    id: "structured-data",
    label: "Structured Data",
    icon: <Database className="w-4 h-4" />,
    badge: structuredData.filter(s => s.validationStatus !== "valid").length || undefined,
    state: isLoading ? "loading" : structuredData.length > 0 ? "ready" : "empty",
    content: (
      <div className="p-4">
        {needsSetupForTable ? (
          <TableEmptyState
            meta={atlasMeta}
            title="Connect Atlas Worker"
            onAction={handleRemediationAction}
          />
        ) : structuredData.length === 0 && !isPreviewMode ? (
          <TableEmptyState
            meta={tableEmptyMeta}
            title="No Structured Data Analyzed"
            onAction={handleRemediationAction}
          />
        ) : (
          <StructuredDataTable items={structuredData} />
        )}
      </div>
    ),
  };

  const entityTab: InspectorTab = {
    id: "entities",
    label: "Entity Optimization",
    icon: <Users className="w-4 h-4" />,
    badge: entities.filter(e => e.status !== "complete").length || undefined,
    state: isLoading ? "loading" : entities.length > 0 ? "ready" : "empty",
    content: (
      <div className="p-4">
        {needsSetupForTable ? (
          <TableEmptyState
            meta={atlasMeta}
            title="Connect Atlas Worker"
            onAction={handleRemediationAction}
          />
        ) : entities.length === 0 && !isPreviewMode ? (
          <TableEmptyState
            meta={tableEmptyMeta}
            title="No Entities Analyzed"
            onAction={handleRemediationAction}
          />
        ) : (
          <EntityTable items={entities} />
        )}
      </div>
    ),
  };

  const summaryTab: InspectorTab = {
    id: "summaries",
    label: "AI Summaries",
    icon: <MessageCircle className="w-4 h-4" />,
    badge: summaries.filter(s => !s.hasSummary).length || undefined,
    state: isLoading ? "loading" : summaries.length > 0 ? "ready" : "empty",
    content: (
      <div className="p-4">
        {needsSetupForTable ? (
          <TableEmptyState
            meta={atlasMeta}
            title="Connect Atlas Worker"
            onAction={handleRemediationAction}
          />
        ) : summaries.length === 0 && !isPreviewMode ? (
          <TableEmptyState
            meta={tableEmptyMeta}
            title="No AI Summaries Analyzed"
            onAction={handleRemediationAction}
          />
        ) : (
          <SummaryTable items={summaries} />
        )}
      </div>
    ),
  };

  const llmVisibilityTab: InspectorTab = {
    id: "llm-visibility",
    label: "LLM Visibility",
    icon: <BrainCircuit className="w-4 h-4" />,
    badge: llmVisibility.filter(l => !l.canAnswer).length || undefined,
    state: isLoading ? "loading" : llmVisibility.length > 0 ? "ready" : "empty",
    content: (
      <div className="p-4">
        {needsSetupForTable ? (
          <TableEmptyState
            meta={atlasMeta}
            title="Connect Atlas Worker"
            onAction={handleRemediationAction}
          />
        ) : llmVisibility.length === 0 && !isPreviewMode ? (
          <TableEmptyState
            meta={tableEmptyMeta}
            title="No LLM Visibility Tests"
            onAction={handleRemediationAction}
          />
        ) : (
          <LlmVisibilityTable items={llmVisibility} />
        )}
      </div>
    ),
  };

  const chartEmptyMeta: MetaStatus = {
    status: "empty",
    reasonCode: "NO_TREND_DATA",
    userMessage: "No trend data available yet. Run a scan to start tracking.",
    actions: [
      { id: "run_scan", label: "Run Atlas Scan", kind: "run_scan", priority: 1 },
    ],
  };

  const trendsTab: InspectorTab = {
    id: "trends",
    label: "Trends",
    icon: <TrendingUp className="w-4 h-4" />,
    state: isLoading ? "loading" : trends.length > 0 ? "ready" : "empty",
    content: trends.length > 0 ? (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrendChart
            data={trends}
            dataKey="aiVisibilityScore"
            label="AI Visibility Score"
            color={ATLAS_ACCENT_COLOR}
          />
          <TrendChart
            data={trends}
            dataKey="structuredDataCoverage"
            label="Structured Data Coverage %"
            color="#22C55E"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrendChart
            data={trends}
            dataKey="entityCoverage"
            label="Entity Coverage %"
            color="#F59E0B"
          />
          <TrendChart
            data={trends}
            dataKey="llmAnswerability"
            label="LLM Answerability %"
            color="#8B5CF6"
          />
        </div>
      </div>
    ) : (
      <div className="p-4">
        <ChartEmptyState
          meta={chartEmptyMeta}
          title="No Trend Data"
          onAction={handleRemediationAction}
          height={200}
        />
      </div>
    ),
  };

  const inspectorTabs = [findingsTab, structuredDataTab, entityTab, summaryTab, llmVisibilityTab, trendsTab];

  const customMetrics = (
    <div className="space-y-4">
      {showPreviewBanner && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-semantic-warning-border bg-semantic-warning-soft" data-testid="preview-mode-banner">
          <Plug className="w-5 h-5 text-semantic-warning shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-semantic-warning">Preview Mode — Worker Not Connected</p>
            <p className="text-xs text-semantic-warning/80">Showing sample data. Connect the Atlas worker for real insights.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-semantic-warning-border text-semantic-warning hover:bg-semantic-warning-soft"
            onClick={() => navigate("/settings/integrations")}
            data-testid="button-configure-atlas"
          >
            <Plug className="w-3 h-3 mr-1.5" />
            Configure
          </Button>
        </div>
      )}
      
      {atlasMeta.status === "needs_setup" && !showPreviewBanner && (
        <NoDeadEndsState
          meta={atlasMeta}
          title="Connect Atlas AI Worker"
          onAction={handleRemediationAction}
          isLoading={isLoading}
        />
      )}
      
      <KeyMetricsGrid
        metrics={keyMetrics}
        accentColor={crewIdentity.accentColor}
      />
    </div>
  );

  return (
    <CrewPageLayout crewId="atlas">
      <CrewDashboardShell
        crew={crewIdentity}
        agentScore={metrics.aiVisibilityScore}
        agentScoreTooltip="AI Visibility Score based on structured data, entity coverage, and LLM answerability"
        customMetrics={customMetrics}
        inspectorTabs={inspectorTabs}
        headerActions={headerActions}
        onRefresh={() => refetch()}
        isRefreshing={isRefetching || crewIsRefreshing}
        dataUpdatedAt={crewDataUpdatedAt}
      />
    </CrewPageLayout>
  );
}
