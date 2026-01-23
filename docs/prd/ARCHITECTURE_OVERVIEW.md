# ARCHITECTURE_OVERVIEW — Arclo System

This document provides a **high-level architectural overview** of Arclo for engineers, operators, and AI agents.

It is intentionally concise.  
Detailed behavior lives in the PRDs.

---

## 1. System Philosophy

Arclo is an **autonomous, decision-driven SEO operating system**, not a collection of tools.

The architecture is designed around:
- Clear separation of responsibilities
- Single sources of truth
- Safe automation
- Continuous learning

Every component has a **narrow, explicit role**.

---

## 2. Core Components

### 2.1 Hermes — Decision Engine

Hermes is the **brain** of the system.

Responsibilities:
- Assemble signals from agents
- Resolve priority and conflicts
- Enforce change velocity
- Produce phased execution plans
- Explain every decision

Hermes is the **only system** allowed to:
- Assign priority
- Decide what happens next
- Approve execution

---

### 2.2 Agents — Signal Producers

Agents are **specialized workers**.

They:
- Observe specific domains (SERP, content, performance, competitors)
- Emit findings, evidence, and candidate actions
- Never decide priority or execution

Agents are interchangeable and replaceable.

---

### 2.3 Socrates — Knowledge & Learning System

Socrates is the system’s **long-term memory**.

Responsibilities:
- Ingest logs and outcomes
- Perform weekly synthesis
- Maintain doctrine (rules) and heuristics (patterns)
- Feed learning back into Hermes

Socrates never makes decisions.

---

### 2.4 Deployer — Execution Layer

The Deployer is the system’s **hands**.

Responsibilities:
- Apply Hermes-approved changes
- Enforce execution safety rules
- Guarantee idempotency and rollback
- Emit execution logs

The Deployer never decides *what* to change.

---

## 3. Data & Control Flow

High-level flow:

1. User configures site (domain, geo scope, analytics)
2. Agents run and emit signals
3. Hermes synthesizes signals into a plan
4. Socrates records decisions and outcomes
5. Deployer executes approved actions
6. Results flow back into Socrates for learning

This loop repeats continuously.

---

## 4. Safety & Trust Model

Arclo is built around **trust preservation**.

Key safety guarantees:
- No silent actions
- No bulk unsafe changes
- All automation is explainable
- Every action is auditable
- Failures degrade gracefully

When in doubt, the system prefers **not acting** over acting unsafely.

---

## 5. Configuration Boundaries

- **Account config**: billing, email, profile
- **Site config**: domain, geo scope, agents, analytics

Configuration is:
- Explicit
- Versioned
- Safe by default

Changes are never inferred.

---

## 6. Observability

Every meaningful system action is logged.

The system can always answer:
- What happened
- When it happened
- Why it happened
- What rules were applied

Observability is a first-class feature.

---

## 7. Where to Go Next

For detailed behavior, refer to:
- `PRD_INDEX.md` — authoritative map
- Individual PRDs — system contracts

This document is the **mental model**.  
The PRDs are the **rules**.

---

## 8. Summary

Arclo is a system of:
- Signals (Agents)
- Decisions (Hermes)
- Memory (Socrates)
- Action (Deployer)

Each part does one thing well.

That discipline is what makes autonomy safe.
