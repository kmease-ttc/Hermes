# PRD — Socrates Knowledge Base & Learning System
(Weekly Synthesis · Doctrine vs Heuristics · System Learning)

---

## 1. Purpose & Scope

This PRD defines **Socrates**, the learning and knowledge system that allows Arclo to **compound intelligence over time**.

Socrates is responsible for:
- Capturing outcomes and mistakes
- Synthesizing weekly learnings
- Producing enforceable doctrine and flexible heuristics
- Feeding guidance back into Hermes

This PRD governs:
- How learning is captured
- Weekly synthesis rules
- Doctrine vs heuristics separation
- How guidance is consumed (indirectly) by agents

This PRD does **not** define:
- Decision logic (Hermes PRD)
- Agent signal production (Agent Contracts PRD)
- UI behavior (UI/UX PRD)

---

## 2. Core Doctrine (Hard Rules)

These rules are **non-negotiable**:

1. Socrates **never makes decisions**
2. Socrates **never emits recommendations**
3. Socrates **never talks directly to agents**
4. Hermes is the only consumer of Socrates outputs
5. All learning must be traceable to evidence

Socrates is memory, not judgment.

---

## 3. What Socrates Ingests

Socrates ingests **structured logs and outcomes** from across the system.

### 3.1 Required Inputs

- Agent run logs
- Hermes decisions and annotations
- Recommendation execution state
- User invalidations and feedback
- Analytics summaries (when available)
- Error and failure events

All inputs must be timestamped and versioned.

---

## 4. Learning Types

Socrates classifies learning into two categories:

### 4.1 Doctrine (Hard Rules)

Doctrine represents **rules that should almost never be violated**.

Examples:
- “Bulk title changes cause ranking volatility”
- “Local intent keywords must not be evaluated nationally”
- “High-impact changes must be spaced over weeks”

Properties:
- Enforced by Hermes
- Overrides heuristics
- Changes slowly
- Requires strong evidence

---

### 4.2 Heuristics (Soft Guidance)

Heuristics are **probabilistic patterns**, not guarantees.

Examples:
- “Internal linking often improves mid-tail keywords”
- “Pages with fresh content tend to recover faster”
- “Competitor gaps are good early targets”

Properties:
- Influence priority, not mandate it
- Can be overridden by context
- Change frequently
- Allow experimentation

---

## 5. Weekly Synthesis Process

### 5.1 Schedule

Socrates performs synthesis **once per week**.

Each synthesis window analyzes:
- The prior week’s executions
- Observed outcomes
- Conflicts and failures

---

### 5.2 Synthesis Rules

Weekly synthesis must:
1. Identify **what worked**
2. Identify **what failed**
3. Detect repeated patterns
4. Promote or demote heuristics
5. Propose new doctrine (if evidence is strong)

No human approval is required.

---

## 6. Knowledge Base Structure

Socrates produces **Knowledge Base entries** with:

- `type`: doctrine | heuristic
- `summary`
- `supporting_evidence`
- `confidence_level`
- `introduced_at`
- `last_updated_at`
- `applicability_constraints`
- `supersedes` (optional)

Knowledge is versioned and never silently overwritten.

---

## 7. Consumption by Hermes

### 7.1 Indirect Consumption Only

- Agents do **not** read the Knowledge Base
- Hermes is the only consumer
- Hermes applies doctrine first, heuristics second

---

### 7.2 Enforcement Rules

- Doctrine **must be enforced**
- Heuristics **may influence** priority and pacing
- Conflicts between heuristics are resolved contextually
- Doctrine always wins over heuristics

---

## 8. Learning From Mistakes

When Hermes determines a decision was wrong:
- The mistake is logged
- Context is captured
- A learning candidate is created

If repeated:
- Heuristic confidence increases
- Or doctrine is proposed

Mistakes are **inputs**, not failures.

---

## 9. Safety & Drift Control

To prevent runaway behavior:
- Doctrine changes require multiple confirmations
- Heuristics decay if not reinforced
- Obsolete learnings are retired, not deleted

Socrates favors stability over novelty.

---

## 10. Transparency & Auditability

All knowledge entries must be:
- Inspectable
- Auditable
- Explainable

Future UI may surface:
- “Why Hermes did this”
- “What we’ve learned recently”

---

## 11. Failure Handling

If Socrates fails:
- No learning update occurs
- Last known Knowledge Base remains active
- Hermes continues normally

Learning failures must never break recommendations.

---

## 12. Success Criteria

- System improves week over week
- Fewer repeated mistakes
- Clear separation of rules vs patterns
- Hermes decisions become more stable
- Trust increases over time

---

## 13. Summary

Socrates is Arclo’s **long-term memory**.

By separating:
- Doctrine (rules)
- Heuristics (patterns)

Socrates enables safe, compounding intelligence without chaos.
