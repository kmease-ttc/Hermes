# Hermes - ARQLO Orchestrator

## Role
**Orchestrator (Brain)** - Central coordinator for the ARQLO autonomous SEO system

## Intended Responsibilities
- Orchestrate multi-worker SEO analysis runs across 9 worker types
- Coordinate job execution via HTTP worker calls
- Aggregate results from Knowledge Base (kbase_events)
- Synthesize findings and generate actionable recommendations
- Track worker health and implement degradation policies
- Provide REST API for external clients
- Generate tickets from worker recommendations

## Integration Points

### Database
- **Access**: Yes, via Drizzle ORM
- **Tables**: Direct access to all tables (bypasses queue system)
- **Connection**: Via `DATABASE_URL` environment variable

### Queue
- **Uses queue-client**: No (uses direct HTTP calls to workers)
- **Pattern**: Synchronous HTTP POST to worker `/run` endpoints
- **Status**: ⚠️ Bypasses queue infrastructure (see C1 gap)

### KBase
- **Writes to kbase_events**: Partial (via Socrates audit logger)
- **Reads from kbase_events**: Yes (queries for worker results)

### HTTP
- **Exposes REST API**: Yes (Express.js on port 5000)
- **Endpoints**: Worker orchestration, health checks, configuration

## Service Name
`hermes` (orchestrator role)

## Always-On Runtime
**Yes** - Express server must be continuously available

## Key Files
- **Entry Point**: `server/index.ts`
- **Main Logic**: `server/workerOrchestrator.ts` (1,852 lines)
- **Worker Map**: Lines 30-40 in workerOrchestrator.ts
- **Call Function**: `callWorker()` function (HTTP POST to workers)
- **Result Synthesis**: `runWorkerOrchestration()` function

## Worker Coordination Map
```typescript
competitive_snapshot   → Natasha   (natasha:5000/run)
serp_intel           → Lookout   (lookout:5000/run)
crawl_render        → Scotty    (scotty:5000/run)
core_web_vitals     → Speedster (speedster:5000/run)
content_generator   → Hemingway  (hemingway:5000/run)
content_qa          → Hemingway  (hemingway:5000/run)
content_decay       → Sentinel   (sentinel:5000/run)
backlink_authority  → Beacon     (beacon:5000/run)
notifications       → Popular    (popular:5000/run)
```

## Dependencies
- **Other Repos**:
  - Indirectly depends on all worker repos (via HTTP)
  - Should depend on: queue-client, arclo-contracts (not yet adopted)
- **External**: Express, Drizzle ORM, postgres

## Environment Variables
- `DATABASE_URL` - Postgres connection string
- `PORT` - Server port (default: 5000)
- Worker endpoint URLs (configurable)

## Maturity Level
**Level 2-3**: Sophisticated orchestration with synthesis, but uses HTTP polling instead of queue-based dispatch

## Known Gaps
- **C1**: Should adopt queue-client for job dispatch instead of HTTP
- **H2**: Should use canonical service names from arclo-contracts
- Missing comprehensive API documentation
