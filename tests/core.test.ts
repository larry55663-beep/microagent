import assert from 'node:assert/strict';
import test from 'node:test';
import { CoreEngine, makeEvent } from '../skeleton-core/index.js';
import { EventValidationError } from '../skeleton-core/validate.js';

test('R1 dispatches handlers in registration order and unmatched events preserve state', () => {
  const engine = new CoreEngine({ calls: [] as string[] });
  engine.on('sample', (state) => ({ calls: [...state.calls, 'first'] }));
  engine.on('sample', (state) => ({ calls: [...state.calls, 'second'] }));
  const event = makeEvent('sample', { ok: true }, 10);

  const first = engine.dispatch(event);
  const second = engine.dispatch(event);
  const unmatched = engine.dispatch(makeEvent('unknown', {}, 11));

  assert.deepEqual(first.calls, ['first', 'second']);
  assert.deepEqual(second.calls, ['first', 'second', 'first', 'second']);
  assert.equal(unmatched, second);
});

test('R2 reducers receive drafts and failures leave prior state intact', () => {
  const initial = { count: 0 };
  const engine = new CoreEngine(initial);
  engine.on('increment', (state) => {
    state.count += 1;
    return state;
  });
  engine.on('explode', () => {
    throw new Error('reducer failed');
  });

  engine.dispatch(makeEvent('increment', {}, 1));
  const before = engine.getState();
  assert.throws(() => engine.dispatch(makeEvent('explode', {}, 2)), /reducer failed/);

  assert.equal(initial.count, 0);
  assert.equal(engine.getState(), before);
  assert.deepEqual(engine.getState(), { count: 1 });
});

test('R3 rejects malformed event types and null payloads with a typed error', () => {
  const engine = new CoreEngine({});

  assert.throws(
    () => engine.dispatch({ type: '', payload: {}, at: 0 }),
    (error: unknown) => error instanceof EventValidationError,
  );
  assert.throws(
    () => engine.dispatch({ type: 'valid', payload: null, at: 0 }),
    (error: unknown) => error instanceof EventValidationError,
  );
  assert.equal(engine.snapshot().events.length, 0);
});
