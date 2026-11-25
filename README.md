# MicroAgent-Core
A dependency-free event engine that powers two distinct production apps.

## Why It Exists
MicroAgent-Core is built for the Skeleton Crew idea: constraints make the
contract clearer. The whole reasoning loop is small enough to read, yet both
applications share one validated event engine. No framework is needed to prove
that the separation between products is real.

## Architecture
```text
+--------------------------+
|      skeleton-core       |   <=200 lines, 0 deps
| event -> validate -> state|
+------------+-------------+
             |
-------------+-------------+
|                         |
v                         v
SpecSentinel          IncidentPulse
(OpenAPI gate)        (alert triage)
```

## Quick Start
```bash
npm install
npm test
npm run demo
```

## Real Demo Output
```text
=== SpecSentinel ===
Input: fixtures/openapi-broken.json
Events dispatched: 3
Issues found: 2
  - /users/{id} -> RULE_MISSING_PARAM_DECL: path parameter "id" not declared
  - /orders -> RULE_MISSING_RESPONSES: operation "post" has no responses

=== IncidentPulse ===
Input: fixtures/alert-payload.json
Events dispatched: 3
Severity: P1
Summary: Latency spike on api-gateway (p99 > 2000ms for 5m)
Playbook:
  1. Check upstream dependency health
  2. Scale api-gateway to +2 replicas
  3. Page on-call SRE
```

## SpecSentinel
Validates an OpenAPI document without network access or a schema package. It
requires an `openapi` version and non-empty `paths`, every operation must have
`responses`, and every `{path}` parameter must be declared. Invalid documents
flow through `spec.received`, `spec.validated`, and `spec.rejected` with a
structured issue list.

## IncidentPulse
Turns a CloudWatch-style webhook into an ordered response draft. Critical
alerts affecting 10,000+ users are P0; critical alerts, threshold breaches, or
1,000+ affected users are P1; lower-impact alerts are P2. The
`alert.received`, `alert.triaged`, and `playbook.drafted` events keep the
decision reproducible and the playbook short.

## Line Budget
| Module | Budget | Actual |
|---|---:|---:|
| skeleton-core | 200 | 136 |
| spec-sentinel | 200 | 133 |
| incident-pulse | 200 | 154 |

## How Kiro Guides Development
The Kiro spec turns deterministic dispatch, immutable state, validation, and
zero dependencies into numbered acceptance criteria. Steering keeps new code
within the line and import budgets, while the post-task hook makes tests and
dependency checks part of every completion.

## License
MIT. See [LICENSE](LICENSE).
