#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'index.html',
  'README.md',
  'package.json',
  'vercel.json',
  'scripts/build-report-index.mjs',
  'scripts/dev-server.mjs',
  'scripts/check-links.mjs',
  'scripts/mobile-visual-check.mjs',
  'scripts/verify-week-one.mjs',
  'scripts/verify-week-two.mjs',
  'scripts/verify-week-three.mjs',
  'scripts/verify-week-four.mjs',
  'docs/report-metadata.schema.json',
  'docs/report-categories.json',
  'docs/report-delivery-standard.md',
  'docs/homepage-browsing-standard.md',
  'docs/release-process.md',
  'docs/static-deploy-guide.md',
  'docs/week-1-handoff.md',
  'docs/week-2-handoff.md',
  'docs/week-3-handoff.md',
  'docs/week-4-handoff.md',
  'templates/report-template.html',
  'assets/favicon.svg',
  'assets/site-auth.js',
  'assets/report-reader.js',
  'assets/report-actions.js'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertFileExists(file) {
  const target = path.join(root, file);
  const stat = await fs.stat(target).catch(() => null);
  assert(stat?.isFile(), `Missing required file: ${file}`);
}

function run(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`.trim());
  }

  return result.stdout.trim();
}

async function assertArtifact(file) {
  const target = path.join(root, file);
  const stat = await fs.stat(target).catch(() => null);
  assert(stat?.isFile(), `Missing QA artifact: ${file}`);
  assert(stat.size >= 8000, `QA artifact looks too small: ${file}`);
}

async function main() {
  await Promise.all(requiredFiles.map(assertFileExists));

  run('Build check', process.execPath, ['scripts/build-report-index.mjs']);
  run('Week three verification', process.execPath, ['scripts/verify-week-three.mjs']);
  run('Link check', process.execPath, ['scripts/check-links.mjs']);
  run('Visual check', process.execPath, ['scripts/mobile-visual-check.mjs']);

  await assertArtifact('artifacts/qa/home-desktop.png');
  await assertArtifact('artifacts/qa/home-mobile.png');

  console.log('Week four verification passed: release checks, links, and visual QA are wired.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
