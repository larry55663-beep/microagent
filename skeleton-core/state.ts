import type { AgentEvent } from './event.js';

/** Keeps application state transitions explicit and testable. */
export type Reducer<S> = (state: S, event: AgentEvent) => S;

/** Isolates a reducer draft so a thrown or mutating reducer cannot alter state. */
export function applyReducer<S>(
  state: S,
  event: AgentEvent,
  reducer: Reducer<S>,
): S {
  const draft = structuredClone(state);
  return structuredClone(reducer(draft, event));
}
