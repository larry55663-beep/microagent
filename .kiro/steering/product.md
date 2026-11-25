---
inclusion: always
---

# Steering: Product Discipline

## Line Budget
- `/skeleton-core` MUST stay under 200 lines total.
- Each application under `/apps` MUST stay under 200 lines.
- If a file grows past 80 lines, split it before adding features.

## Dependency Policy
- NEVER add a runtime dependency. `package.json` `dependencies` stays `{}`.
- Allowed imports: `node:*` built-ins and relative paths only.
- Dev dependencies limited to `typescript` and `@types/node`.

## Architectural Boundaries
- Applications MUST NOT import from each other.
- Applications MUST only import through `skeleton-core/index.ts`.
- The core MUST NOT know anything about HTTP, OpenAPI, or alerts -
  it only understands events, state, and handlers.

## Conciseness
- Prefer composition over abstraction. No base classes.
- No barrels unless a public API needs one.
- Every exported symbol needs a one-line doc comment explaining *why*.
