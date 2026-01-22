# PRD — Billing, Subscriptions & Entitlements
(Money → Access → Behavior)

---

## 1. Purpose & Scope

This PRD defines **how billing, subscriptions, and entitlements work in Arclo**, and how paid state maps to product behavior.

It governs:
- Subscription lifecycle
- Add-on management
- Entitlement checks
- Friendly cancellation and account deletion
- Grace periods and failure handling

This PRD does **not** define:
- Pricing amounts (Commercial SEO PRD)
- Paywall UX (Onboarding PRD)
- Recommendation logic (Mission Control PRD)

---

## 2. Core Principles (Non-Negotiable)

- Billing must be **transparent and reversible**
- Cancellation must be **easy and respectful**
- Entitlements must be **explicit and inspectable**
- Missing payment degrades access, not data
- Users should never feel trapped

---

## 3. Subscription Model

### 3.1 Base Subscription

- Every paid account has exactly **one base subscription**
- Base subscription is required for:
  - Weekly reports
  - Recommendations
  - Ongoing SERP tracking
  - Exports

If base subscription is inactive:
- No new reports generated
- Existing data remains viewable (read-only)

---

### 3.2 Add-On Subscriptions

Add-ons are independent, modular subscriptions:
- Keyword tier upgrades
- Competitor intelligence
- Hemingway (content grading / blogs)
- Hosting
- Autonomous publishing

Rules:
- Add-ons require an active base subscription
- Add-ons can be enabled/disabled independently
- Only one keyword tier may be active at a time

---

## 4. Entitlement Model

### 4.1 Canonical Entitlement Object

Each account has an entitlement state containing:

- `base_plan_active: boolean`
- `keyword_tier: 25 | 100 | 250 | 500`
- `competitor_intel_enabled: boolean`
- `competitor_count_limit: number`
- `hemingway_enabled: boolean`
- `hosting_enabled: boolean`
- `autonomy_enabled: boolean`
- `analytics_connected: boolean` (non-billing)

Entitlements are computed, not inferred.

---

### 4.2 Entitlement Enforcement Rules

- UI elements are gated by entitlements
- Locked features remain visible but disabled
- Locked features show **Subscribe / Upgrade** CTAs
- Hermes still receives locked signals (with degraded confidence)

---

## 5. Subscription Lifecycle

### 5.1 Trial / Free State

- One-time free SEO report allowed
- No recurring billing
- No entitlement persistence beyond report snapshot

---

### 5.2 Active Subscription

When active:
- Reports are generated on schedule
- Agents run according to entitlements
- Weekly emails are sent

---

### 5.3 Payment Failure (Graceful Degradation)

On payment failure:
- Enter **grace period** (7 days)
- Notify user via email + UI banner
- Continue normal operation during grace period

After grace period:
- Base subscription becomes inactive
- Reports pause
- Data remains accessible

---

### 5.4 Cancellation

Cancellation behavior:
- Effective at end of billing cycle
- No immediate shutdown
- User retains access until period ends

Post-cancellation:
- Reports stop
- Data remains viewable
- Re-subscription restores full access

---

## 6. Add-On Changes

### 6.1 Upgrades

- Take effect immediately
- Prorated billing
- Entitlements update in real time

### 6.2 Downgrades

- Take effect next billing cycle
- Existing limits honored until cycle end

---

## 7. Hosting & Autonomy Coupling

Rules:
- Autonomous publishing requires hosting
- If hosting is cancelled:
  - Autonomy is automatically disabled
  - No changes are applied
  - Existing site state preserved

---

## 8. Account Deletion

### 8.1 User-Initiated Deletion

From settings, user may:
- Cancel subscriptions
- Delete account

Deletion behavior:
- Subscriptions cancelled
- Credentials revoked
- Data deleted after retention window (TBD)
- No recovery after deletion

This flow must be:
- Self-serve
- One-click accessible
- Clearly explained

---

## 9. Auditing & Transparency

Users must be able to see:
- Current plan
- Active add-ons
- Keyword limits
- Billing status
- Next charge date

No hidden state.

---

## 10. Failure & Edge Cases

- Billing outages do not corrupt entitlements
- Entitlement mismatches fail closed (disable feature)
- No silent access escalation

---

## 11. Success Criteria

- Users understand what they pay for
- Cancellation is low-friction
- Support tickets about billing are minimal
- Entitlements match expectations
- Trust is maintained even on failure

---

## 12. Summary

Billing in Arclo is:
- Predictable
- Modular
- Respectful
- User-first

Money unlocks capability — never control.
