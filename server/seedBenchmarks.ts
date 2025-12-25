import { storage } from "./storage";
import type { InsertIndustryBenchmark } from "@shared/schema";

const benchmarkData: InsertIndustryBenchmark[] = [
  // Healthcare Industry
  { industry: "healthcare", metric: "organic_ctr", percentile25: 2.5, percentile50: 3.8, percentile75: 5.2, percentile90: 7.1, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "avg_position", percentile25: 25, percentile50: 15, percentile75: 8, percentile90: 4, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "bounce_rate", percentile25: 65, percentile50: 55, percentile75: 45, percentile90: 35, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "session_duration", percentile25: 45, percentile50: 90, percentile75: 150, percentile90: 240, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "pages_per_session", percentile25: 1.5, percentile50: 2.2, percentile75: 3.0, percentile90: 4.5, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "healthcare", metric: "conversion_rate", percentile25: 1.0, percentile50: 2.5, percentile75: 4.0, percentile90: 6.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // E-commerce Industry
  { industry: "ecommerce", metric: "organic_ctr", percentile25: 1.8, percentile50: 2.9, percentile75: 4.5, percentile90: 6.8, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "avg_position", percentile25: 30, percentile50: 18, percentile75: 10, percentile90: 5, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "bounce_rate", percentile25: 55, percentile50: 45, percentile75: 35, percentile90: 25, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "session_duration", percentile25: 60, percentile50: 120, percentile75: 200, percentile90: 320, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "pages_per_session", percentile25: 2.0, percentile50: 3.5, percentile75: 5.0, percentile90: 8.0, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "ecommerce", metric: "conversion_rate", percentile25: 1.5, percentile50: 2.8, percentile75: 4.5, percentile90: 7.0, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // SaaS Industry
  { industry: "saas", metric: "organic_ctr", percentile25: 2.2, percentile50: 3.5, percentile75: 5.0, percentile90: 7.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "saas", metric: "avg_position", percentile25: 28, percentile50: 16, percentile75: 9, percentile90: 4, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "saas", metric: "bounce_rate", percentile25: 60, percentile50: 48, percentile75: 38, percentile90: 28, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "saas", metric: "session_duration", percentile25: 55, percentile50: 110, percentile75: 180, percentile90: 300, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "saas", metric: "pages_per_session", percentile25: 1.8, percentile50: 2.8, percentile75: 4.2, percentile90: 6.5, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "saas", metric: "conversion_rate", percentile25: 2.0, percentile50: 3.5, percentile75: 5.5, percentile90: 8.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // Finance Industry
  { industry: "finance", metric: "organic_ctr", percentile25: 2.0, percentile50: 3.2, percentile75: 4.8, percentile90: 6.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "finance", metric: "avg_position", percentile25: 32, percentile50: 20, percentile75: 12, percentile90: 6, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "finance", metric: "bounce_rate", percentile25: 58, percentile50: 48, percentile75: 38, percentile90: 28, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "finance", metric: "session_duration", percentile25: 50, percentile50: 100, percentile75: 170, percentile90: 280, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "finance", metric: "pages_per_session", percentile25: 1.6, percentile50: 2.5, percentile75: 3.8, percentile90: 5.5, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "finance", metric: "conversion_rate", percentile25: 1.2, percentile50: 2.2, percentile75: 3.8, percentile90: 5.8, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // Education Industry
  { industry: "education", metric: "organic_ctr", percentile25: 2.8, percentile50: 4.2, percentile75: 5.8, percentile90: 8.0, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "education", metric: "avg_position", percentile25: 22, percentile50: 14, percentile75: 7, percentile90: 3, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "education", metric: "bounce_rate", percentile25: 62, percentile50: 52, percentile75: 42, percentile90: 32, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "education", metric: "session_duration", percentile25: 70, percentile50: 140, percentile75: 220, percentile90: 360, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "education", metric: "pages_per_session", percentile25: 2.2, percentile50: 3.2, percentile75: 4.5, percentile90: 6.8, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "education", metric: "conversion_rate", percentile25: 1.8, percentile50: 3.2, percentile75: 5.0, percentile90: 7.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // Travel & Hospitality Industry
  { industry: "travel", metric: "organic_ctr", percentile25: 2.4, percentile50: 3.8, percentile75: 5.5, percentile90: 7.8, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "travel", metric: "avg_position", percentile25: 26, percentile50: 16, percentile75: 9, percentile90: 4, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "travel", metric: "bounce_rate", percentile25: 52, percentile50: 42, percentile75: 32, percentile90: 22, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "travel", metric: "session_duration", percentile25: 80, percentile50: 160, percentile75: 260, percentile90: 400, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "travel", metric: "pages_per_session", percentile25: 2.5, percentile50: 4.0, percentile75: 6.0, percentile90: 9.0, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "travel", metric: "conversion_rate", percentile25: 0.8, percentile50: 1.8, percentile75: 3.2, percentile90: 5.0, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // Real Estate Industry
  { industry: "real_estate", metric: "organic_ctr", percentile25: 2.6, percentile50: 4.0, percentile75: 5.6, percentile90: 7.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "real_estate", metric: "avg_position", percentile25: 24, percentile50: 15, percentile75: 8, percentile90: 4, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "real_estate", metric: "bounce_rate", percentile25: 58, percentile50: 48, percentile75: 38, percentile90: 28, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "real_estate", metric: "session_duration", percentile25: 65, percentile50: 130, percentile75: 210, percentile90: 340, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "real_estate", metric: "pages_per_session", percentile25: 2.0, percentile50: 3.2, percentile75: 5.0, percentile90: 7.5, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "real_estate", metric: "conversion_rate", percentile25: 1.0, percentile50: 2.0, percentile75: 3.5, percentile90: 5.5, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  
  // Legal Industry
  { industry: "legal", metric: "organic_ctr", percentile25: 2.3, percentile50: 3.6, percentile75: 5.0, percentile90: 6.8, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "legal", metric: "avg_position", percentile25: 28, percentile50: 18, percentile75: 10, percentile90: 5, unit: "position", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "legal", metric: "bounce_rate", percentile25: 60, percentile50: 50, percentile75: 40, percentile90: 30, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "legal", metric: "session_duration", percentile25: 55, percentile50: 110, percentile75: 180, percentile90: 290, unit: "seconds", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "legal", metric: "pages_per_session", percentile25: 1.7, percentile50: 2.6, percentile75: 3.8, percentile90: 5.5, unit: "count", source: "Industry Research 2024", sourceYear: 2024 },
  { industry: "legal", metric: "conversion_rate", percentile25: 2.5, percentile50: 4.0, percentile75: 6.0, percentile90: 9.0, unit: "percent", source: "Industry Research 2024", sourceYear: 2024 },
];

export async function seedBenchmarks(): Promise<number> {
  const existing = await storage.getAllBenchmarks();
  if (existing.length > 0) {
    console.log(`[Benchmarks] Already seeded with ${existing.length} entries`);
    return existing.length;
  }
  
  const saved = await storage.saveBenchmarks(benchmarkData);
  console.log(`[Benchmarks] Seeded ${saved.length} benchmark entries`);
  return saved.length;
}
