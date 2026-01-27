# Arclo Pro – System & Agent Architecture

This document explains the purpose of each repository (agent/service) in the Arclo Pro system, how they relate to one another, and how data flows through the system. It is intended to be attached to every repo so Claude understands the full system context when working in any single codebase.

---

## System Overview

Arclo Pro is a modular, multi-service SEO and site operations platform. Each repository represents a focused service or core system component. All services operate on a shared concept of `website_id`, write structured results to a central Knowledge Base (KBase), and feed Hermes (the core agent), which reasons over signals and decides what to do.

No service works in isolation.

---

## Core Principles

- One website_id everywhere
- Write first, reason later
- Full traceability from recommendation to input
- Learning driven by real outcomes

---

## Hermes Core (Primary Agent)

Hermes is the central reasoning and decision engine.

It:
- Consumes outputs from all services via the Knowledge Base
- Explains why performance changed
- Prioritizes what to do next
- Enforces guardrails and escalation rules

Hermes never calls external APIs directly.

---

## Website Registry & Settings

Stores per-website configuration and policies:
- Base domain
- Competitor list
- Search Console property
- GA4 property ID
- Crawl limits
- Run frequency
- Safe mode settings

All services read from this registry using `website_id`.

---

## Scheduler / Job Orchestrator

Runs daily, weekly, and on-demand jobs across all services.

Responsibilities:
- Scheduling and fan-out execution
- Retries, rate limits, and timeouts
- Writing run status and results to the database

Designed to scale into a standalone multi-tenant service.

---

## Google Data Service (Search Console & GA4)

Handles all Google integrations:
- OAuth and token refresh
- Search Console metrics (impressions, clicks, CTR, position, queries, pages)
- GA4 metrics (sessions, users, landing pages, engagement)

Provides first-party truth for traffic and behavior.

---

## Keyword & Ranking Tracker

Maintains keyword intelligence:
- Top 100 keywords to rank for
- Ranking history
- SERP snapshots and volatility
- Competitor outrankings

Feeds Hermes quick wins and strategic targets.

---

## Technical SEO Analyzer

Performs crawl and structural analysis:
- Indexability, canonicals, redirects
- Broken links
- Performance signals
- Metadata and headings
- Sitemap and robots rules
- Internal linking

Writes structured technical issues to the Knowledge Base.

---

## Content & Page Analysis

Analyzes on-page content and intent:
- Content decay
- Cannibalization
- Coverage gaps vs competitors
- Page-level change tracking

Helps Hermes determine page weakness vs authority or ranking issues.

---

## Backlink & Authority Monitor

Tracks off-site authority signals:
- New and lost backlinks
- Authority proxies
- Anchor text
- Link velocity
- Competitor comparisons

Supports decisions around link-building and PR-style actions.

---

## Knowledge Base (KBase)

The shared memory of the system.

All services write results, decisions, and outcomes here. The KBase:
- Normalizes signals
- Stores historical context
- Captures what worked or failed
- Feeds Hermes learned best practices

This is where execution turns into learning.

---

## Execution / Fix Engine (When Enabled)

Applies approved changes:
- Technical SEO fixes
- Metadata updates
- Internal linking changes
- Content updates (within guardrails)

All actions are logged back to the Knowledge Base.

---

## UI / Admin Dashboard

Human-facing interface for:
- Reviewing reports
- Inspecting recommendations
- Approving or deferring actions
- Monitoring runs and alerts

The system can run fully headless.

---

## Alerts & Observability

Tracks system health:
- Run failures
- API quota issues
- Significant traffic drops
- Indexing anomalies

Ensures safety and debuggability at scale.

---

## How the System Works End-to-End

1. Scheduler triggers jobs per website_id
2. Services collect data and write to the Knowledge Base
3. Hermes reads aggregated signals
4. Hermes produces explanations and priorities
5. (Optional) Execution engine applies fixes
6. Outcomes are written back to the Knowledge Base
7. The system improves over time

---

## How Claude Should Use This Document

When working in any repo:
- Assume other services exist and cooperate
- Do not duplicate responsibilities
- Write outputs Hermes and KBase can consume
- Preserve traceability and learning signals

This document defines the intended system behavior.
