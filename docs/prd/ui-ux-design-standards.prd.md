# PRD — UI/UX Design Standards & Design System
(Arclo Brand · Dashboards · Accessibility · Consistency)

---

## 1. Purpose & Scope

This PRD defines the **single, enforceable UI/UX design system** for Arclo.

It exists to:
- Eliminate visual inconsistency
- Ensure dashboards and marketing feel like one product
- Improve usability, trust, and perceived quality
- Enable repeatable UI implementation across Replit

This document applies to:
- Marketing site (arclo.pro)
- Product dashboards
- Internal tools
- All UI built by humans or AI

This PRD is **authoritative** for all UI decisions.

---

## 2. Design Philosophy

Arclo’s UI must feel:

- **Calm** — no visual noise
- **Confident** — strong hierarchy, clear actions
- **Insight-first** — data over decoration
- **Consistent** — patterns never change arbitrarily

Arclo is a **dashboard-first product**, not a content site.

---

## 3. Brand Foundations (Source of Truth)

Dashboards MUST inherit the marketing brand.

If something looks different from arclo.pro, it is a bug.

---

## 4. Color System (Locked)

### 4.1 Brand Colors

```text
Brand Purple:   #7C3AED
Brand Pink:     #EC4899
Brand Orange:   #F59E0B
Brand Green:    #22C55E
Brand Blue:     #3B82F6
```

### 4.2 Neutral Palette

```text
Background:         #FFFFFF
Soft Background:    #F9FAFB
Primary Text:       #0F172A
Secondary Text:     #475569
Borders / Dividers: #E5E7EB
```

Neutrals dominate dashboards. Brand colors are accents.

---

## 5. Gradient / Spectrum Usage

Approved gradient:

```text
Purple → Pink → Orange
#7C3AED → #EC4899 → #F59E0B
```

Rules:
- Never decorative
- Always semantic
- Consistent meaning everywhere

---

## 6. Typography

### Font Stack

```css
Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

Rules:
- No arbitrary sizes
- No ultra-light text
- Line-height favors readability

---

## 7. Layout & Spacing

- Grid-based layouts only
- Predictable margins
- No horizontal scroll in dashboards

---

## 8. Components

### Buttons
- One primary action per screen
- Gradient only for primary CTAs
- Loading + disabled states required

### Forms
- Labels always visible
- Inline validation
- Clear errors

---

## 9. Dashboards & Data Viz

Dashboards answer:
> What changed, and why does it matter?

Charts:
- Consistent color mapping
- Clear labels
- No over-stacking

---

## 10. Accessibility

- WCAG AA contrast
- Keyboard navigation
- Visible focus states
- Color never sole signal

---

## 11. Tailwind Rules

- Tokens defined in tailwind.config.js
- No inline styles
- No arbitrary hex values

---

## 12. Enforcement

- PR reviews reference this PRD
- UI inconsistency = bug
- Regressions fixed immediately

---

## 13. Summary

Arclo’s UI must feel:
- Designed
- Calm
- Consistent

This PRD is the contract for how Arclo looks and feels.
