import { assertEvent } from './validate.js';

/** Carries one immutable fact from an application into the shared engine. */
export type AgentEvent = {
  type: string;
  payload: unknown;
  at: number;
};

/** Builds a validated event so invalid facts never enter the dispatcher. */
export function makeEvent(
  type: string,
  payload: unknown,
  at = Date.now(),
): AgentEvent {
  const event = { type, payload, at };
  assertEvent(event);
  return event;
}
