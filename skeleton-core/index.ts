import { makeEvent } from './event.js';
import type { AgentEvent } from './event.js';
import { applyReducer } from './state.js';
import type { Reducer } from './state.js';
import { assertEvent } from './validate.js';

/** Exposes event construction as the only supported way to create facts. */
export { makeEvent };
/** Exposes the event shape required by every downstream application. */
export type { AgentEvent };
/** Exposes pure transitions for applications that need standalone reducers. */
export { applyReducer };
/** Exposes the reducer contract without coupling apps to implementation files. */
export type { Reducer };
/** Lets callers distinguish invalid input from application failures. */
export { EventValidationError } from './validate.js';

/** Defines the only state transition shape accepted by CoreEngine. */
export type Handler<S> = (state: S, event: AgentEvent) => S;

/** Gives diagnostics a detached view of engine state and accepted events. */
export type CoreSnapshot<S> = {
  state: S;
  events: readonly AgentEvent[];
};

/** Dispatches validated events through registered, ordered state handlers. */
export class CoreEngine<S> {
  private state: S;
  private readonly handlers = new Map<string, Handler<S>[]>();
  private readonly events: AgentEvent[] = [];

  constructor(initialState: S) {
    this.state = structuredClone(initialState);
  }

  on(type: string, handler: Handler<S>): () => void {
    if (type.trim() === '') {
      throw new TypeError('handler type must be a non-empty string');
    }
    const handlers = this.handlers.get(type) ?? [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
    return () => {
      const current = this.handlers.get(type) ?? [];
      this.handlers.set(type, current.filter((item) => item !== handler));
    };
  }

  dispatch(event: AgentEvent): S {
    assertEvent(event);
    const handlers = this.handlers.get(event.type);
    if (handlers?.length) {
      const next = handlers.reduce(
        (state, handler) => applyReducer(state, event, handler),
        this.state,
      );
      this.state = structuredClone(next);
    }
    this.events.push(structuredClone(event));
    return this.state;
  }

  getState(): S {
    return this.state;
  }

  snapshot(): CoreSnapshot<S> {
    return structuredClone({ state: this.state, events: this.events });
  }
}

void makeEvent;
