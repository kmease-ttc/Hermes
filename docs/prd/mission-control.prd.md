# PRD — Mission Control / Core System
(Hermes · Agents · Socrates · Execution Loop)

---

## 1. Purpose & Scope

This PRD defines the **core operating system of Arclo**, referred to as **Mission Control**.

Mission Control is responsible for:
- Assembling trustworthy recommendations
- Coordinating agents
- Enforcing responsible change velocity
- Managing execution state
- Learning over time via Socrates

This document is the **canonical source of truth** for how the system behaves.

This PRD does **not** define:
- Commercial packaging or pricing
- Billing mechanics or entitlements
- Onboarding or marketing flows
- UI visual design

Those are governed by separate PRDs.

---

## 2. Problem Statement

SEO tools often produce:
- Conflicting advice
- Unsafe bulk changes
- Untraceable recommendations
- No learning loop

Mission Control exists to ensure Arclo is:
- **Trustworthy**
- **Auditable**
- **Responsible**
- **Self-improving**

Arclo is not an SEO tool.
It is an **operating system**.

---

## 3. Core Components

### 3.1 Hermes (Decision & Assembly Layer)

Hermes is the **only system allowed to generate final recommendations**.

Responsibilities:
- Ingest all agent outputs
- Reconcile conflicts
- Apply KBase doctrine
- Enforce pacing and safety
- Produce phased plans (Now / Next / Later)

No agent may bypass Hermes.

---

### 3.2 Agents (Workers)

Agents are **specialized signal producers**.

They:
- Run on a schedule or manually
- Emit findings and candidate actions
- Never decide priority
- Never recommend execution order

Examples:
- SERP agent
- Technical SEO agent
- Content decay agent
- Competitive intelligence agent

Agents may be:
- Always-on (free)
- Paid / gated
- Locked but still informative

---

### 3.3 Socrates (Logging & Learning System)

Socrates is the **memory and conscience** of the system.

Responsibilities:
- Ingest structured logs from all agents
- Track recommendation outcomes
- Publish weekly KBase guidance
- Support audits and debugging

Socrates does not make decisions.
Hermes consumes Socrates outputs.

---

## 4. Recommendation Assembly Rules

### 4.1 Inputs Hermes Must Consider

Hermes assembles recommendations using:
- Site crawl state
- Agent outputs
- Agent freshness & errors
- Analytics summaries (if available)
- Competitive signals (if unlocked)
- Historical execution
- KBase doctrine

Missing inputs never block recommendations, but **degrade confidence**.

---

### 4.2 Recommendation Confidence

Each recommendation must include:
- `confidence: full | degraded`

Degraded confidence is required when:
- Analytics missing
- Competitive intel locked
- Agents errored or stale

Confidence must be visible in the UI.

---

## 5. Responsible Change Velocity (Non-Negotiable)

### Doctrine

Bulk SEO changes can reduce trust and rankings.

Rules:
- Never recommend executing all fixes at once
- Always produce phased execution
- Limit actions per cycle
- Explain why pacing matters

Hermes enforces this automatically.

---

## 6. Recommendation Object (Canonical)

Each recommendation includes:
- Stable ID
- Category
- Agent sources
- Priority (relative)
- Confidence
- Action (imperative)
- Steps
- Evidence
- Definition of done
- Dependencies
- Risks
- KBase references
- Status:
  - Open
  - Acknowledged
  - Exported
  - Applied
  - Invalidated

---

## 7. Recommendation Lifecycle

### 7.1 Invalidation

Users may mark recommendations as:
- Incorrect
- Not applicable

Invalidation:
- Prevents resurfacing
- Feeds Socrates learning
- Is feedback, not failure

---

## 8. Agent Coverage & Defaults

### 8.1 Always-On Agents
- SERP
- Authority / backlinks
- Basic Hemingway (titles + ideas)
- Socrates

### 8.2 Bundled Agents
- Technical SEO (performance + CWV + decay)

### 8.3 Paid / Gated Agents
- Competitive intelligence
- Full Hemingway
- Autonomous publishing

Locked agents still influence prioritization.

---

## 9. Dashboard Requirements

Mission Control must expose:
- Agent coverage panel
- Agent freshness
- Error states
- Recommendation confidence
- Phased execution plan

This is the primary debugging surface.

---

## 10. Export & Execution

### 10.1 Manual-First Execution

Primary output:
- Human-readable report
- Email-ready
- Phased actions

Exports are immutable snapshots.

---

### 10.2 Autonomous Execution (Future)

When enabled:
- Actions are queued
- Progress tracked
- Failures logged
- Rollback possible

Out of scope for V1.

---

## 11. Logging & Observability

All agents must emit:
- run_started
- run_inputs
- run_outputs
- recommendations_emitted
- run_error
- run_completed

Missing logs degrade confidence but do not block output.

---

## 12. Weekly Learning Loop

### 12.1 KBase Publishing

Socrates publishes weekly:
- What worked
- What failed
- Updated heuristics
- Anti-patterns
- Change velocity guidance

No human approval required.

---

### 12.2 Consumption Rules

Agents do not read KBase directly.
Hermes enforces doctrine.

---

## 13. Failure Modes & Safety

- No silent failures
- Degraded states visible
- No unsafe bulk recommendations
- Locked features still informative

---

## 14. Success Criteria

- Recommendations align with reality
- Users trust advice
- Changes are paced
- Learning compounds weekly
- System improves over time

---

## 15. Summary

Mission Control ensures Arclo is:
- Responsible by design
- Trustworthy by default
- Auditable at all times
- Improving continuously

This is not an SEO engine.

It is the **brain** of Arclo.
