# PRD — Agent Contracts & Interfaces
(Signal Production · Contracts · Logging · Failure Semantics · Geographic Scope)

---

## 1. Purpose & Scope

This PRD defines the **hard, enforceable contracts** governing all agents in the Arclo system.

It exists to ensure:
- Agents are predictable and safe
- Hermes remains the single decision-maker
- Socrates receives consistent, high-quality signals
- The system scales without incorrect assumptions (e.g., national vs local intent)

This PRD governs:
- Agent input contracts (including geographic scope)
- Agent output schemas
- Required logging
- Failure and degradation semantics
- Versioning and enforcement

This PRD does **not** define:
- Recommendation assembly logic (Mission Control PRD)
- Analytics configuration (Analytics PRD)
- Billing or entitlements (Billing PRD)

---

## 2. Core Doctrine (Hard Rules)

These rules are **non-negotiable**.

1. Agents are **signal producers only**
2. Agents do **not**:
   - Assign final priority
   - Decide execution order
   - Apply changes directly
3. Hermes is the **only** system that:
   - Assembles final recommendations
   - Enforces pacing
   - Decides execution

Any agent that violates these rules is non-compliant.

---

## 3. Agent Inputs (Allowed)

Agents may receive and read the following inputs only.

### 3.1 Explicit Inputs (Required)

Provided by Hermes or the orchestrator on every run:

- `site_id`
- `domain`
- `run_id`
- `run_reason`
- `time_window`
- `invocation_source`

---

### 3.2 Geographic Scope (NEW — REQUIRED)

Every agent run **must include geographic intent** so rankings and recommendations are interpreted correctly.

Required field:
- `geo_scope`

Allowed values:
- `national`
- `local`

If `geo_scope = local`, the following field is required:
- `geo_location` (object)

Example:
```json
{
  "geo_scope": "local",
  "geo_location": {
    "city": "Orlando",
    "state": "FL",
    "country": "US"
  }
}
```

Rules:
- Agents must never assume national intent by default
- Absence of geo_scope is a schema violation
- Hermes is responsible for providing geo_scope
- Agents must respect geo_scope when evaluating rankings

Purpose:
- Prevent false negatives (e.g., “psychiatrist near me” ranked nationally)
- Ensure accurate SERP interpretation
- Enable correct competitive comparisons

---

### 3.3 Shared System Context (Allowed)

- Site metadata
- Configuration state
- Entitlements
- Feature flags

---

### 3.4 Historical Memory (Allowed)

- Prior agent runs
- Prior findings
- Prior invalidations
- Prior execution history

---

### 3.5 Disallowed Inputs

Agents must **not** read:
- KBase doctrine directly
- Other agents’ raw outputs
- Billing or pricing logic

KBase guidance is applied **only by Hermes**.

---

## 4. Agent Outputs (Allowed)

Agents may emit **only** the following.

### 4.1 Findings
Objective observations:
- Metrics
- Deltas
- States
- Facts

Examples:
- “Page X has CWV LCP of 4.1s”
- “Keyword Y ranks #3 in Orlando, FL”

---

### 4.2 Candidate Actions
Suggested actions, **not recommendations**:
- No execution order
- No pacing
- No urgency framing

Example:
- “Create a location-specific page for Orlando psychiatry services”

---

### 4.3 Evidence
- URLs
- Metrics
- Timestamps
- Source systems
- Location context (if local)

---

### 4.4 Severity / Impact Hints
Optional, non-binding hints:
- low / medium / high
- numerical scores

Hermes may ignore these.

---

### 4.5 Explicitly Forbidden Outputs
Agents must **never** emit:
- Final recommendations
- Execution steps
- Phasing (Now / Next / Later)
- User-facing copy

---

## 5. Output Schema (Hybrid Enforcement)

### 5.1 Schema Model

- JSON is the canonical format
- A defined schema exists for each agent type
- Schema includes required and optional fields

### 5.2 Hybrid Enforcement Rules

- **Development**: soft enforcement, warnings logged
- **Production**: strict enforcement, invalid outputs rejected
- Invalid outputs:
  - Are not passed to Hermes
  - Are logged to Socrates
  - Degrade agent health

---

## 6. Agent Versioning

### 6.1 Required Version Fields

Every agent output must include:
- `agent_id`
- `agent_version`
- `schema_version`
- `run_id`
- `timestamp`

---

## 7. Logging Requirements (Socrates)

Each agent run must emit the following events:

- `run_started`
- `run_inputs`
- `run_outputs`
- `candidate_actions_emitted`
- `run_completed`

Conditional:
- `run_error`

Logs must include:
- Agent ID + version
- Run ID
- Duration
- Error details (if any)

---

## 8. Failure Semantics

### 8.1 Default Behavior

When an agent fails:
- Overall run continues
- Hermes proceeds with remaining agents
- Failed agent output ignored for that cycle
- System confidence degraded

Agents must **never** block a run.

---

### 8.2 Consecutive Failures

After N consecutive failures (default = 3):
- Agent marked **Degraded**
- UI reflects degraded state
- Hermes reduces weighting of that agent

---

## 9. Entitlement Awareness

- Agents may emit signals even if gated
- Agents must not self-suppress output
- Hermes handles all entitlement logic

---

## 10. Enforcement & Compliance

- Hermes validates schemas
- Non-compliant agents:
  - Have outputs rejected
  - Are flagged in Socrates
  - Surface errors in UI

---

## 11. Success Criteria

- No incorrect national vs local ranking assumptions
- Agents behave consistently across markets
- Hermes assembles accurate recommendations
- Trust is preserved during ranking fluctuations

---

## 12. Summary

Agent contracts are the **load-bearing walls** of Arclo.

Explicit geographic intent ensures:
- Accurate ranking interpretation
- Correct competitive analysis
- Trustworthy recommendations at scale
