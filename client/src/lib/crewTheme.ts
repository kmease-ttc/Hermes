import { getCrewMember } from "@/config/agents";

export type CrewId = 
  | "popular"
  | "natasha"
  | "lookout"
  | "scotty"
  | "speedster"
  | "sentinel"
  | "hemingway"
  | "beacon"
  | "atlas"
  | "draper"
  | "socrates"
  | "major_tom";

export interface CrewTheme {
  id: CrewId;
  name: string;
  color: {
    primary: string;
    ring: string;
    bgSubtle: string;
    text: string;
    badge: string;
  };
  serviceId: string;
}

const SERVICE_ID_MAP: Record<CrewId, string> = {
  popular: "google_data_connector",
  natasha: "competitive_snapshot",
  lookout: "serp_intel",
  scotty: "crawl_render",
  speedster: "core_web_vitals",
  sentinel: "content_decay",
  hemingway: "content_generator",
  beacon: "backlink_authority",
  atlas: "ai_optimization",
  draper: "google_ads_connector",
  socrates: "seo_kbase",
  major_tom: "orchestrator",
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function deriveThemeFromColor(primary: string): CrewTheme["color"] {
  const rgb = hexToRgb(primary);
  if (!rgb) {
    return {
      primary,
      ring: primary,
      bgSubtle: `${primary}15`,
      text: primary,
      badge: `${primary}20`,
    };
  }
  
  const { r, g, b } = rgb;
  return {
    primary,
    ring: `rgba(${r}, ${g}, ${b}, 0.4)`,
    bgSubtle: `rgba(${r}, ${g}, ${b}, 0.08)`,
    text: primary,
    badge: `rgba(${r}, ${g}, ${b}, 0.15)`,
  };
}

export function getCrewTheme(crewId: CrewId): CrewTheme {
  const serviceId = SERVICE_ID_MAP[crewId];
  if (!serviceId) {
    throw new Error(`Unknown crew ID: ${crewId}`);
  }
  
  const crew = getCrewMember(serviceId);
  const color = deriveThemeFromColor(crew.color);
  
  return {
    id: crewId,
    name: crew.nickname,
    color,
    serviceId,
  };
}

export function getCrewThemeByServiceId(serviceId: string): CrewTheme | null {
  const crewId = Object.entries(SERVICE_ID_MAP).find(
    ([_, sId]) => sId === serviceId
  )?.[0] as CrewId | undefined;
  
  if (!crewId) return null;
  return getCrewTheme(crewId);
}

export const crewThemes: Record<CrewId, CrewTheme> = Object.fromEntries(
  Object.keys(SERVICE_ID_MAP).map((crewId) => [
    crewId,
    getCrewTheme(crewId as CrewId),
  ])
) as Record<CrewId, CrewTheme>;

export function getCrewCssVars(theme: CrewTheme): Record<string, string> {
  return {
    "--crew-primary": theme.color.primary,
    "--crew-ring": theme.color.ring,
    "--crew-bg": theme.color.bgSubtle,
    "--crew-text": theme.color.text,
    "--crew-badge": theme.color.badge,
  };
}
