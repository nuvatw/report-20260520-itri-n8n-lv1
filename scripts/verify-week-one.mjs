#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildReportIndex, extractReportMetadata, REQUIRED_META_FIELDS } from './build-report-index.mjs';

const root = process.cwd();
const requiredFiles = [
  'index.html',
  'README.md',
  'package.json',
  'scripts/build-report-index.mjs',
  'scripts/dev-server.mjs',
  'docs/report-metadata.schema.json',
  'docs/week-1-handoff.md',
  'assets/favicon.svg'
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

function assertDate(value, file) {
  assert(/^20\d{2}-\d{2}-\d{2}$/.test(value), `${file} metadata.date must use YYYY-MM-DD`);
}

async function verifyReportFile(file) {
  const target = path.join(root, 'reports', file);
  const html = await fs.readFile(target, 'utf8');
  const meta = extractReportMetadata(html, file);

  for (const field of REQUIRED_META_FIELDS) {
    assert(typeof meta[field] === 'string' && meta[field].trim(), `${file} metadata.${field} is required`);
  }

  assertDate(meta.date, file);
  assert(/<title[^>]*>[\s\S]*?<\/title>/i.test(html), `${file} needs a <title>`);
  assert(/<h1[^>]*>[\s\S]*?<\/h1>/i.test(html), `${file} needs an <h1>`);
}

async function main() {
  await Promise.all(requiredFiles.map(assertFileExists));

  const reportsDir = path.join(root, 'reports');
  const reportFiles = (await fs.readdir(reportsDir)).filter((file) => file.toLowerCase().endsWith('.html'));
  assert(reportFiles.length >= 2, 'Week one needs at least the two migrated report HTML files');

  await Promise.all(reportFiles.map(verifyReportFile));

  const payload = await buildReportIndex({ root, quiet: true });
  assert(payload.count === reportFiles.length, 'Generated report count does not match reports/*.html');

  const ids = new Set();
  for (const report of payload.reports) {
    assert(!ids.has(report.id), `Duplicate report id: ${report.id}`);
    ids.add(report.id);
    await assertFileExists(report.file);
  }

  const sorted = [...payload.reports].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  assert(
    sorted.every((report, index) => report.id === payload.reports[index].id),
    'Reports must be sorted by date descending'
  );

  console.log(`Week one verification passed: ${payload.count} reports indexed.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
