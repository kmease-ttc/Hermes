# PRD — Execution / Deployer Contract
(Apply Changes · Safety · Idempotency · Rollback)

---

## 1. Purpose & Scope

This PRD defines the **Execution / Deployer contract** for Arclo.

It answers the question:

> “When Hermes decides to act, what is allowed to touch the site?”

This PRD establishes **hard safety boundaries** around how changes are applied, retried, logged, and rolled back.

It governs:
- What “apply change” means
- Allowed vs forbidden changes
- Idempotency and safe re-runs
- Rollback rules
- Execution logging
- Failure semantics

This PRD does **not** define:
- Decision logic (Hermes Decision Engine PRD)
- Agent signal production (Agent Contracts PRD)
- UI/UX (UI/UX Design Standards PRD)
- Billing or entitlements (Billing PRD)

---

## 2. Core Doctrine (Non-Negotiable)

These rules are **hard constraints**:

1. Execution is **strictly downstream** of Hermes
2. The Deployer never decides *what* to do — only *how*
3. All execution must be:
   - Idempotent
   - Auditable
   - Reversible (where possible)
4. Unsafe or ambiguous changes must be rejected
5. Execution must never exceed Hermes’ approved scope

---

## 3. Definition of “Apply Change”

An “apply change” operation means:

- Modifying site code or content **only** as specified by Hermes
- Acting on an explicit execution plan
- Producing deterministic results

Apply change does **not** mean:
- Free-form edits
- Opportunistic optimizations
- Guessing intent
- Bundling unrelated modifications

---

## 4. Allowed Change Types

The Deployer may apply **only** the following categories:

### 4.1 Content Changes
- Page content updates
- Headings (H1–H6)
- Meta titles and descriptions
- Internal links
- Structured data (where supported)

### 4.2 Structural Changes
- New pages explicitly requested by Hermes
- File additions tied to recommendations

### 4.3 Configuration Changes
- Site-level config files
- Build artifacts required for deployment

All changes must map directly to a Hermes-approved action.

---

## 5. Forbidden Changes

The Deployer must **never**:

- Modify unrelated pages
- Change branding or design systems
- Alter analytics, billing, or auth code
- Perform bulk site-wide refactors
- Apply destructive changes without rollback
- Act outside the current execution window (week)

Forbidden changes are **hard failures**.

---

## 6. Execution Scope & Limits

### 6.1 Weekly Scope

- Execution is limited to **current-week actions only**
- Future actions are queued, not executed
- “Fix Everything” applies only to the current week

---

### 6.2 Page Touch Limits

- Multiple changes to the same page are allowed **only if explicitly approved**
- Rapid, repeated changes without evidence are forbidden

---

## 7. Idempotency & Re-Runs

### 7.1 Idempotent Operations

All execution steps must be idempotent:
- Re-running the same action produces the same result
- No duplicated content
- No repeated side effects

---

### 7.2 Safe Re-Runs

If an execution is retried:
- Already-applied changes are detected and skipped
- Partial completion resumes safely
- No manual cleanup required

---

## 8. Rollback Rules

### 8.1 Rollback Capability

Where technically possible:
- Every change must have a rollback path
- Rollback artifacts must be preserved

Examples:
- Git revert
- Snapshot restore
- Content version rollback

---

### 8.2 Rollback Triggers

Rollback may occur when:
- Execution fails mid-run
- Hermes invalidates the plan
- User explicitly cancels execution

Rollback must restore the **last known good state**.

---

## 9. Failure Semantics

### 9.1 Partial Failure

If part of an execution fails:
- Completed actions remain applied
- Failed actions are marked failed
- Hermes is notified
- No automatic continuation without approval

---

### 9.2 Retry Rules

- Automatic retries are allowed for transient failures
- Retry count is limited
- Repeated failure marks the action as blocked

---

### 9.3 Abort Rules

Execution must abort immediately if:
- A forbidden change is detected
- Scope mismatch occurs
- Idempotency cannot be guaranteed

---

## 10. Execution Logging (Required)

Every execution must emit structured logs:

- execution_queued
- execution_started
- execution_step_started
- execution_step_completed
- execution_step_failed
- execution_completed
- execution_aborted

Logs must include:
- Plan ID
- Config version
- Action ID
- Target resource
- Timestamp

All logs are ingested by Socrates.

---

## 11. Environment Targets

Execution may target:
- GitHub-backed sites
- Arclo-hosted sites
- CMS integrations (e.g., WordPress plugin)

Each target must implement this contract.

---

## 12. Safety Guarantees

This contract guarantees:
- No silent site damage
- No runaway automation
- No execution outside intent
- Full auditability

If safety cannot be guaranteed, execution must not proceed.

---

## 13. Success Criteria

- Users trust automated changes
- Failures are explainable and reversible
- No destructive incidents
- Execution remains boring and predictable

---

## 14. Summary

The Deployer is Arclo’s **hands**.

Hermes decides.
The Deployer executes.
Socrates remembers.

This contract ensures that automation is powerful — and safe.
