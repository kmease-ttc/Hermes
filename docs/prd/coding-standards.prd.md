# PRD — Coding Best Practices & Engineering Standards

---

## 1. Purpose & Scope

This PRD defines a **single, enforceable set of coding standards** for all Arclo projects.

Its purpose is to improve:
- Code quality
- Security
- Maintainability
- Developer velocity

This document applies to **all production code**, across **all repositories**, and to **all contributors** (human or AI).

---

## 2. Problem Statement

Code quality is inconsistent across contributors and repositories, leading to:
- Hard-to-maintain code
- Hidden bugs and security risks
- Slower onboarding
- QA and release friction

A shared contract is required for how code is written, reviewed, and shipped.

---

## 3. Goals

- Make code predictable and readable
- Reduce defects before QA
- Enable automation (linting, testing, CI gates)
- Speed up onboarding and PR reviews

---

## 4. Non-Goals

- Dictating business logic or product decisions
- Replacing PRDs or architecture standards
- Supporting every language edge case  
  (Standards optimize for the primary stack.)

---

## 5. Scope of Enforcement

Applies to:
- All production code
- All repositories in Replit
- All contributors (engineers, contractors, AI agents)

---

## 6. Coding Standards (Requirements)

### 6.1 Code Structure
- Clear separation of concerns
- Small, focused functions
- No duplicated logic
- Explicit error handling (no silent failures)

---

### 6.2 Readability
- Descriptive naming (no single-letter variables outside loops)
- Functions do one thing
- Comments explain **why**, not **what**

---

### 6.3 Error Handling
- All external calls must handle failure
- No unhandled promises or exceptions
- Errors must be logged with meaningful context

---

### 6.4 Security
- No secrets in code or commits
- Input validation on all boundaries
- Least-privilege access by default

---

### 6.5 Testing
- New logic requires tests
- Bug fixes require regression tests
- Tests must be deterministic and repeatable

---

### 6.6 Performance
- Avoid unnecessary loops and calls
- Use async where appropriate
- Performance-sensitive paths must be documented

---

## 7. Tooling & Enforcement

- Language-appropriate linters are required
- Formatting is enforced automatically
- CI must block merges on:
  - Lint failures
  - Test failures
  - Quality gate violations

---

## 8. PR Review Expectations

- Reviews reference this PRD, not personal opinion
- Style debates are resolved by the standard
- Non-compliant code is not merged

---

## 9. Rollout Plan

1. Add this PRD to the repository
2. Align linting and CI to the standards
3. Update PR templates to reference this PRD
4. Enforce standards on **new code only**  
   (No mass rewrites of legacy code)

---

## 10. Success Metrics

- Reduced PR review cycles
- Lower defect escape rate
- Faster onboarding of new contributors
- Fewer style-related review comments

---

## 11. Summary

Engineering standards in Arclo are:
- Explicit
- Enforceable
- Automation-friendly
- Designed to reduce friction, not create it

This PRD is the shared contract for how code is written and shipped.
