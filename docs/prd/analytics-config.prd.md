# PRD — Analytics Configuration & Data Usage
(GA4 + Search Console)

---

## 1. Purpose & Scope

This PRD defines **how Arclo configures, ingests, surfaces, and uses analytics data** from:
- Google Analytics 4 (GA4)
- Google Search Console (GSC)

It governs:
- Configuration UX and gating
- Data ingestion and summarization
- Conditional dashboard metrics
- Weekly logging to Socrates
- Email reporting behavior

This PRD does **not** define:
- SEO recommendation logic (Mission Control PRD)
- Billing or entitlements (Billing PRD)
- Onboarding or paywall copy (Onboarding PRD)

---

## 2. Product Principles

- Analytics are **optional but strongly encouraged**
- Missing analytics **never block recommendations**
- Data improves confidence, not eligibility
- Setup must be calm, resumable, and prescriptive
- Read-only access only

---

## 3. Supported Integrations

### 3.1 Google Analytics 4 (GA4)
Metrics:
- Sessions
- Engagement rate
- Avg engagement time
- Pages per session
- Conversions (if configured)

### 3.2 Google Search Console (GSC)
Metrics:
- Impressions
- Clicks
- CTR
- Average position

---

## 4. Configuration Model

### 4.1 Guided Wizard

Analytics setup is a **step-by-step wizard** with:
- One task per screen
- Saved progress after every step
- Resume exactly where the user left off
- Clear completion state

---

### 4.2 Authentication

- OAuth “Sign in with Google” only
- No API keys or service accounts
- Read-only scopes
- Clear trust messaging

---

## 5. GA4 Setup Flow

### Step 1 — Connect Google Account
- User clicks “Connect Analytics”
- OAuth sign-in
- Explain read-only access

### Step 2 — Detect GA4 Property
If GA4 exists:
- List properties
- Recommend matching domain
- Allow manual selection

If GA4 does not exist:
- Explain requirement
- Link to GA4 creation
- Pause wizard until created

### Step 3 — Verify Data Flow
- Check if data is arriving
- If missing:
  - Explain likely causes
  - Allow user to continue anyway

---

## 6. Search Console Setup Flow

### Step 4 — Detect Properties
- Auto-detect existing GSC properties
- Prefer GA-based verification when possible

### Step 5 — Verification
Verification priority:
1. GA-based
2. URL-prefix (meta tag)
3. Domain (DNS)

Instructions are:
- Plain-language
- Prescriptive
- Minimal jargon

---

## 7. Configuration State Model

Each integration can be:
- Not configured
- Partially configured
- Fully configured

Overall analytics health is derived from both.

---

## 8. Dashboard Behavior

### 8.1 Conditional Metrics

If GA4 connected:
- Show traffic and engagement metrics

If GSC connected:
- Show search performance metrics

### 8.2 Missing Data

- Metrics are hidden, not zeroed
- Show “Configure Analytics” card
- No warnings or errors

---

## 9. Data Ingestion & Logging

### 9.1 Frequency
- Weekly collection only
- Aggregated summaries
- No event-level storage

### 9.2 Socrates Logging
Weekly summaries sent to Socrates:
- Traffic deltas
- Engagement changes
- Search trends

Used for:
- Learning
- Auditing
- Correlation analysis

---

## 10. Hermes Usage Rules

- Analytics never gate recommendations
- Missing data degrades confidence
- Only **directional correlation** allowed

Examples:
- “Traffic increased after content updates”
- “No traffic signal available yet”

---

## 11. Weekly Email Behavior

If analytics connected:
- Include traffic and search summaries

If analytics missing:
- Include ranking summaries only
- CTA to connect analytics

---

## 12. Trust & Security

- Read-only access
- No modification of GA4/GSC
- Users can revoke access at any time
- Revocation reflected immediately

---

## 13. Failure & Edge Cases

- Partial setup degrades gracefully
- Outages do not block reports
- Missing data never hides recommendations

---

## 14. Success Criteria

- Users complete setup without support
- Metrics appear only when valid
- Weekly emails adapt to data availability
- Analytics improves learning over time

---

## 15. Summary

Analytics in Arclo are:
- Optional
- Trust-first
- Calm to configure
- Powerful when present

They improve insight without increasing friction.
