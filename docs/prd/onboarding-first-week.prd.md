# PRD — Onboarding & First-Week Experience  
(Signup → Free Report → Paywall → Subscription → Activation)

---

## 1. Purpose & Scope

This PRD defines the **end-to-end onboarding and first-week experience** for Arclo users, from initial signup through free report, paywall, subscription, and early retention.

It governs:
- User flows and gating
- Paywall behavior
- Copy tone and emotional framing
- Week-one email cadence
- Activation success criteria

This PRD does **not** define:
- SEO recommendation logic (Mission Control PRD)
- Analytics configuration details (Analytics Config PRD)
- Billing mechanics or entitlements (Billing PRD)

---

## 2. Target User & Emotional Objective

### 2.1 Primary Personas
- Local SMB owner (non-technical, time-poor)
- Solo founder / builder

Assumptions:
- Limited SEO knowledge
- Easily overwhelmed by tools
- Motivated by competitive pressure and visible wins

### 2.2 Primary Emotional Outcome (Week 1)

By the end of Week 1, the user should feel:

> **“I’ve uncovered a real competitive advantage — and Arclo is quietly working for me.”**

Supporting emotions:
- Clarity
- Urgency
- Confidence
- Relief

---

## 3. Signup & Account Creation

### 3.1 Minimum Required at Signup
- Email address
- Website URL

No password, billing, analytics, or configuration required to start.

### 3.2 Authentication
- Password-based login
- Magic links are out of scope for now

---

## 4. Free SEO Report (Loss Leader)

### 4.1 Entry Point
- User explicitly clicks **“Generate Free SEO Report”**
- Report does **not** auto-run on signup

### 4.2 Report Generation Timing
- Target runtime: **< 60 seconds**
- If runtime exceeds ~60 seconds:
  - Show progress screen
  - Continue asynchronously
  - Email user when complete

### 4.3 Waiting Screen (High-Conversion Moment)

While the report runs, show rotating, value-driven messages such as:
- “Most businesses rank for less than 20% of the keywords they should.”
- “Your competitors are capturing demand you already earned.”
- “Consistent SEO compounds — waiting costs traffic every week.”

This screen is **intentional marketing real estate**, not dead time.

---

## 5. Free Report Content & Emphasis

The free report focuses on **two things only**:

### 5.1 Keyword Reality
- Ranked keywords
- Unranked keywords
- Top 10 placements
- #1 positions

### 5.2 Missed Opportunity (Competitive Framing)
- Keywords the site *should* rank for but doesn’t
- Framed explicitly as:
  > “Your competitors are appearing here instead.”

Technical issues are present but de-emphasized.

**Goal:**  
> “You’re leaving money on the table.”

---

## 6. Transition to Paywall

### 6.1 Account Creation Trigger
After viewing the free report:
- User clicks **“Create Account”**
- Account is created immediately
- User is logged in
- User is placed behind the paywall

### 6.2 Paywall Rules
- Paywall appears **after** the free report
- User may log in freely
- Paywall persists until subscription
- Navigation, settings, and billing are **always accessible**

### 6.3 Free Report Post-Paywall
- Original free report:
  - Remains downloadable
  - Clearly marked **“Stale”**
  - Cannot be refreshed or regenerated

---

## 7. Paywall Design & Tone

### 7.1 Tone
- Urgent, but not manipulative
- Confident, not apologetic

Core framing:
> “Every week you don’t act, competitors capture traffic that should be yours.”

### 7.2 Pricing Presentation
- Pricing shown **inline on the paywall**
- No redirect to a separate pricing page
- Plans shown:
  - **Basic (Recommended)** — Reports + Recommendations

### 7.3 Pricing Rules (Onboarding Only)
- Monthly pricing only
- No annual discounts shown during onboarding
- Basic plan visually emphasized as **Recommended**

---

## 8. Post-Subscription Activation

### 8.1 Immediate Outcome After Subscribe
Once subscribed:
- Confirmation that:
  - Weekly reports are scheduled
  - Account is fully active
- User lands on dashboard
- No blocking setup steps

### 8.2 Analytics Configuration (Optional)
- Analytics setup is visible but optional
- Framed as:
  > “Improve insight by connecting analytics”
- No blocking behavior

---

## 9. First-Week Email Cadence

### 9.1 Volume
- **2–3 emails max** in Week 1

### 9.2 Email Types

#### 1. Report Completion Email
- Sent if report ran asynchronously
- Reinforces urgency
- CTA to create account / subscribe

#### 2. Follow-Up Email (If Not Subscribed)
- Partial report excerpt
- Concrete missed opportunities
- Strong CTA to subscribe
- Only **one** follow-up

#### 3. First Weekly Report (Subscribed Users)
- Sent a few days after subscription
- Establishes cadence and expectation

### 9.3 Achievement Emails (Future-Ready)
- Triggered on ranking improvements:
  - “🎉 You just moved into the Top 10”
- Not required for V1

---

## 10. Failure & Drop-Off Handling

### 10.1 User Does Not Subscribe
- One follow-up email only
- Focus on urgency and opportunity
- No drip campaigns

### 10.2 Passive Subscribers
- Passive usage is acceptable
- Value delivered via weekly reports
- No forced actions

---

## 11. Week-One Success Criteria

**Primary success:**
1. Subscription conversion
2. First paid weekly report delivered

**Secondary success (optional):**
- Analytics connected

---

## 12. Non-Negotiable Principles

- No overwhelming setup
- No blocking flows
- No shaming missing configuration
- Value first, pressure second
- Urgency without dark patterns

---

## 13. Summary

If a user ends Week 1 believing:

> **“This is quietly working for me in the background.”**

Then onboarding has succeeded.
