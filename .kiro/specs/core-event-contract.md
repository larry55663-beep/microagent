# Spec: Core Event Contract

## Overview
Defines the strictly decoupled event-state contract that all MicroAgent-Core
downstream applications must adhere to.

## Requirements

### R1 - Deterministic Dispatch
WHEN an event is dispatched, THE core SHALL invoke exactly one registered
handler per matching event type in registration order.

#### Acceptance Criteria
1. WHEN two handlers are registered for the same type, THE core SHALL invoke
   them in the order registered.
2. WHEN no handler matches, THE core SHALL return the unmodified state.

### R2 - Immutable State
THE core SHALL never mutate the state object passed into a reducer.

#### Acceptance Criteria
1. WHEN a reducer returns a new state, THE previous state reference SHALL
   remain referentially unchanged.
2. WHEN a reducer throws, THE core SHALL surface the error and leave the
   prior state intact.

### R3 - Input Validation
WHEN an event is dispatched, THE core SHALL validate its shape before
invocation.

#### Acceptance Criteria
1. An event without a `type` string SHALL be rejected with a typed error.
2. An event with `null` payload SHALL be rejected.

### R4 - Zero Dependencies
THE core SHALL have no third-party runtime dependencies.

#### Acceptance Criteria
1. `package.json` `dependencies` SHALL be an empty object.
2. Every import SHALL resolve to `node:` built-ins or relative paths.

## Tasks
- [x] 1. Implement `skeleton-core/event.ts` typed event factory
- [x] 2. Implement `skeleton-core/validate.ts` shape guards
- [x] 3. Implement `skeleton-core/state.ts` pure reducer contract
- [x] 4. Implement `skeleton-core/index.ts` dispatcher
- [x] 5. Wire App 1 `spec-sentinel` against the contract
- [x] 6. Wire App 2 `incident-pulse` against the contract
- [x] 7. Add `node:test` coverage for R1-R3
