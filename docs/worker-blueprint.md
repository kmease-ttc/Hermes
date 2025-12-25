# Gold Standard Worker Blueprint for Hermes Integrations

## Overview

This document defines the canonical architecture standard for all microservice workers that integrate with Hermes (the SEO orchestrator). Every worker must implement this contract to ensure:

- Reliable Test Connection and Smoke Test operations
- Consistent Diagnostics Pipeline execution
- Easy failure diagnosis
- Elimination of "Unexpected token <!DOCTYPE" errors

**Schema Version**: 2025-12-25

---

## Table of Contents

1. [Worker API Contract](#1-worker-api-contract)
2. [Worker Auth Contract](#2-worker-auth-contract)
3. [Worker Response Contract](#3-worker-response-contract)
4. [Hermes Integration Contract](#4-hermes-integration-contract)
5. [Bitwarden Secret Contract](#5-bitwarden-secret-contract)
6. [Diagnostics & Observability Requirements](#6-diagnostics--observability-requirements)
7. [Reference Implementation](#7-reference-implementation)
8. [Conversion Checklist](#8-conversion-checklist)
9. [Validation Script](#9-validation-script)

---

## 1. Worker API Contract

### Required Endpoints

Every worker must expose these endpoints under the `/api` prefix:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check with service metadata |
| `/api/smoke-test` | GET | Minimal end-to-end validation |
| `/api/run` | POST | Execute a job with payload |
| `/api/capabilities` | GET | Declare supported outputs and inputs |

### Endpoint Specifications

#### GET /api/health

Returns service health status with metadata.

**Response (200 OK):**
```json
{
  "ok": true,
  "service": "serp_intel",
  "version": "1.2.0",
  "schema_version": "2025-12-25",
  "request_id": "req_abc123",
  "data": {
    "uptime_seconds": 3600,
    "timestamp": "2025-12-25T14:00:00.000Z",
    "dependencies": {
      "database": "connected",
      "external_api": "connected"
    }
  }
}
```

#### GET /api/smoke-test

Runs a minimal end-to-end path and returns predictable outputs that Hermes can validate.

**Response (200 OK):**
```json
{
  "ok": true,
  "service": "serp_intel",
  "version": "1.2.0",
  "schema_version": "2025-12-25",
  "request_id": "req_abc123",
  "data": {
    "outputs": {
      "serp_rank_snapshots": true,
      "serp_tracked_keywords": true,
      "serp_top_keywords": true,
      "serp_serp_snapshots": true
    },
    "sample_data": {
      "keywords_tracked": 25,
      "keywords_in_top10": 12
    },
    "smoke_duration_ms": 150
  }
}
```

**Important**: The `outputs` object must list ALL outputs the worker can produce, with `true` for available and `false` for unavailable. Hermes uses this for schema validation.

#### POST /api/run

Executes a job with the provided payload.

**Request:**
```json
{
  "site_domain": "example.com",
  "target_keywords": ["seo tools", "keyword tracker"],
  "options": {
    "depth": "shallow",
    "include_serp_features": true
  }
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "service": "serp_intel",
  "version": "1.2.0",
  "schema_version": "2025-12-25",
  "request_id": "req_abc123",
  "data": {
    "job_id": "job_xyz789",
    "status": "completed",
    "results": {
      "serp_rank_snapshots": [...],
      "serp_tracked_keywords": [...]
    },
    "duration_ms": 2500
  }
}
```

#### GET /api/capabilities

Declares what the worker can do.

**Response (200 OK):**
```json
{
  "ok": true,
  "service": "serp_intel",
  "version": "1.2.0",
  "schema_version": "2025-12-25",
  "request_id": "req_abc123",
  "data": {
    "outputs": [
      "serp_rank_snapshots",
      "serp_tracked_keywords",
      "serp_top_keywords",
      "serp_serp_snapshots"
    ],
    "inputs": [
      "site_domain",
      "target_keywords",
      "competitor_domains"
    ],
    "supported_operations": ["run", "smoke-test"],
    "rate_limits": {
      "requests_per_minute": 60,
      "concurrent_jobs": 5
    }
  }
}
```

---

## 2. Worker Auth Contract

### Authentication Method

Workers use API key authentication via the `x-api-key` header.

### Implementation Rules

1. **Header**: Hermes sends `x-api-key: <api_key>` with every request
2. **Validation**: Worker validates against environment variable `WORKER_API_KEY`
3. **Missing/Invalid Key**: Return `401 Unauthorized` with JSON error
4. **Never redirect**: Do not redirect to login pages
5. **Never render HTML**: Always return JSON, even for auth failures

### Auth Middleware Example

```javascript
function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.WORKER_API_KEY;
  
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({
      ok: false,
      service: SERVICE_NAME,
      version: VERSION,
      schema_version: SCHEMA_VERSION,
      request_id: req.requestId,
      error: {
        code: "unauthorized",
        message: "Invalid or missing API key",
        details: { header_present: !!apiKey }
      }
    });
  }
  next();
}
```

---

## 3. Worker Response Contract

### Standard Response Shape

**Every** response from `/api/*` endpoints must follow this shape:

#### Success Response
```json
{
  "ok": true,
  "service": "<service_slug>",
  "version": "<semver>",
  "schema_version": "<date YYYY-MM-DD>",
  "request_id": "<correlation_id>",
  "data": { ... }
}
```

#### Error Response
```json
{
  "ok": false,
  "service": "<service_slug>",
  "version": "<semver>",
  "schema_version": "<date YYYY-MM-DD>",
  "request_id": "<correlation_id>",
  "error": {
    "code": "<error_code>",
    "message": "<human_readable>",
    "details": { ... }
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `unauthorized` | 401 | Invalid/missing API key |
| `forbidden` | 403 | Valid key but insufficient permissions |
| `not_found` | 404 | Requested resource not found |
| `invalid_input` | 400 | Request payload validation failed |
| `rate_limited` | 429 | Too many requests |
| `upstream_error` | 502 | External dependency failed |
| `timeout` | 504 | Operation timed out |
| `internal` | 500 | Internal server error |

### Content-Type Guarantees

1. **Always set**: `Content-Type: application/json`
2. **Never return HTML**: Even for 404s, return JSON
3. **Catch-all handler**: Implement a global error handler that returns JSON

### JSON-Only 404 Handler

```javascript
// Catch-all for /api routes that don't exist
app.use('/api/*', (req, res) => {
  res.status(404).json({
    ok: false,
    service: SERVICE_NAME,
    version: VERSION,
    schema_version: SCHEMA_VERSION,
    request_id: req.requestId,
    error: {
      code: "not_found",
      message: `Endpoint not found: ${req.method} ${req.path}`,
      details: { path: req.path, method: req.method }
    }
  });
});
```

---

## 4. Hermes Integration Contract

### How Hermes Connects to Workers

1. **Config Source**: Hermes reads worker config from Bitwarden
2. **URL Construction**: Uses `base_url` exactly as stored (no guessing)
3. **Endpoint Paths**: Appends paths to base_url:
   - `{base_url}/health`
   - `{base_url}/smoke-test`
   - `{base_url}/capabilities`
   - `{base_url}/run`

### Request Headers

Hermes always sets these headers:

```
Accept: application/json
Content-Type: application/json  (for POST requests)
x-api-key: <api_key>
X-Request-Id: <uuid>
```

### Response Handling

| Scenario | Hermes Action |
|----------|---------------|
| 200 + JSON | Parse and validate schema |
| 401 + JSON | Log auth failure, classify as `auth_401_403` |
| 404 + JSON | Log endpoint not found, classify as `404_not_found` |
| 2xx + HTML | Classify as `200_html_spa_shell`, log body snippet |
| 5xx | Classify as server error, log details |
| Timeout | Classify as `timeout_dns_tls` |

### Failure Classification

When a worker returns non-JSON or unexpected responses, Hermes classifies failures:

```typescript
type FailureBucket =
  | "404_not_found"        // Endpoint doesn't exist
  | "auth_401_403"         // Auth failed
  | "200_html_spa_shell"   // Got HTML instead of JSON
  | "redirect_30x"         // Unexpected redirect
  | "timeout_dns_tls"      // Network/timeout issues
  | "5xx_server_error"     // Server error
  | "unknown";             // Other failures
```

---

## 5. Bitwarden Secret Contract

### Secret Format

Each worker has one JSON secret in Bitwarden:

```json
{
  "base_url": "https://<worker-name>--<repl-user>.replit.app/api",
  "api_key": "<secure_api_key>"
}
```

### Naming Convention

```
SEO_<SERVICE_SLUG>
```

Examples:
- `SEO_SERP_&_Keyword` → SERP Intel worker
- `SEO_Google_Connector` → Google Data Connector
- `SEO_TECHNICAL_CRAWLER_API_KEY` → Crawl & Render worker

### Validation Rules

1. **base_url must include `/api`**: Hermes validates this
2. **base_url must start with `https://`**: Production requirement
3. **No trailing slash**: Hermes normalizes to no trailing slash
4. **api_key must be present**: Required for all workers

### serviceSecretMap Entry

```typescript
{
  serviceSlug: "serp_intel",
  displayName: "SERP & Keyword Intelligence",
  bitwardenSecret: "SEO_SERP_&_Keyword",
  type: "worker",
  requiresBaseUrl: true,
  category: "analysis",
  workerEndpoints: {
    health: "/health",
    smokeTest: "/smoke-test",
    capabilities: "/capabilities",
    run: "/run"
  }
}
```

---

## 6. Diagnostics & Observability Requirements

### Correlation ID Propagation

1. **Hermes generates**: `X-Request-Id: <uuid>` for each request
2. **Worker receives**: Reads from `req.headers['x-request-id']`
3. **Worker echoes**: Includes `request_id` in response JSON
4. **Worker logs**: Uses request_id in all log entries

### Logging Requirements

**DO log:**
- Request paths and methods
- Response status codes
- Duration in milliseconds
- Error codes and messages
- Correlation IDs

**DO NOT log:**
- API keys or secrets
- Full request/response bodies in production
- Sensitive user data

### Diagnostics Pipeline Stages

Hermes runs a 7-stage diagnostics pipeline:

| Stage | What It Checks |
|-------|----------------|
| `config_loaded` | Bitwarden secret parsed, base_url and api_key present |
| `auth_ready` | API key available for requests |
| `endpoint_built` | URLs constructed correctly |
| `request_sent` | HTTP request completed |
| `response_type_validated` | Response is JSON, not HTML |
| `schema_validated` | Response matches expected schema |
| `ui_mapping` | Data can be displayed in UI |

### Secret Redaction

When logging or storing diagnostics:

```typescript
function redactSecrets(obj: any): any {
  const sensitiveKeys = ['api_key', 'apiKey', 'token', 'secret', 'password'];
  // Replace values with "***REDACTED***"
}
```

---

## 7. Reference Implementation

### Express.js Worker Template

```javascript
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const SERVICE_NAME = 'serp_intel';
const VERSION = '1.0.0';
const SCHEMA_VERSION = '2025-12-25';

// Middleware: JSON body parser
app.use(express.json());

// Middleware: Request ID
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// Middleware: Auth (for /api routes)
app.use('/api', (req, res, next) => {
  // Skip auth for health check
  if (req.path === '/health') return next();
  
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.WORKER_API_KEY) {
    return res.status(401).json({
      ok: false,
      service: SERVICE_NAME,
      version: VERSION,
      schema_version: SCHEMA_VERSION,
      request_id: req.requestId,
      error: {
        code: 'unauthorized',
        message: 'Invalid or missing API key',
        details: {}
      }
    });
  }
  next();
});

// Helper: Create response
function createResponse(req, data) {
  return {
    ok: true,
    service: SERVICE_NAME,
    version: VERSION,
    schema_version: SCHEMA_VERSION,
    request_id: req.requestId,
    data
  };
}

function createError(req, code, message, status = 500, details = {}) {
  return {
    ok: false,
    service: SERVICE_NAME,
    version: VERSION,
    schema_version: SCHEMA_VERSION,
    request_id: req.requestId,
    error: { code, message, details }
  };
}

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json(createResponse(req, {
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    dependencies: {
      database: 'connected'
    }
  }));
});

// GET /api/capabilities
app.get('/api/capabilities', (req, res) => {
  res.json(createResponse(req, {
    outputs: [
      'serp_rank_snapshots',
      'serp_tracked_keywords',
      'serp_top_keywords',
      'serp_serp_snapshots'
    ],
    inputs: ['site_domain', 'target_keywords'],
    supported_operations: ['run', 'smoke-test'],
    rate_limits: {
      requests_per_minute: 60
    }
  }));
});

// GET /api/smoke-test
app.get('/api/smoke-test', async (req, res) => {
  const start = Date.now();
  
  // Perform minimal validation
  const outputs = {
    serp_rank_snapshots: true,
    serp_tracked_keywords: true,
    serp_top_keywords: true,
    serp_serp_snapshots: true
  };
  
  res.json(createResponse(req, {
    outputs,
    sample_data: {
      keywords_tracked: 10,
      keywords_in_top10: 5
    },
    smoke_duration_ms: Date.now() - start
  }));
});

// POST /api/run
app.post('/api/run', async (req, res) => {
  try {
    const { site_domain, target_keywords } = req.body;
    
    if (!site_domain) {
      return res.status(400).json(
        createError(req, 'invalid_input', 'site_domain is required', 400)
      );
    }
    
    // Execute job logic...
    const results = { /* ... */ };
    
    res.json(createResponse(req, {
      job_id: `job_${Date.now()}`,
      status: 'completed',
      results
    }));
  } catch (error) {
    res.status(500).json(
      createError(req, 'internal', error.message, 500)
    );
  }
});

// 404 handler for /api routes (JSON only)
app.use('/api/*', (req, res) => {
  res.status(404).json(
    createError(req, 'not_found', `Endpoint not found: ${req.method} ${req.path}`, 404)
  );
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${req.requestId}] Error:`, err.message);
  res.status(500).json(
    createError(req, 'internal', 'Internal server error', 500)
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} v${VERSION} listening on port ${PORT}`);
});
```

---

## 8. Conversion Checklist

Use this checklist when converting an existing worker to the Gold Standard:

### Phase 1: Route Structure
- [ ] All API routes are under `/api` prefix
- [ ] Routes: `/api/health`, `/api/smoke-test`, `/api/capabilities`, `/api/run`
- [ ] No routes return HTML on `/api/*` paths

### Phase 2: Response Format
- [ ] All responses include: `ok`, `service`, `version`, `schema_version`, `request_id`
- [ ] Success responses have `data` object
- [ ] Error responses have `error` object with `code`, `message`, `details`
- [ ] `Content-Type: application/json` on all responses

### Phase 3: Auth
- [ ] Auth middleware validates `x-api-key` header
- [ ] Invalid auth returns 401 JSON (not redirect)
- [ ] API key from `WORKER_API_KEY` env var

### Phase 4: Error Handling
- [ ] JSON-only 404 handler for `/api/*`
- [ ] Global error handler returns JSON
- [ ] Standard error codes used

### Phase 5: Observability
- [ ] Request ID middleware reads `X-Request-Id` header
- [ ] Request ID echoed in response and logs
- [ ] No secrets logged

### Phase 6: smoke-test
- [ ] `/api/smoke-test` returns predictable `outputs` object
- [ ] All declared outputs listed with true/false availability
- [ ] Sample data included for validation

### Phase 7: Bitwarden
- [ ] Secret JSON has `base_url` and `api_key`
- [ ] `base_url` includes `/api` suffix
- [ ] Secret name follows `SEO_<SERVICE_SLUG>` convention

---

## 9. Validation Script

### Self-Test Commands

Run these curl commands to validate a worker is compliant:

```bash
# Configuration
BASE_URL="https://your-worker.replit.app/api"
API_KEY="your-api-key"
REQUEST_ID="test-$(date +%s)"

# 1. Health Check (should return 200 JSON with ok:true)
echo "=== Testing /health ==="
curl -s -X GET "$BASE_URL/health" \
  -H "Accept: application/json" \
  -H "X-Request-Id: $REQUEST_ID" | jq .

# 2. Auth Test - Missing Key (should return 401 JSON)
echo "=== Testing auth - no key ==="
curl -s -X GET "$BASE_URL/smoke-test" \
  -H "Accept: application/json" \
  -H "X-Request-Id: $REQUEST_ID" | jq .

# 3. Auth Test - Invalid Key (should return 401 JSON)
echo "=== Testing auth - bad key ==="
curl -s -X GET "$BASE_URL/smoke-test" \
  -H "Accept: application/json" \
  -H "x-api-key: invalid-key" \
  -H "X-Request-Id: $REQUEST_ID" | jq .

# 4. Smoke Test (should return 200 JSON with outputs)
echo "=== Testing /smoke-test ==="
curl -s -X GET "$BASE_URL/smoke-test" \
  -H "Accept: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "X-Request-Id: $REQUEST_ID" | jq .

# 5. Capabilities (should return 200 JSON with outputs list)
echo "=== Testing /capabilities ==="
curl -s -X GET "$BASE_URL/capabilities" \
  -H "Accept: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "X-Request-Id: $REQUEST_ID" | jq .

# 6. 404 Test (should return 404 JSON, not HTML)
echo "=== Testing 404 handling ==="
curl -s -X GET "$BASE_URL/nonexistent" \
  -H "Accept: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "X-Request-Id: $REQUEST_ID" | jq .

# 7. Validate Response Headers
echo "=== Checking Content-Type ==="
curl -s -I -X GET "$BASE_URL/health" \
  -H "Accept: application/json" | grep -i content-type
```

### Validation Criteria

| Test | Expected Result |
|------|-----------------|
| /health | 200, JSON with `ok: true` |
| /smoke-test (no key) | 401, JSON with `error.code: "unauthorized"` |
| /smoke-test (bad key) | 401, JSON with `error.code: "unauthorized"` |
| /smoke-test (valid key) | 200, JSON with `data.outputs` object |
| /capabilities | 200, JSON with outputs array |
| /nonexistent | 404, JSON (not HTML!) |
| Content-Type header | `application/json` |

### Automated Validation Script

Save as `validate-worker.sh`:

```bash
#!/bin/bash
set -e

BASE_URL="$1"
API_KEY="$2"

if [ -z "$BASE_URL" ] || [ -z "$API_KEY" ]; then
  echo "Usage: ./validate-worker.sh <base_url> <api_key>"
  exit 1
fi

PASSED=0
FAILED=0

check() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  
  if echo "$actual" | grep -q "$expected"; then
    echo "✓ $name"
    ((PASSED++))
  else
    echo "✗ $name (expected: $expected)"
    ((FAILED++))
  fi
}

# Run tests
HEALTH=$(curl -s "$BASE_URL/health" -H "Accept: application/json")
check "Health returns ok:true" '"ok":true' "$HEALTH"
check "Health has service field" '"service":' "$HEALTH"
check "Health has request_id" '"request_id":' "$HEALTH"

SMOKE=$(curl -s "$BASE_URL/smoke-test" -H "x-api-key: $API_KEY" -H "Accept: application/json")
check "Smoke-test returns ok:true" '"ok":true' "$SMOKE"
check "Smoke-test has outputs" '"outputs":' "$SMOKE"

CAPS=$(curl -s "$BASE_URL/capabilities" -H "x-api-key: $API_KEY" -H "Accept: application/json")
check "Capabilities returns ok:true" '"ok":true' "$CAPS"
check "Capabilities lists outputs" '"outputs":' "$CAPS"

AUTH=$(curl -s "$BASE_URL/smoke-test" -H "Accept: application/json")
check "No-auth returns 401 JSON" '"code":"unauthorized"' "$AUTH"

NOTFOUND=$(curl -s "$BASE_URL/nonexistent" -H "x-api-key: $API_KEY" -H "Accept: application/json")
check "404 returns JSON not HTML" '"code":"not_found"' "$NOTFOUND"

echo ""
echo "Results: $PASSED passed, $FAILED failed"
[ $FAILED -eq 0 ] && exit 0 || exit 1
```

---

## Appendix: Output Keys Reference

Each worker declares specific output keys that Hermes uses for schema validation:

### SERP Intel Worker
```
serp_rank_snapshots, serp_tracked_keywords, serp_top_keywords, serp_serp_snapshots
```

### Crawl & Render Worker
```
pages_crawled, indexable_pages, non_200_urls, canonical_errors, render_failures, redirect_chains, orphan_pages, meta_tags
```

### Core Web Vitals Worker
```
lcp, cls, inp, performance_score, regressions
```

### Google Data Connector Worker
```
gsc_impressions, gsc_clicks, gsc_ctr, gsc_position, gsc_queries, gsc_pages, ga4_sessions, ga4_users, ga4_conversions
```

### Content QA Worker
```
qa_score, violations, compliance_status, fix_list
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-25 | Initial Gold Standard Blueprint |
