import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { inspectSpec, runSpecSentinel } from '../apps/spec-sentinel/index.js';

const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(new URL(`../../apps/spec-sentinel/fixtures/${name}`, import.meta.url), 'utf8'),
  ) as unknown;

test('valid OpenAPI fixture produces no issues and completes two events', () => {
  const document = fixture('openapi-valid.json');
  const result = runSpecSentinel(document);

  assert.deepEqual(inspectSpec(document), []);
  assert.equal(result.stage, 'validated');
  assert.equal(result.events, 2);
  assert.equal(result.issues.length, 0);
});

test('broken OpenAPI fixture reports missing responses and path declarations', () => {
  const result = runSpecSentinel(fixture('openapi-broken.json'));
  const rules = result.issues.map((issue) => issue.rule);

  assert.equal(result.stage, 'rejected');
  assert.equal(result.events, 3);
  assert.equal(result.issues.length, 2);
  assert.deepEqual(rules, ['RULE_MISSING_PARAM_DECL', 'RULE_MISSING_RESPONSES']);
  assert.match(result.issues[0]?.message ?? '', /"id"/);
});

test('invalid and incomplete documents fail closed', () => {
  assert.equal(inspectSpec(null)[0]?.rule, 'RULE_INVALID_DOCUMENT');
  assert.equal(inspectSpec({ paths: {} })[0]?.rule, 'RULE_MISSING_OPENAPI_VERSION');
  assert.equal(inspectSpec({ openapi: '3.0.0', paths: {} })[0]?.rule, 'RULE_EMPTY_PATHS');
});
