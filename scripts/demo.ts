import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runIncidentPulse } from '../apps/incident-pulse/index.js';
import { runSpecSentinel } from '../apps/spec-sentinel/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const load = (relativePath: string): unknown =>
  JSON.parse(readFileSync(`${root}${relativePath}`, 'utf8')) as unknown;

const requested = process.argv[2] ?? '';
if (requested !== '' && !['spec-sentinel', 'incident-pulse'].includes(requested)) {
  throw new Error(`unknown app: ${requested}`);
}

const specPath = 'apps/spec-sentinel/fixtures/openapi-broken.json';
const alertPath = 'apps/incident-pulse/fixtures/alert-payload.json';

if (requested === '' || requested === 'spec-sentinel') {
  const result = runSpecSentinel(load(specPath));
  console.log('=== SpecSentinel ===');
  console.log('Input: fixtures/openapi-broken.json');
  console.log(`Events dispatched: ${result.events}`);
  console.log(`Issues found: ${result.issues.length}`);
  for (const issue of result.issues) {
    console.log(`  - ${issue.path} -> ${issue.rule}: ${issue.message}`);
  }
}

if (requested === '') console.log('');

if (requested === '' || requested === 'incident-pulse') {
  const result = runIncidentPulse(load(alertPath));
  console.log('=== IncidentPulse ===');
  console.log('Input: fixtures/alert-payload.json');
  console.log(`Events dispatched: ${result.events}`);
  console.log(`Severity: ${result.severity}`);
  console.log(`Summary: ${result.summary}`);
  console.log('Playbook:');
  result.playbook.forEach((step, index) => console.log(`  ${index + 1}. ${step}`));
}
