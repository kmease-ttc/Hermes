import { CREW } from "@shared/registry";

export interface OutputValidationResult {
  valid: boolean;
  crewId: string;
  presentOutputs: string[];
  missingOutputs: string[];
  summary: string;
}

export function validateCrewOutputs(crewId: string, workerResponse: any): OutputValidationResult {
  const crew = CREW[crewId];
  if (!crew?.worker) {
    return {
      valid: false,
      crewId,
      presentOutputs: [],
      missingOutputs: [],
      summary: "No worker contract defined",
    };
  }

  const requiredOutputs = crew.worker.requiredOutputs;
  const presentOutputs: string[] = [];
  const missingOutputs: string[] = [];

  for (const output of requiredOutputs) {
    if (workerResponse && output in workerResponse && workerResponse[output] !== null) {
      presentOutputs.push(output);
    } else {
      missingOutputs.push(output);
    }
  }

  return {
    valid: missingOutputs.length === 0,
    crewId,
    presentOutputs,
    missingOutputs,
    summary: missingOutputs.length === 0 
      ? `All ${requiredOutputs.length} outputs present` 
      : `Missing ${missingOutputs.length} of ${requiredOutputs.length} required outputs`,
  };
}
