import { CREW, type CrewDefinition } from "@shared/registry";

export interface CrewIntegrationConfig {
  crewId: string;
  displayName: string;
  baseUrl: string | null;
  apiKey: string | null;
  healthEndpoint: string | null;
  runEndpoint: string | null;
  requiredOutputs: string[];
  configStatus: "ready" | "needs_config" | "no_worker";
  missingConfig: string[];
}

export function getCrewIntegrationConfig(crewId: string): CrewIntegrationConfig {
  const crew = CREW[crewId];
  if (!crew) {
    throw new Error(`Unknown crewId: ${crewId}`);
  }

  const missingConfig: string[] = [];
  
  if (!crew.worker) {
    return {
      crewId,
      displayName: crew.nickname,
      baseUrl: null,
      apiKey: null,
      healthEndpoint: null,
      runEndpoint: null,
      requiredOutputs: [],
      configStatus: "no_worker",
      missingConfig: ["worker_contract"],
    };
  }

  const baseUrl = process.env[crew.worker.baseUrlEnvKey] || null;
  const apiKey = process.env[crew.worker.apiKeySecretKey] || null;

  if (!baseUrl) missingConfig.push(crew.worker.baseUrlEnvKey);
  if (!apiKey) missingConfig.push(crew.worker.apiKeySecretKey);

  return {
    crewId,
    displayName: crew.nickname,
    baseUrl,
    apiKey,
    healthEndpoint: baseUrl ? `${baseUrl}${crew.worker.healthPath}` : null,
    runEndpoint: baseUrl ? `${baseUrl}${crew.worker.runPath}` : null,
    requiredOutputs: crew.worker.requiredOutputs,
    configStatus: missingConfig.length > 0 ? "needs_config" : "ready",
    missingConfig,
  };
}

export function getAllCrewConfigs(): CrewIntegrationConfig[] {
  return Object.keys(CREW).map(getCrewIntegrationConfig);
}
