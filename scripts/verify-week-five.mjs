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
  'scripts/audit-maintenance.mjs',
  'scripts/verify-week-one.mjs',
  'scripts/verify-week-two.mjs',
  'scripts/verify-week-three.mjs',
  'scripts/verify-week-four.mjs',
  'scripts/verify-week-five.mjs',
  'docs/report-metadata.schema.json',
  'docs/report-categories.json',
  'docs/report-delivery-standard.md',
  'docs/homepage-browsing-standard.md',
  'docs/release-process.md',
  'docs/static-deploy-guide.md',
  'docs/expansion-roadmap.md',
  'docs/maintenance-playbook.md',
  'docs/feedback-log-template.md',
  'docs/week-1-handoff.md',
  'docs/week-2-handoff.md',
  'docs/week-3-handoff.md',
  'docs/week-4-handoff.md',
  'docs/week-5-handoff.md',
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

async function verifyOptionalIndexFields() {
  const raw = await fs.readFile(path.join(root, 'data', 'reports.json'), 'utf8');
  const payload = JSON.parse(raw);

  assert(payload.count >= 2, 'Week five expects at least the migrated reports');
  for (const report of payload.reports) {
    assert(report.clientGroup, `${report.id} missing clientGroup in generated data`);
    assert(Array.isArray(report.tags) && report.tags.length > 0, `${report.id} missing tags in generated data`);
    assert(report.visibility, `${report.id} missing visibility in generated data`);
    for (const tag of report.tags) {
      assert(report.search.includes(tag.toLowerCase()), `${report.id} search text missing tag: ${tag}`);
    }
  }
}

async function verifyReportActions() {
  const reportFiles = (await fs.readdir(path.join(root, 'reports')))
    .filter((file) => file.toLowerCase().endsWith('.html'))
    .sort();

  assert(reportFiles.length > 0, 'No report HTML files found');

  for (const file of reportFiles) {
    const html = await fs.readFile(path.join(root, 'reports', file), 'utf8');
    assert(
      html.includes('../assets/site-auth.js'),
      `${file} missing shared site auth script`
    );
    assert(
      html.includes('../assets/report-reader.js'),
      `${file} missing shared report reader script`
    );
    assert(
      html.includes('../assets/report-actions.js'),
      `${file} missing shared report actions script`
    );
  }
}

async function main() {
  await Promise.all(requiredFiles.map(assertFileExists));

  run('Week four verification', process.execPath, ['scripts/verify-week-four.mjs']);
  run('Maintenance audit', process.execPath, ['scripts/audit-maintenance.mjs']);

  await assertFileExists('data/maintenance-summary.json');
  await verifyOptionalIndexFields();
  await verifyReportActions();

  console.log('Week five verification passed: maintenance and expansion workflow is ready.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
