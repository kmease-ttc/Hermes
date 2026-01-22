# PRD — Hermes Decision Engine
(Priority Resolution · Conflict Handling · Change Velocity)

---

## 1. Purpose & Scope

This PRD defines the **Hermes Decision Engine**, the system responsible for synthesizing agent signals into safe, prioritized, and explainable recommendations.

Hermes is the **only authority** allowed to:
- Resolve priority
- Handle conflicts
- Enforce change velocity
- Produce phased execution plans
- Learn from outcomes and update the Knowledge Base (KBase)

This PRD governs:
- Priority resolution logic
- Conflict handling semantics
- Change velocity enforcement
- “Fix Everything” behavior
- Learning and feedback loops

This PRD does **not** define:
- Agent signal production (Agent Contracts PRD)
- Billing or entitlements (Billing PRD)
- Analytics ingestion (Analytics PRD)
- UI styling (UI/UX PRD)

---

## 2. Core Doctrine (Hard Rules)

These rules are **non-negotiable**:

1. Hermes is the **only component** that assigns priority.
2. Priority is **relative**, not absolute.
3. Agents may emit hints, but Hermes decides.
4. Hermes must reference **all available inputs**, including:
   - Agent outputs
   - Analytics summaries
   - Geographic scope
   - Historical execution
   - User invalidations
   - Knowledge Base doctrine
5. Hermes must write learnings back into the Knowledge Base when mistakes are identified.

---

## 3. Priority Resolution

### 3.1 Priority Inputs

Hermes may use **all of the following**:

- Agent findings and candidate actions
- Agent freshness and error state
- Geographic scope (local vs national)
- Analytics summaries (if available)
- Historical execution state
- User feedback and invalidations
- Knowledge Base heuristics and anti-patterns
- Entitlements and feature availability

No single input may dominate priority in isolation.

---

### 3.2 Relative Priority Model

Priority is computed **per site and per cycle**, not globally.

There are no absolute labels like “P0” or “Critical.”

Priority is contextual and time-bound.

---

## 4. Conflict Handling

Conflicts occur when:
- Two agents suggest opposing actions
- A candidate action contradicts prior outcomes
- A recommendation was previously invalidated
- A change risks undoing a recent fix

### 4.1 Conflict Resolution Rules

When a conflict is detected, Hermes must:

1. **Select one path forward**
2. **Annotate the decision** with reasoning
3. Defer the alternative action

Hermes must never silently suppress conflicts.

---

### 4.2 Learning From Conflicts

If a chosen action later proves incorrect:
- Hermes must record this as a **mistake**
- The mistake must be written to the Knowledge Base
- Future priority resolution must account for this learning

This prevents repeat failures at scale.

---

## 5. Change Velocity Enforcement (Non-Negotiable)

### 5.1 Phased Output

Hermes must always produce phased recommendations:

- **Week 1**
- **Week 2**
- **Week 3**

No unphased output is allowed.

---

### 5.2 Weekly Limits

Hermes must:
- Limit the number of actions per week
- Space high-impact changes over time
- Prevent unsafe bulk changes

Velocity rules are enforced even if the user requests otherwise.

Velocity thresholds are defined in the Knowledge Base and may evolve over time.

---

### 5.3 Page Touch Frequency

Hermes **may** touch the same page multiple times if justified, but must:
- Explain why
- Avoid rapid, repetitive changes without evidence

---

## 6. “Fix Everything” Semantics

### 6.1 Definition

“Fix Everything” means:
> Apply **all recommendations scheduled for the current week only**.

It does **not** mean:
- Execute future weeks early
- Override velocity limits
- Apply destructive changes

---

### 6.2 Behavior

When invoked:
- Only Week 1 actions are executed
- Future weeks remain queued
- User may cancel or pause execution

Execution respects all safety constraints.

---

## 7. Explanation & Transparency

Hermes must attach **human-readable reasoning** to each prioritized action, including:

- Why it was chosen
- Why it was scheduled for a specific week
- Why other actions were deferred

Hermes must also explain:
- Why something is *not* recommended yet
- Why confidence is degraded (if applicable)

---

## 8. Handling Missing or Degraded Inputs

When inputs are missing:
- Hermes still produces recommendations
- Confidence is degraded
- Velocity may be more conservative

Missing data never blocks output.

---

## 9. Determinism vs Adaptation

Hermes is **mostly deterministic**, but allows **small adaptive variance** to:
- Explore outcomes
- Avoid rigid failure modes

All adaptations must be observable and logged.

---

## 10. Failure & Safety

If Hermes errors:
- No new recommendations are generated
- Last known good plan remains visible
- Hermes retries automatically
- No user notification is required

Hermes must never take the system offline.

---

## 11. Success Criteria

- Recommendations are explainable and trusted
- Conflicts are handled transparently
- Changes are paced safely
- Learning compounds over time
- Hermes improves without destabilizing users

---

## 12. Summary

Hermes is the **decision brain** of Arclo.

By enforcing:
- Relative priority
- Conflict-aware synthesis
- Controlled velocity
- Continuous learning

Hermes ensures Arclo is safe, trustworthy, and adaptive at scale.
