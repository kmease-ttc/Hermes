# Arclo — Autonomous SEO Operating System

Arclo is an **autonomous, decision-driven SEO operating system** designed to help businesses grow organic traffic safely, predictably, and at scale.

This is not a collection of SEO tools.  
It is a system that **observes, decides, acts, and learns**.

---

## Start Here

If you’re new to this codebase, begin with the system overview:

➡️ **[Architecture Overview](./ARCHITECTURE_OVERVIEW.md)**

This explains:
- How Hermes, Agents, Socrates, and the Deployer fit together
- The system’s safety and trust model
- How autonomy is constrained and explained

For detailed behavior and contracts, see:

➡️ **[PRD Index](./PRD_INDEX.md)**

The PRDs are the source of truth for how the system works.

---

## Core Concepts

Arclo is built around four primary components:

### Hermes — Decision Engine
The brain of the system. Hermes:
- Synthesizes signals
- Resolves priority and conflicts
- Enforces change velocity
- Produces explainable plans

### Agents — Signal Producers
Specialized workers that:
- Observe specific domains (SERP, content, performance, competitors)
- Emit findings and candidate actions
- Never decide what to do

### Socrates — Learning & Knowledge
The memory of the system. Socrates:
- Ingests logs and outcomes
- Performs weekly learning synthesis
- Maintains doctrine (rules) and heuristics (patterns)

### Deployer — Execution Layer
The hands of the system. The Deployer:
- Applies Hermes-approved changes
- Enforces safety, idempotency, and rollback
- Never acts outside approved scope

---

## Design Principles

Arclo is intentionally designed to be:

- **Safe by default** — no bulk unsafe changes
- **Explainable** — every decision can be traced
- **Calm** — minimal configuration, predictable behavior
- **Trust-first** — no black boxes, no surprises

If the system is unsure, it prefers **not acting** over acting unsafely.

---

## Repository Structure

Key documentation files:

- `ARCHITECTURE_OVERVIEW.md` — system mental model
- `PRD_INDEX.md` — authoritative map of all PRDs
- `docs/prd/` — detailed system, product, and engineering contracts

Implementation follows the rules defined in these documents.

---

## How to Work in This Repo

Before building or modifying functionality:
1. Read the relevant PRD(s)
2. Verify changes do not violate system contracts
3. Prefer clarity and safety over cleverness
4. Log decisions and outcomes for observability

PRDs override personal preference.

---

## Status

- PRD set: **v1 COMPLETE**
- Architecture: **locked**
- Safe to proceed with implementation

---

## Philosophy

Arclo exists to answer one question for users:

> “What should I do next — and why?”

Everything in this repo exists to support that answer.
