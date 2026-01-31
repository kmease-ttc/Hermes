/**
 * Trust System Usage Example
 * 
 * This demonstrates the complete flow of:
 * 1. Seeding trust for a website
 * 2. Checking eligibility before action
 * 3. Recording outcomes
 * 4. Upgrading trust over time
 */

import { storage } from "../storage";
import { seedFirstWebsite } from "./seedTrustLevels";
import { canAutoExecute, getTrustLevelName, canUpgradeTrust } from "./eligibilityChecker";
import { v4 as uuidv4 } from "uuid";

async function runExample() {
  // Assume we have a website
  const websiteId = "example-website-uuid-123";

  console.log("=".repeat(70));
  console.log("TRUST SYSTEM EXAMPLE");
  console.log("=".repeat(70));
  console.log();

  // Step 1: Initialize trust for a new website
  console.log("Step 1: Initialize trust levels...");
  await seedFirstWebsite(websiteId);
  console.log();

  // Step 2: Check current trust level
  console.log("Step 2: Check current trust level for tech-seo...");
  const trustLevel = await storage.getTrustLevel(websiteId, "tech-seo");
  
  if (trustLevel) {
    const levelName = getTrustLevelName(trustLevel.trustLevel);
    console.log("  Current Level:", trustLevel.trustLevel, `(${levelName})`);
    console.log("  Confidence:", trustLevel.confidence + "%");
    console.log("  Successes:", trustLevel.successCount);
    console.log("  Failures:", trustLevel.failureCount);
  }
  console.log();

  // Step 3: Try to execute an action (will fail - trust too low)
  console.log("Step 3: Attempt to auto-execute FIX_CANONICAL...");
  const eligibility1 = await canAutoExecute({
    websiteId,
    actionCode: "FIX_CANONICAL",
    actionCategory: "tech-seo"
  });

  console.log("  Allowed:", eligibility1.allowed);
  console.log("  Reason:", eligibility1.reason);
  console.log("  Required Trust:", eligibility1.requiredTrustLevel);
  console.log("  Current Trust:", eligibility1.currentTrustLevel);
  console.log();

  // Step 4: Upgrade trust to Level 2 (Assisted)
  console.log("Step 4: Manually upgrade trust to Level 2 (Assisted)...");
  await storage.setTrustLevel(websiteId, "tech-seo", 2);
  console.log("  ✓ Trust upgraded to Level 2");
  console.log();

  // Step 5: Try again (should succeed now)
  console.log("Step 5: Attempt to auto-execute FIX_CANONICAL again...");
  const eligibility2 = await canAutoExecute({
    websiteId,
    actionCode: "FIX_CANONICAL",
    actionCategory: "tech-seo"
  });

  console.log("  Allowed:", eligibility2.allowed);
  console.log("  Reason:", eligibility2.reason);
  console.log();

  if (eligibility2.allowed) {
    // Step 6: Execute action and record success
    console.log("Step 6: Executing action and recording success...");
    
    // Simulate action execution
    console.log("  → Fixing canonical tags...");
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("  ✓ Canonical tags fixed successfully");
    
    // Record success
    await storage.recordTrustSuccess(websiteId, "tech-seo");
    
    // Log to audit trail
    await storage.logActionExecution({
      id: uuidv4(),
      websiteId,
      actionCode: "FIX_CANONICAL",
      actionCategory: "tech-seo",
      trustLevel: 2,
      confidence: 0,
      executionMode: "assisted",
      evidence: [
        "GSC showed 15 canonical errors",
        "Pages had incorrect canonical tags"
      ],
      rule: "auto-fix-canonical-v1",
      outcome: "success",
      impactMetrics: {
        before: { canonical_errors: 15 },
        after: { canonical_errors: 0 }
      },
      executedAt: new Date(),
      executedBy: "hermes"
    } as any);
    
    console.log("  ✓ Success recorded and logged to audit trail");
    console.log();
  }

  // Step 7: Simulate multiple successes to earn upgrade
  console.log("Step 7: Simulating 10 successful actions to earn trust...");
  for (let i = 0; i < 10; i++) {
    await storage.recordTrustSuccess(websiteId, "tech-seo");
    console.log("  ✓ Success", i + 1, "/10 recorded");
  }
  console.log();

  // Step 8: Check if eligible for upgrade
  console.log("Step 8: Check if eligible for trust upgrade...");
  const canUpgrade = await canUpgradeTrust(websiteId, "tech-seo");
  console.log("  Can upgrade:", canUpgrade);
  
  if (canUpgrade) {
    const updatedTrust = await storage.getTrustLevel(websiteId, "tech-seo");
    if (updatedTrust) {
      const total = updatedTrust.successCount + updatedTrust.failureCount;
      const successRate = (updatedTrust.successCount / total) * 100;
      console.log("  Success rate:", successRate.toFixed(1) + "%");
      console.log("  Confidence:", updatedTrust.confidence + "%");
      console.log("  → Ready to upgrade to Level 3 (Autonomous)!");
    }
  }
  console.log();

  // Step 9: View audit history
  console.log("Step 9: View recent action execution history...");
  const history = await storage.getActionExecutionHistory(websiteId, "tech-seo", 5);
  console.log("  Found", history.length, "recent executions:");
  history.forEach((record, i) => {
    const date = record.executedAt!.toISOString();
    console.log("  " + (i + 1) + ".", record.actionType, "-", record.status, "-", date);
  });
  console.log();

  console.log("=".repeat(70));
  console.log("EXAMPLE COMPLETE");
  console.log("=".repeat(70));
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample()
    .then(() => {
      console.log("\nExample completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\nExample failed:", error);
      process.exit(1);
    });
}

export { runExample };
