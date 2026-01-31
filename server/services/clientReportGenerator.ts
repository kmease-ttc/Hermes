import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  Footer,
  PageNumber,
  NumberFormat,
  Header,
  TableOfContents,
  convertInchesToTwip,
  ShadingType,
} from "docx";
import { storage } from "../storage";
import { computeAllCrewStatuses, type CrewStatus } from "./crewStatus";
import { CREW, type CrewId } from "@shared/registry";

export interface ClientReportOptions {
  siteId: string;
  sections: {
    executiveSummary: boolean;
    technicalSeo: boolean;
    keywordRanking: boolean;
    trafficAnalysis: boolean;
    benchmarks: boolean;
  };
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface ReportData {
  site: {
    displayName: string;
    baseUrl: string;
    industry?: string;
  };
  traffic: {
    sessions: number | null;
    clicks: number | null;
    impressions: number | null;
    ctr: number | null;
    avgPosition: number | null;
    bounceRate: number | null;
    conversionRate: number | null;
  };
  keywords: Array<{
    keyword: string;
    position: number | null;
    previousPosition?: number | null;
    change?: number;
    url?: string;
  }>;
  technicalIssues: Array<{
    title: string;
    severity: string;
    description: string;
    recommendation: string;
    priority: string;
  }>;
  benchmarks: Array<{
    metric: string;
    siteValue: number | null;
    industryAvg: number | null;
    status: "above" | "below" | "at";
  }>;
  crewStatuses: CrewStatus[];
  recommendations: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    effort: string;
    impact: string;
  }>;
  generatedAt: string;
}

async function collectReportData(options: ClientReportOptions): Promise<ReportData> {
  const { siteId } = options;
  
  const [
    site,
    ga4Data,
    gscData,
    rankings,
    keywords,
    findings,
    suggestions,
    benchmarks,
    crewStatuses,
  ] = await Promise.all([
    storage.getSiteById(siteId),
    storage.getGA4DataByDateRange(
      options.dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      options.dateRange?.endDate || new Date().toISOString().split("T")[0],
      siteId
    ),
    storage.getGSCDataByDateRange(
      options.dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      options.dateRange?.endDate || new Date().toISOString().split("T")[0],
      siteId
    ),
    storage.getLatestRankings(),
    storage.getSerpKeywords(true),
    storage.getLatestFindings(siteId, 20),
    storage.getLatestSeoSuggestions(siteId, 15),
    storage.getAllBenchmarks(),
    computeAllCrewStatuses(siteId, 7),
  ]);

  const totalSessions = ga4Data.reduce((sum, d) => sum + (d.sessions || 0), 0);
  const totalClicks = gscData.reduce((sum, d) => sum + (d.clicks || 0), 0);
  const totalImpressions = gscData.reduce((sum, d) => sum + (d.impressions || 0), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;
  const avgPosition = gscData.length > 0 
    ? gscData.reduce((sum, d) => sum + (d.position || 0), 0) / gscData.length 
    : null;
  const avgBounceRate = ga4Data.length > 0
    ? ga4Data.reduce((sum, d) => sum + (d.bounceRate || 0), 0) / ga4Data.length
    : null;

  const keywordData = rankings.map(r => ({
    keyword: r.keyword || "Unknown",
    position: r.position,
    previousPosition: null,
    change: 0,
    url: r.url || undefined,
  })).slice(0, 20);

  const technicalIssues = findings
    .filter(f => f.severity === "critical" || f.severity === "high" || f.severity === "medium")
    .map(f => ({
      title: f.title || "Issue",
      severity: f.severity || "medium",
      description: f.description || "",
      recommendation: f.recommendation || "Review and address this issue",
      priority: f.severity === "critical" ? "high" : f.severity || "medium",
    }))
    .slice(0, 15);

  const recommendationsData = suggestions.map(s => ({
    title: s.title || "Recommendation",
    description: s.description || "",
    priority: (s.severity || "medium") as "high" | "medium" | "low",
    effort: (s as any).effort || "Medium",
    impact: (s as any).impact || "Medium",
  })).slice(0, 10);

  // Calculate date range for scaling
  const startDateParsed = options.dateRange?.startDate 
    ? new Date(options.dateRange.startDate) 
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDateParsed = options.dateRange?.endDate 
    ? new Date(options.dateRange.endDate) 
    : new Date();
  const daysInRange = Math.max(1, Math.ceil((endDateParsed.getTime() - startDateParsed.getTime()) / (1000 * 60 * 60 * 24)));
  const scaleFactor = 30 / daysInRange;

  // Build fresh metrics from GA4 and GSC data (scaled to monthly for fair comparison)
  const freshMetrics: Record<string, number | null> = {
    sessions: totalSessions > 0 ? Math.round(totalSessions * scaleFactor) : null,
    clicks: totalClicks > 0 ? Math.round(totalClicks * scaleFactor) : null,
    impressions: totalImpressions > 0 ? Math.round(totalImpressions * scaleFactor) : null,
    organic_ctr: avgCtr,
    avg_position: avgPosition,
    bounce_rate: avgBounceRate,
    conversion_rate: null,
  };

  // Metrics where lower is better
  const lowerIsBetter = ['avg_position', 'bounce_rate', 'lcp', 'cls', 'inp'];

  // Build benchmark comparison with real site values and computed status
  const benchmarkData = benchmarks.slice(0, 10).map(b => {
    const metricKey = b.metric || "Unknown";
    const siteValue = freshMetrics[metricKey] ?? null;
    const industryAvg = b.percentile50 || null;
    const isLowerBetter = lowerIsBetter.includes(metricKey);
    
    // Determine status based on comparison with industry p50
    let status: "above" | "below" | "at" = "at";
    if (siteValue !== null && industryAvg !== null) {
      if (isLowerBetter) {
        // For metrics like avg_position, bounce_rate - lower is better
        if (siteValue < industryAvg * 0.9) status = "above";
        else if (siteValue > industryAvg * 1.1) status = "below";
        else status = "at";
      } else {
        // For metrics like sessions, clicks, CTR - higher is better
        if (siteValue > industryAvg * 1.1) status = "above";
        else if (siteValue < industryAvg * 0.9) status = "below";
        else status = "at";
      }
    }
    
    return {
      metric: metricKey,
      siteValue,
      industryAvg,
      status,
    };
  });

  return {
    site: {
      displayName: site?.displayName || siteId,
      baseUrl: site?.baseUrl || "",
      industry: site?.category || "General",
    },
    traffic: {
      sessions: totalSessions || null,
      clicks: totalClicks || null,
      impressions: totalImpressions || null,
      ctr: avgCtr,
      avgPosition,
      bounceRate: avgBounceRate,
      conversionRate: null,
    },
    keywords: keywordData,
    technicalIssues,
    benchmarks: benchmarkData,
    crewStatuses,
    recommendations: recommendationsData,
    generatedAt: new Date().toISOString(),
  };
}

function createStyledParagraph(text: string, options: {
  bold?: boolean;
  italics?: boolean;
  size?: number;
  color?: string;
  spacing?: { before?: number; after?: number };
} = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options.bold,
        italics: options.italics,
        size: options.size || 24,
        color: options.color,
        font: "Calibri",
      }),
    ],
    spacing: options.spacing || { before: 100, after: 100 },
  });
}

function createHeading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 300, after: 200 },
  });
}

function createTableHeader(cells: string[]): TableRow {
  return new TableRow({
    children: cells.map(cell => 
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: cell,
                bold: true,
                size: 22,
                font: "Calibri",
              }),
            ],
          }),
        ],
        shading: {
          fill: "2D3748",
          type: ShadingType.SOLID,
          color: "FFFFFF",
        },
        margins: {
          top: convertInchesToTwip(0.05),
          bottom: convertInchesToTwip(0.05),
          left: convertInchesToTwip(0.1),
          right: convertInchesToTwip(0.1),
        },
      })
    ),
    tableHeader: true,
  });
}

function createTableRow(cells: string[], alternate: boolean = false): TableRow {
  return new TableRow({
    children: cells.map(cell => 
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: cell,
                size: 22,
                font: "Calibri",
              }),
            ],
          }),
        ],
        shading: alternate ? {
          fill: "F7FAFC",
          type: ShadingType.SOLID,
        } : undefined,
        margins: {
          top: convertInchesToTwip(0.05),
          bottom: convertInchesToTwip(0.05),
          left: convertInchesToTwip(0.1),
          right: convertInchesToTwip(0.1),
        },
      })
    ),
  });
}

function createExecutiveSummary(data: ReportData): Paragraph[] {
  const sections: Paragraph[] = [];
  
  sections.push(createHeading("Executive Summary", HeadingLevel.HEADING_1));
  
  sections.push(new Paragraph({
    children: [
      new TextRun({
        text: `This report provides a comprehensive SEO analysis for `,
        size: 24,
        font: "Calibri",
      }),
      new TextRun({
        text: data.site.displayName,
        bold: true,
        size: 24,
        font: "Calibri",
      }),
      new TextRun({
        text: `. The analysis covers traffic performance, keyword rankings, technical health, and actionable recommendations.`,
        size: 24,
        font: "Calibri",
      }),
    ],
    spacing: { before: 200, after: 200 },
  }));

  sections.push(createHeading("Site Overview", HeadingLevel.HEADING_2));
  sections.push(createStyledParagraph(`Domain: ${data.site.baseUrl || "Not specified"}`));
  sections.push(createStyledParagraph(`Industry: ${data.site.industry || "General"}`));
  sections.push(createStyledParagraph(`Report Generated: ${new Date(data.generatedAt).toLocaleDateString()}`));

  sections.push(createHeading("Key Metrics at a Glance", HeadingLevel.HEADING_2));
  
  const metricsText = [
    data.traffic.sessions !== null ? `Organic Sessions: ${data.traffic.sessions.toLocaleString()}` : null,
    data.traffic.clicks !== null ? `Search Clicks: ${data.traffic.clicks.toLocaleString()}` : null,
    data.traffic.impressions !== null ? `Search Impressions: ${data.traffic.impressions.toLocaleString()}` : null,
    data.traffic.ctr !== null ? `Click-Through Rate: ${data.traffic.ctr.toFixed(2)}%` : null,
    data.traffic.avgPosition !== null ? `Average Position: ${data.traffic.avgPosition.toFixed(1)}` : null,
  ].filter(Boolean);

  metricsText.forEach(text => {
    if (text) sections.push(createStyledParagraph(`• ${text}`));
  });

  const crewSummary = data.crewStatuses.filter(c => c.score.value !== null);
  if (crewSummary.length > 0) {
    sections.push(createHeading("Health Summary", HeadingLevel.HEADING_2));
    crewSummary.forEach(crew => {
      const crewDef = CREW[crew.crewId as CrewId];
      if (crewDef && crew.score.value !== null) {
        sections.push(createStyledParagraph(
          `• ${crewDef.nickname} (${crewDef.role}): ${crew.score.value}/100 - ${crew.status.replace(/_/g, " ")}`
        ));
      }
    });
  }

  return sections;
}

function createTechnicalSeoSection(data: ReportData): Paragraph[] {
  const sections: Paragraph[] = [];
  
  sections.push(createHeading("Technical SEO Recommendations", HeadingLevel.HEADING_1));
  
  sections.push(new Paragraph({
    children: [
      new TextRun({
        text: `${data.site.displayName} demonstrates solid technical foundations. The primary opportunity is ensuring technical consistency and crawl clarity: removing sitewide friction so search engines can confidently crawl, index, and rank the right pages for the right queries.`,
        size: 24,
        font: "Calibri",
      }),
    ],
    spacing: { before: 200, after: 200 },
  }));

  if (data.technicalIssues.length > 0) {
    const criticalIssues = data.technicalIssues.filter(i => i.priority === "high" || i.severity === "critical");
    const mediumIssues = data.technicalIssues.filter(i => i.priority === "medium");
    
    if (criticalIssues.length > 0) {
      sections.push(createHeading("Priority 1 — Critical Issues", HeadingLevel.HEADING_2));
      criticalIssues.forEach((issue, idx) => {
        sections.push(createHeading(`${idx + 1}. ${issue.title}`, HeadingLevel.HEADING_3));
        sections.push(createStyledParagraph(issue.description));
        sections.push(createStyledParagraph(`Recommendation: ${issue.recommendation}`, { italics: true }));
      });
    }
    
    if (mediumIssues.length > 0) {
      sections.push(createHeading("Priority 2 — Medium Priority Issues", HeadingLevel.HEADING_2));
      mediumIssues.forEach((issue, idx) => {
        sections.push(createHeading(`${idx + 1}. ${issue.title}`, HeadingLevel.HEADING_3));
        sections.push(createStyledParagraph(issue.description));
        sections.push(createStyledParagraph(`Recommendation: ${issue.recommendation}`, { italics: true }));
      });
    }
  } else {
    sections.push(createStyledParagraph("No critical technical issues were detected. Continue monitoring for potential issues."));
  }

  sections.push(createHeading("General Technical Recommendations", HeadingLevel.HEADING_2));
  
  const generalRecs = [
    "Ensure all pages have unique, descriptive title tags within display limits",
    "Implement proper heading hierarchy (H1 → H2 → H3) on all pages",
    "Add FAQ schema to priority pages to improve SERP visibility",
    "Optimize images: compress, add alt text, and use modern formats (WebP)",
    "Implement HSTS and security headers for trust signals",
    "Ensure all indexable pages have self-referencing canonical tags",
  ];
  
  generalRecs.forEach(rec => {
    sections.push(createStyledParagraph(`• ${rec}`));
  });

  return sections;
}

function createKeywordRankingSection(data: ReportData): Paragraph[] {
  const sections: Paragraph[] = [];
  
  sections.push(createHeading("Keyword Ranking Plan", HeadingLevel.HEADING_1));
  
  sections.push(new Paragraph({
    children: [
      new TextRun({
        text: `This plan aligns SEO to business focus. The core methodology is: one keyword intent → one primary page, supported by internal linking, structured headings, FAQs, and content that matches how users search.`,
        size: 24,
        font: "Calibri",
      }),
    ],
    spacing: { before: 200, after: 200 },
  }));

  if (data.keywords.length > 0) {
    sections.push(createHeading("Current Keyword Rankings", HeadingLevel.HEADING_2));
    
    const tableRows: TableRow[] = [
      createTableHeader(["Keyword", "Position", "URL"]),
    ];
    
    data.keywords.slice(0, 15).forEach((kw, idx) => {
      tableRows.push(createTableRow([
        kw.keyword,
        kw.position !== null ? kw.position.toString() : "Not Ranked",
        kw.url || "—",
      ], idx % 2 === 1));
    });
    
    sections.push(new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }) as any);

    sections.push(createHeading("Keyword Optimization Strategies", HeadingLevel.HEADING_2));
    
    const top5 = data.keywords.slice(0, 5);
    top5.forEach((kw, idx) => {
      sections.push(createHeading(`${idx + 1}) ${kw.keyword}`, HeadingLevel.HEADING_3));
      sections.push(createStyledParagraph(
        kw.position !== null && kw.position <= 3 
          ? `Current visibility: Top ${kw.position}. Goal: Defend position and increase conversion rate.`
          : kw.position !== null && kw.position <= 10
          ? `Current visibility: Page 1. Goal: Move into Top 3.`
          : `Current visibility: Page 2+. Goal: Move into Top 10.`
      ));
      
      sections.push(createStyledParagraph("On-page execution:", { bold: true }));
      sections.push(createStyledParagraph("• Optimize title tag with primary keyword + location + differentiator"));
      sections.push(createStyledParagraph("• Use proper H2 structure: Overview, Benefits, Process, FAQs, CTA"));
      sections.push(createStyledParagraph("• Add 6-10 FAQs targeting common objections and questions"));
      sections.push(createStyledParagraph("• Implement FAQ schema for enhanced SERP visibility"));
    });
  } else {
    sections.push(createStyledParagraph("No keywords are currently being tracked. Add keywords to the SERP tracker to enable ranking analysis."));
  }

  return sections;
}

function createTrafficAnalysisSection(data: ReportData): Paragraph[] {
  const sections: Paragraph[] = [];
  
  sections.push(createHeading("Traffic Analysis", HeadingLevel.HEADING_1));
  
  sections.push(createHeading("Organic Traffic Overview", HeadingLevel.HEADING_2));
  
  const metricsTable = new Table({
    rows: [
      createTableHeader(["Metric", "Value", "Status"]),
      createTableRow([
        "Organic Sessions",
        data.traffic.sessions?.toLocaleString() || "N/A",
        data.traffic.sessions !== null && data.traffic.sessions > 1000 ? "Good" : "Needs Improvement",
      ], false),
      createTableRow([
        "Search Clicks",
        data.traffic.clicks?.toLocaleString() || "N/A",
        data.traffic.clicks !== null && data.traffic.clicks > 500 ? "Good" : "Needs Improvement",
      ], true),
      createTableRow([
        "Impressions",
        data.traffic.impressions?.toLocaleString() || "N/A",
        "—",
      ], false),
      createTableRow([
        "CTR",
        data.traffic.ctr !== null ? `${data.traffic.ctr.toFixed(2)}%` : "N/A",
        data.traffic.ctr !== null && data.traffic.ctr > 3 ? "Good" : "Needs Improvement",
      ], true),
      createTableRow([
        "Average Position",
        data.traffic.avgPosition !== null ? data.traffic.avgPosition.toFixed(1) : "N/A",
        data.traffic.avgPosition !== null && data.traffic.avgPosition < 20 ? "Good" : "Needs Improvement",
      ], false),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
  
  sections.push(metricsTable as any);

  sections.push(createHeading("Traffic Insights", HeadingLevel.HEADING_2));
  
  if (data.traffic.sessions !== null && data.traffic.clicks !== null) {
    const ratio = data.traffic.clicks / (data.traffic.sessions || 1);
    if (ratio > 0.5) {
      sections.push(createStyledParagraph("• Strong correlation between search visibility and site traffic"));
    } else {
      sections.push(createStyledParagraph("• Opportunity to improve organic search visibility relative to overall traffic"));
    }
  }
  
  if (data.traffic.ctr !== null) {
    if (data.traffic.ctr > 5) {
      sections.push(createStyledParagraph("• Above-average click-through rate indicates compelling title tags and meta descriptions"));
    } else if (data.traffic.ctr < 2) {
      sections.push(createStyledParagraph("• Below-average CTR suggests opportunity to improve title tags and meta descriptions"));
    }
  }

  return sections;
}

function createBenchmarksSection(data: ReportData): Paragraph[] {
  const sections: Paragraph[] = [];
  
  sections.push(createHeading("Industry Benchmarks", HeadingLevel.HEADING_1));
  
  sections.push(createStyledParagraph(
    "This section compares your site's performance against industry averages to identify areas of strength and opportunity."
  ));

  if (data.benchmarks.length > 0) {
    const benchmarkTable = new Table({
      rows: [
        createTableHeader(["Metric", "Your Site", "Industry Avg", "Status"]),
        ...data.benchmarks.map((b, idx) => createTableRow([
          b.metric.replace(/\./g, " ").replace(/_/g, " "),
          b.siteValue !== null ? b.siteValue.toString() : "N/A",
          b.industryAvg !== null ? b.industryAvg.toString() : "N/A",
          b.status === "above" ? "Above Average" : b.status === "below" ? "Below Average" : "At Average",
        ], idx % 2 === 1)),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
    
    sections.push(benchmarkTable as any);
  } else {
    sections.push(createStyledParagraph("Benchmark data is not yet available for comparison."));
  }

  return sections;
}

function createRecommendationsSection(data: ReportData): Paragraph[] {
  const sections: Paragraph[] = [];
  
  sections.push(createHeading("Prioritized Recommendations", HeadingLevel.HEADING_1));
  
  if (data.recommendations.length > 0) {
    const highPriority = data.recommendations.filter(r => r.priority === "high");
    const mediumPriority = data.recommendations.filter(r => r.priority === "medium");
    
    if (highPriority.length > 0) {
      sections.push(createHeading("High Priority", HeadingLevel.HEADING_2));
      highPriority.forEach((rec, idx) => {
        sections.push(createHeading(`${idx + 1}. ${rec.title}`, HeadingLevel.HEADING_3));
        sections.push(createStyledParagraph(rec.description));
        sections.push(createStyledParagraph(`Effort: ${rec.effort} | Expected Impact: ${rec.impact}`, { italics: true }));
      });
    }
    
    if (mediumPriority.length > 0) {
      sections.push(createHeading("Medium Priority", HeadingLevel.HEADING_2));
      mediumPriority.forEach((rec, idx) => {
        sections.push(createHeading(`${idx + 1}. ${rec.title}`, HeadingLevel.HEADING_3));
        sections.push(createStyledParagraph(rec.description));
        sections.push(createStyledParagraph(`Effort: ${rec.effort} | Expected Impact: ${rec.impact}`, { italics: true }));
      });
    }
  } else {
    sections.push(createStyledParagraph("No specific recommendations at this time. Continue monitoring performance metrics."));
  }

  return sections;
}

export async function generateClientReport(options: ClientReportOptions): Promise<Buffer> {
  const data = await collectReportData(options);
  
  const documentSections: Paragraph[] = [];
  
  documentSections.push(new Paragraph({
    children: [
      new TextRun({
        text: `SEO Report — ${data.site.displayName}`,
        bold: true,
        size: 56,
        font: "Calibri",
        color: "1A365D",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
  }));
  
  documentSections.push(new Paragraph({
    children: [
      new TextRun({
        text: "Prepared by Arclo",
        size: 28,
        font: "Calibri",
        color: "4A5568",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  }));

  if (options.sections.executiveSummary) {
    documentSections.push(...createExecutiveSummary(data));
  }
  
  if (options.sections.technicalSeo) {
    documentSections.push(...createTechnicalSeoSection(data));
  }
  
  if (options.sections.keywordRanking) {
    documentSections.push(...createKeywordRankingSection(data));
  }
  
  if (options.sections.trafficAnalysis) {
    documentSections.push(...createTrafficAnalysisSection(data));
  }
  
  if (options.sections.benchmarks) {
    documentSections.push(...createBenchmarksSection(data));
  }
  
  documentSections.push(...createRecommendationsSection(data));

  const doc = new Document({
    creator: "Arclo",
    title: `SEO Report - ${data.site.displayName}`,
    description: "Comprehensive SEO analysis and recommendations",
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 24,
          },
        },
        heading1: {
          run: {
            font: "Calibri",
            size: 36,
            bold: true,
            color: "1A365D",
          },
          paragraph: {
            spacing: { before: 400, after: 200 },
          },
        },
        heading2: {
          run: {
            font: "Calibri",
            size: 28,
            bold: true,
            color: "2D3748",
          },
          paragraph: {
            spacing: { before: 300, after: 150 },
          },
        },
        heading3: {
          run: {
            font: "Calibri",
            size: 24,
            bold: true,
            color: "4A5568",
          },
          paragraph: {
            spacing: { before: 200, after: 100 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Generated ${new Date(data.generatedAt).toLocaleDateString()} | Prepared by Arclo | Page `,
                    size: 18,
                    color: "718096",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: "718096",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: documentSections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

export const ClientReportService = {
  generateClientReport,
  collectReportData,
};
