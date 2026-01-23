# PRD_INDEX — Arclo Product & System Specifications

This document is the **authoritative index** of all Product Requirement Documents (PRDs) for Arclo.

It exists to:
- Provide a single entry point into the system design
- Prevent scope drift
- Clarify ownership and boundaries
- Make it easy for humans and AI agents to navigate the architecture

All PRDs listed here are considered **active and authoritative** unless explicitly marked otherwise.

---

## 1. Core Intelligence & System Architecture

These PRDs define how Arclo thinks, decides, and learns.

1. **Mission Control / Core System**  
   `mission-control.prd.md`  
   Defines the overall operating system and responsibilities of Hermes, Agents, and Socrates.

2. **Hermes Decision Engine**  
   `hermes-decision-engine.prd.md`  
   Defines priority resolution, conflict handling, and change velocity enforcement.

3. **Agent Contracts & Interfaces**  
   `agent-contracts-interfaces.prd.md`  
   Defines what agents may emit, required schemas, logging, failure semantics, and geographic scope.

4. **Socrates Knowledge Base & Learning System**  
   `socrates-knowledge-base-learning.prd.md`  
   Defines weekly learning synthesis, doctrine vs heuristics, and how learning compounds safely.

---

## 2. Execution & Safety

These PRDs define how decisions become actions without causing harm.

5. **Execution / Deployer Contract**  
   `execution-deployer-contract.prd.md`  
   Defines what “apply change” means, allowed vs forbidden actions, idempotency, rollback, and failure handling.

6. **Observability & Audit**  
   `observability-audit.prd.md`  
   Defines logging, auditability, user-visible explanations, and “Why did Hermes do this?” surfaces.

---

## 3. Configuration & Inputs

These PRDs define how inputs enter the system and affect behavior.

7. **Configuration & Settings**  
   `configuration-settings.prd.md`  
   Defines account vs site config, re-analysis triggers, versioning, and safe defaults.

8. **Analytics Configuration & Data Usage**  
   `analytics-config.prd.md`  
   Defines GA4/GSC setup, conditional metrics, logging to Socrates, and analytics-driven insights.

---

## 4. Product, Commercial, & Growth

These PRDs define what Arclo sells and how users experience it.

9. **Commercial SEO / Packaging & Pricing**  
   `commercial-seo.prd.md`  
   Defines base plans, add-ons, keyword tiers, competitor intel, hosting, and autonomy pricing.

10. **Billing, Subscriptions & Entitlements**  
    `billing.prd.md`  
    Defines subscription lifecycle, entitlements, upgrades, downgrades, cancellation, and account deletion.

11. **Onboarding & First-Week Experience**  
    `onboarding-first-week.prd.md`  
    Defines signup, free report, paywall, subscription conversion, and week-one activation.

---

## 5. Engineering & Design Standards

These PRDs define how Arclo is built and how it looks.

12. **Coding Best Practices & Engineering Standards**  
    `coding-standards.prd.md`  
    Defines code quality, security, testing, performance, and CI enforcement.

13. **UI/UX Design Standards & Design System**  
    `ui-ux-design-standards.prd.md`  
    Defines brand colors, typography, gradients, dashboard patterns, accessibility, and Tailwind rules.

---

## 6. Governance Rules

- PRDs listed here are **canonical**
- Changes to PRDs must be deliberate and reviewed
- No feature may contradict an active PRD
- When conflicts arise, **core system PRDs take precedence**

Priority order:
1. Mission Control
2. Hermes Decision Engine
3. Agent Contracts
4. Execution / Observability
5. Configuration / Analytics
6. Commercial / Onboarding
7. Engineering / Design Standards

---

## 7. Status

- **PRD set: v1 COMPLETE**
- All major structural risks addressed
- Safe to proceed with implementation

This index is the map.  
The PRDs are the territory.
