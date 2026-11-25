import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { classifyAlert, parseAlert, runIncidentPulse } from '../apps/incident-pulse/index.js';
import type { AlertPayload } from '../apps/incident-pulse/index.js';

const fixture = (): AlertPayload =>
  parseAlert(
    JSON.parse(
      readFileSync(
        new URL('../../apps/incident-pulse/fixtures/alert-payload.json', import.meta.url),
        'utf8',
      ),
    ) as unknown,
  );

const webhook = (alert: AlertPayload): Record<string, unknown> => ({
  id: alert.id,
  source: alert.source,
  service: alert.service,
  metric: alert.metric,
  value: alert.value,
  threshold: alert.threshold,
  duration_minutes: alert.durationMinutes,
  severity: alert.severity,
  affected_users: alert.affectedUsers,
  region: alert.region,
});

test('P0 combines critical severity with broad customer impact', () => {
  const alert = { ...fixture(), severity: 'critical', affectedUsers: 25_000 };

  assert.equal(classifyAlert(alert), 'P0');
  const result = runIncidentPulse(webhook(alert));
  assert.equal(result.severity, 'P0');
  assert.ok(result.playbook.length >= 3 && result.playbook.length <= 5);
  assert.match(result.summary, /Latency spike on api-gateway/);
});

test('P1 escalates a warning that breaches its threshold or affects 1,000 users', () => {
  const alert = fixture();

  assert.equal(classifyAlert(alert), 'P1');
  const result = runIncidentPulse(webhook(alert));
  assert.equal(result.events, 3);
  assert.equal(result.playbook.length, 3);
  assert.ok(result.playbook.includes('Page on-call SRE'));
});

test('P2 keeps low-impact alerts below threshold on a monitoring path', () => {
  const alert = { ...fixture(), value: 1200, affectedUsers: 25 };
  const result = runIncidentPulse(webhook(alert));

  assert.equal(classifyAlert(alert), 'P2');
  assert.equal(result.severity, 'P2');
  assert.equal(result.playbook.length, 3);
  assert.match(result.playbook[1] ?? '', /Monitor api-gateway/);
});
