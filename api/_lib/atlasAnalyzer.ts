/**
 * Atlas v1 — AI Search Optimization analyzer.
 *
 * Runs on already-fetched HTML (no external API calls).
 * Checks structured data, FAQ patterns, NAP consistency,
 * content structure, meta AI directives, and internal linking.
 */

export interface AtlasChecklistItem {
  title: string;
  status: "pass" | "fail" | "warning";
  detail: string;
  category: string;
}

export interface AtlasFinding {
  finding_type: string;
  severity: "critical" | "warning" | "info";
  category: string;
  description: string;
  recommended_action: string;
}

export interface AtlasResult {
  ai_visibility_score: number;         // 0-100
  structured_data_coverage: number;    // 0-100
  entity_coverage: number;             // 0-100
  llm_answerability: number;           // 0-100
  checklist: AtlasChecklistItem[];
  findings: AtlasFinding[];
}

/**
 * Analyze a single HTML page for AI/LLM readiness.
 */
export function analyzePageForAtlas(html: string, url: string): AtlasResult {
  const checklist: AtlasChecklistItem[] = [];
  const findings: AtlasFinding[] = [];

  // ── 1. Structured Data ─────────────────────────────────────────
  const ldJsonMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const schemaTypes: string[] = [];

  for (const block of ldJsonMatches) {
    const content = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "").trim();
    try {
      const parsed = JSON.parse(content);
      const types = extractSchemaTypes(parsed);
      schemaTypes.push(...types);
    } catch {
      // Malformed JSON-LD
    }
  }

  const hasOrganization = schemaTypes.some(t => t.toLowerCase().includes("organization"));
  const hasLocalBusiness = schemaTypes.some(t => t.toLowerCase().includes("localbusiness"));
  const hasFAQPage = schemaTypes.some(t => t.toLowerCase().includes("faqpage"));
  const hasArticle = schemaTypes.some(t => t.toLowerCase().includes("article"));
  const hasBreadcrumb = schemaTypes.some(t => t.toLowerCase().includes("breadcrumblist"));

  const schemaCheckCount = [hasOrganization || hasLocalBusiness, hasFAQPage, hasArticle, hasBreadcrumb].filter(Boolean).length;
  const structuredDataScore = Math.min(100, schemaCheckCount * 25 + (ldJsonMatches.length > 0 ? 10 : 0));

  checklist.push({
    title: "Structured Data Present",
    status: ldJsonMatches.length > 0 ? "pass" : "fail",
    detail: ldJsonMatches.length > 0
      ? `Found ${ldJsonMatches.length} JSON-LD block(s): ${schemaTypes.slice(0, 5).join(", ")}`
      : "No JSON-LD structured data found",
    category: "structured_data",
  });

  if (!hasOrganization && !hasLocalBusiness) {
    checklist.push({
      title: "Organization/Business Schema",
      status: "fail",
      detail: "No Organization or LocalBusiness schema found",
      category: "structured_data",
    });
    findings.push({
      finding_type: "missing_entity",
      severity: "warning",
      category: "structured_data",
      description: "Page is missing Organization or LocalBusiness structured data",
      recommended_action: "Add Organization or LocalBusiness JSON-LD schema with name, URL, and contact info",
    });
  } else {
    checklist.push({
      title: "Organization/Business Schema",
      status: "pass",
      detail: hasLocalBusiness ? "LocalBusiness schema found" : "Organization schema found",
      category: "structured_data",
    });
  }

  if (hasBreadcrumb) {
    checklist.push({ title: "Breadcrumb Schema", status: "pass", detail: "BreadcrumbList schema found", category: "structured_data" });
  }

  // ── 2. FAQ Sections ────────────────────────────────────────────
  const detailsSummaryCount = (html.match(/<details[\s>]/gi) || []).length;
  const faqHeadingMatch = html.match(/<h[2-4][^>]*>[^<]*(faq|frequently|questions)[^<]*<\/h[2-4]>/gi) || [];
  const hasFAQContent = detailsSummaryCount >= 2 || faqHeadingMatch.length > 0 || hasFAQPage;

  checklist.push({
    title: "FAQ Content",
    status: hasFAQContent ? "pass" : "fail",
    detail: hasFAQContent
      ? `FAQ detected: ${hasFAQPage ? "FAQPage schema" : detailsSummaryCount > 0 ? `${detailsSummaryCount} expandable sections` : "FAQ heading found"}`
      : "No FAQ content or schema detected",
    category: "faq",
  });

  if (!hasFAQContent) {
    findings.push({
      finding_type: "missing_faq",
      severity: "warning",
      category: "faq",
      description: "No FAQ section or FAQPage schema found",
      recommended_action: "Add an FAQ section with common questions. Use FAQPage schema markup for AI visibility.",
    });
  }

  if (hasFAQContent && !hasFAQPage) {
    findings.push({
      finding_type: "missing_faq_schema",
      severity: "info",
      category: "faq",
      description: "FAQ content exists but FAQPage schema markup is missing",
      recommended_action: "Add FAQPage JSON-LD schema to make FAQ content machine-readable for AI assistants.",
    });
  }

  // ── 3. NAP Consistency ─────────────────────────────────────────
  // Extract from LocalBusiness schema if present
  let napScore = 0;
  const lowerHtml = html.toLowerCase();

  // Check for phone patterns in visible text
  const phonePattern = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const hasPhoneInText = phonePattern.test(html);

  // Check for address-like patterns
  const addressPattern = /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|way|court|ct|place|pl)\b/i;
  const hasAddressInText = addressPattern.test(html);

  if (hasLocalBusiness) napScore += 40;
  if (hasPhoneInText) napScore += 30;
  if (hasAddressInText) napScore += 30;

  checklist.push({
    title: "NAP (Name/Address/Phone)",
    status: napScore >= 60 ? "pass" : napScore > 0 ? "warning" : "fail",
    detail: napScore >= 60
      ? "Business contact info detected in page"
      : napScore > 0
      ? "Partial contact info found — consider adding full NAP"
      : "No business contact information detected",
    category: "nap",
  });

  // ── 4. Content Structure ───────────────────────────────────────
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const h3Count = (html.match(/<h3[\s>]/gi) || []).length;
  const listCount = (html.match(/<(?:ul|ol)[\s>]/gi) || []).length;
  const tableCount = (html.match(/<table[\s>]/gi) || []).length;
  const pCount = (html.match(/<p[\s>]/gi) || []).length;

  const hasGoodHeadingHierarchy = h1Count === 1 && h2Count >= 2;
  const hasRichContent = listCount >= 1 || tableCount >= 1;
  const hasSubstantialContent = pCount >= 5;

  const contentStructureScore = Math.min(100,
    (hasGoodHeadingHierarchy ? 35 : (h1Count >= 1 ? 15 : 0)) +
    (h2Count >= 2 ? 20 : h2Count >= 1 ? 10 : 0) +
    (hasRichContent ? 15 : 0) +
    (hasSubstantialContent ? 20 : pCount >= 2 ? 10 : 0) +
    (h3Count >= 1 ? 10 : 0)
  );

  checklist.push({
    title: "Content Structure",
    status: contentStructureScore >= 60 ? "pass" : contentStructureScore >= 30 ? "warning" : "fail",
    detail: `H1:${h1Count} H2:${h2Count} H3:${h3Count} | ${pCount} paragraphs, ${listCount} lists, ${tableCount} tables`,
    category: "content",
  });

  if (!hasGoodHeadingHierarchy) {
    findings.push({
      finding_type: "heading_structure",
      severity: h1Count === 0 ? "warning" : "info",
      category: "content",
      description: h1Count === 0
        ? "Page is missing an H1 heading"
        : h1Count > 1
        ? `Page has ${h1Count} H1 tags (should have exactly 1)`
        : "Page has fewer than 2 H2 subheadings",
      recommended_action: "Use a single H1 followed by descriptive H2 and H3 subheadings to help AI understand page structure.",
    });
  }

  // ── 5. Meta AI Signals ─────────────────────────────────────────
  const hasNoAI = /content=["'][^"']*noai[^"']*["']/i.test(html) || /content=["'][^"']*noimageai[^"']*["']/i.test(html);
  const hasMaxSnippet = /content=["'][^"']*max-snippet[^"']*["']/i.test(html);

  checklist.push({
    title: "AI Crawler Directives",
    status: hasNoAI ? "warning" : "pass",
    detail: hasNoAI
      ? "Page has noai/noimageai directives — AI search engines may ignore this content"
      : hasMaxSnippet
      ? "max-snippet directive found (limits snippet length)"
      : "No AI-blocking directives found",
    category: "meta",
  });

  if (hasNoAI) {
    findings.push({
      finding_type: "ai_blocked",
      severity: "warning",
      category: "meta",
      description: "Page has noai or noimageai meta directives that may reduce AI search visibility",
      recommended_action: "Review whether AI blocking directives are intentional. Removing them can improve visibility in AI-powered search.",
    });
  }

  // ── 6. Internal Linking ────────────────────────────────────────
  const internalLinkPattern = new RegExp(`<a[^>]+href=["'](?:https?://(?:www\\.)?${escapeRegex(extractDomain(url))})?/[^"']*["']`, "gi");
  const internalLinks = html.match(internalLinkPattern) || [];
  const internalLinkCount = internalLinks.length;

  checklist.push({
    title: "Internal Linking",
    status: internalLinkCount >= 5 ? "pass" : internalLinkCount >= 2 ? "warning" : "fail",
    detail: `${internalLinkCount} internal links found`,
    category: "linking",
  });

  if (internalLinkCount < 3) {
    findings.push({
      finding_type: "low_internal_links",
      severity: "info",
      category: "linking",
      description: `Only ${internalLinkCount} internal links on page`,
      recommended_action: "Add more internal links to help AI crawlers discover and understand your site structure.",
    });
  }

  // ── Compute aggregate scores ───────────────────────────────────
  const entityCoverage = Math.min(100, napScore + (hasOrganization || hasLocalBusiness ? 20 : 0));

  // llmAnswerability: how well can an LLM generate a good answer from this page?
  const llmAnswerability = Math.min(100,
    (hasFAQContent ? 30 : 0) +
    (contentStructureScore >= 60 ? 25 : contentStructureScore >= 30 ? 15 : 0) +
    (hasSubstantialContent ? 20 : pCount >= 2 ? 10 : 0) +
    (hasRichContent ? 15 : 0) +
    (!hasNoAI ? 10 : 0)
  );

  const aiVisibilityScore = Math.round(
    structuredDataScore * 0.30 +
    entityCoverage * 0.20 +
    llmAnswerability * 0.30 +
    contentStructureScore * 0.20
  );

  return {
    ai_visibility_score: Math.min(100, Math.max(0, aiVisibilityScore)),
    structured_data_coverage: structuredDataScore,
    entity_coverage: entityCoverage,
    llm_answerability: llmAnswerability,
    checklist,
    findings,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function extractSchemaTypes(data: unknown): string[] {
  const types: string[] = [];
  if (Array.isArray(data)) {
    for (const item of data) types.push(...extractSchemaTypes(item));
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj["@type"] === "string") types.push(obj["@type"]);
    if (Array.isArray(obj["@type"])) types.push(...(obj["@type"] as string[]));
    if (Array.isArray(obj["@graph"])) {
      for (const item of obj["@graph"]) types.push(...extractSchemaTypes(item));
    }
  }
  return types;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
