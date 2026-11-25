import type { AgentEvent } from './event.js';

/** Makes malformed events distinguishable from reducer failures. */
export class EventValidationError extends Error {
  readonly code = 'EVENT_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'EventValidationError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Rejects malformed event shapes before any handler can observe them. */
export function assertEvent(event: unknown): asserts event is AgentEvent {
  if (!isRecord(event)) {
    throw new EventValidationError('event must be an object');
  }
  if (typeof event.type !== 'string' || event.type.trim() === '') {
    throw new EventValidationError('event.type must be a non-empty string');
  }
  if (event.payload === null || event.payload === undefined) {
    throw new EventValidationError('event.payload must not be null or undefined');
  }
  if (typeof event.at !== 'number' || !Number.isFinite(event.at)) {
    throw new EventValidationError('event.at must be a finite number');
  }
}
