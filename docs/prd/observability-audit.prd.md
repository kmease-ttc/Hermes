# PRD — Observability & Audit
(Trust · Debuggability · Accountability)

---

## 1. Purpose & Scope

This PRD defines **how Arclo observes, audits, and explains system behavior**, especially when things go wrong.

It exists to answer one question:

> “Why did the system do this?”

This PRD governs:
- What events must be logged
- How long logs are retained
- What is user-visible vs internal
- Debug vs production visibility
- How Hermes decisions are explained and audited

This PRD is critical because Arclo:
- Executes autonomous actions
- Synthesizes multiple signals
- Makes decisions on behalf of users
- Must maintain trust at scale

---

## 2. Core Principles (Non-Negotiable)

- No silent decisions
- No black boxes
- Observability favors clarity over completeness
- Auditability favors explanation over raw logs
- Failures must be understandable after the fact

---

## 3. Event Taxonomy (What Must Be Logged)

All system activity must be traceable through **structured events**.

### 3.1 Required Event Categories

#### Agent Events
- agent_run_started
- agent_run_inputs
- agent_run_outputs
- agent_candidate_actions_emitted
- agent_run_error
- agent_run_completed

#### Hermes Events
- hermes_plan_generated
- hermes_priority_resolved
- hermes_conflict_detected
- hermes_conflict_resolved
- hermes_plan_phased
- hermes_plan_invalidated
- hermes_error

#### Execution Events
- execution_queued
- execution_started
- execution_completed
- execution_failed
- execution_cancelled

#### Learning Events (Socrates)
- learning_candidate_created
- heuristic_promoted
- doctrine_created
- knowledge_entry_deprecated

---

## 4. Event Structure

All events must include:

- event_type
- timestamp
- site_id
- run_id
- config_version
- agent_id (if applicable)
- hermes_version (if applicable)
- severity
- summary
- structured_payload

Events without required fields are invalid.

---

## 5. Retention & Storage

### 5.1 Retention Periods

- Raw execution logs: **90 days**
- Aggregated summaries: **1 year**
- Knowledge Base entries: **indefinite**
- User-visible audit summaries: **indefinite**

Retention must balance:
- Cost
- Privacy
- Audit needs

---

## 6. User-Visible vs Internal Observability

### 6.1 User-Visible (Default)

Users may see:
- What plan was generated
- What actions were taken
- Why actions were prioritized
- Why something was deferred or blocked
- Confidence and degradation reasons

This appears in:
- Dashboard
- Plan views
- “Why did Hermes do this?” explanations

---

### 6.2 Internal-Only (Restricted)

Internal-only logs include:
- Raw agent payloads
- Stack traces
- Internal scoring weights
- Experimental heuristics

These are never exposed to users.

---

## 7. “Why Did Hermes Do This?” Surface

Hermes must provide an **explanation object** alongside every plan.

Explanation includes:
- Primary signals considered
- Conflicts resolved
- Knowledge Base rules applied
- Reasons for phasing
- Reasons for degraded confidence

This explanation must be:
- Human-readable
- Deterministic
- Stable across refreshes

---

## 8. Debug vs Production Visibility

### 8.1 Production Mode (Default)

- Minimal but sufficient explanations
- No raw logs
- No internal scoring

---

### 8.2 Debug Mode (Internal / Trusted)

- Expanded event visibility
- Raw inputs and outputs
- Execution traces
- Disabled by default

Debug mode must never be enabled accidentally.

---

## 9. Failure & Incident Analysis

When failures occur:
- The last known good plan remains visible
- Failure events are logged
- Hermes retries silently
- No user panic messaging

Post-incident analysis must be possible using logs alone.

---

## 10. Auditability & Compliance

The system must support:
- Timeline reconstruction
- Decision traceability
- Configuration replay
- Version-based analysis

Audits must answer:
- What happened
- When it happened
- Why it happened
- What rules were applied

---

## 11. Success Criteria

- Engineers can debug issues without guesswork
- Users trust the system’s decisions
- Autonomous behavior feels explainable
- No “black box” accusations
- Postmortems are factual, not speculative

---

## 12. Summary

Observability in Arclo is not about volume.

It is about **trust**.

If we can always explain:
> “What happened, and why”

Then the system is working as intended.
