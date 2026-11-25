import { readFileSync, readdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const folders = [
  ['skeleton-core', 200],
  ['apps/spec-sentinel', 200],
  ['apps/incident-pulse', 200],
];

const lineCount = (file) =>
  readFileSync(file, 'utf8').split(/\r?\n/).length - 1;

const files = (folder) =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(entry.name, folder);
    if (entry.isDirectory()) return files(new URL(`${entry.name}/`, folder));
    return entry.name.endsWith('.ts') ? [child] : [];
  });

let failed = false;
for (const [folder, budget] of folders) {
  const base = new URL(`${folder}/`, root);
  const total = files(base).reduce((sum, file) => sum + lineCount(file), 0);
  console.log(`${folder}: ${total}/${budget}`);
  if (total > budget) failed = true;
}
if (failed) process.exit(1);
