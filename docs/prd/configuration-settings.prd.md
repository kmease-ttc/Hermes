# PRD — Configuration & Settings
(Account vs Site · Triggers · Versioning · Safety)

---

## 1. Purpose & Scope

This PRD defines **how configuration and settings work as a system in Arclo**.

It establishes:
- Clear boundaries between account-level and site-level configuration
- Rules for when changes trigger re-analysis
- Immediate vs deferred behavior
- Configuration versioning
- Safe defaults to minimize user error

This PRD is intentionally **lightweight but enforceable**.

This PRD does **not** define:
- Recommendation logic (Hermes Decision Engine PRD)
- Agent signal production (Agent Contracts PRD)
- Billing mechanics (Billing PRD)
- UI styling (UI/UX Design Standards PRD)

---

## 2. Configuration Model Overview

Arclo has **two configuration layers**:

1. **Account Configuration** (global)
2. **Site Configuration** (per domain)

These layers must never be mixed.

---

## 3. Account-Level Configuration

Account-level configuration applies across all sites owned by an account.

### 3.1 Account Config Includes

- Billing & subscriptions
- Payment method
- Email preferences
- Account profile information
- Future: organization / team settings

### 3.2 Account Config Rules

- Account config changes **never trigger re-analysis**
- Account config changes do **not** affect Hermes plans
- Account config is applied immediately

---

## 4. Site-Level Configuration

Site-level configuration applies **per domain** and directly affects analysis.

### 4.1 Site Config Includes

- Domain
- Geographic scope (local / national)
- Geographic location (if local)
- Enabled agents
- Keyword tier
- Competitor list
- Analytics connections (GA4, GSC)

---

## 5. Re-Analysis Triggers

### 5.1 Always Triggers Re-Analysis

The following site config changes **must** trigger a new analysis:

- Geographic scope change
- City / state / country change
- Keyword tier change
- Competitor list add/remove
- Analytics connection added or removed

---

### 5.2 Does NOT Trigger Re-Analysis

The following changes **must not** trigger analysis:

- Billing changes
- Email preferences
- UI-only preferences
- Viewing or exporting reports

---

## 6. Immediate vs Deferred Behavior

### 6.1 Immediate Re-Analysis

The following changes trigger **immediate re-analysis**:

- Geographic scope changes
- Location changes
- Competitor list changes

These materially change how rankings are interpreted.

---

### 6.2 Deferred Re-Analysis

The following changes are **queued for the next scheduled cycle**:

- Keyword tier increases or decreases
- Analytics connection changes (unless user explicitly requests refresh)

Hermes remains responsible for pacing execution.

---

## 7. Configuration Versioning

### 7.1 Version Model

- Every site has a `config_version`
- Any material site config change increments the version
- Hermes records the config version used for each plan

---

### 7.2 Plan Invalidation

If a site’s `config_version` changes:
- Existing plans are marked **stale**
- New plans must be generated
- Historical plans remain viewable for audit

---

## 8. Safe Defaults (Non-Negotiable)

When a site is first created:

- Geo scope: `local`
- Country: `US`
- City / State: required before analysis
- Core agents: enabled
- Paid agents: disabled
- Analytics: disconnected but encouraged
- Change velocity: conservative
- “Fix Everything”: disabled until first plan exists

Defaults are chosen to **minimize risk and confusion**.

---

## 9. User Experience Principles

- Configuration must feel calm and reversible
- Changes must explain their impact
- Users must never be surprised by re-analysis
- Unsafe combinations must be prevented, not warned about

---

## 10. Enforcement Rules

- Hermes validates config completeness before analysis
- Missing required site config blocks analysis
- Account config is never passed to agents
- Site config is always passed to agents via Hermes

---

## 11. Failure & Recovery

- Partial config does not corrupt state
- Failed config updates roll back cleanly
- Users can always recover to a valid configuration

---

## 12. Success Criteria

- Users understand what settings affect results
- No accidental re-analysis storms
- Plans always reference a known config version
- Fewer “why did this change?” questions

---

## 13. Summary

Configuration in Arclo is:
- Explicit
- Versioned
- Safe by default
- Calm to change

This PRD is the **glue layer** that keeps the system coherent as it scales.
