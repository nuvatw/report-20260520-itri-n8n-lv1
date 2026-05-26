#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildReportIndex, extractReportMetadata } from './build-report-index.mjs';

const root = process.cwd();
const visibilityValues = new Set(['public', 'internal', 'private']);
const requiredDocs = [
  'docs/expansion-roadmap.md',
  'docs/maintenance-playbook.md',
  'docs/feedback-log-template.md',
  'docs/week-5-handoff.md'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertFileExists(file) {
  const target = path.join(root, file);
  const stat = await fs.stat(target).catch(() => null);
  assert(stat?.isFile(), `Missing required maintenance file: ${file}`);
}

function isExternal(value = '') {
  return /^https?:\/\//i.test(value);
}

async function assertOptionalAsset(reportFile, field, value) {
  if (!value || isExternal(value)) return;

  const sourceDir = path.dirname(path.join(root, 'reports', reportFile));
  const target = value.startsWith('/')
    ? path.join(root, value.slice(1))
    : path.join(sourceDir, value);
  const relative = path.relative(root, path.normalize(target));

  assert(!relative.startsWith('..') && !path.isAbsolute(relative), `${reportFile} metadata.${field} points outside project`);
  await assertFileExists(relative);
}

function assertTags(reportFile, tags) {
  assert(Array.isArray(tags), `${reportFile} metadata.tags must be an array`);
  assert(tags.length > 0, `${reportFile} metadata.tags should include at least one tag`);

  const seen = new Set();
  for (const tag of tags) {
    assert(typeof tag === 'string' && tag.trim(), `${reportFile} metadata.tags cannot contain blank values`);
    assert(tag.length <= 28, `${reportFile} tag is too long: ${tag}`);
    assert(!seen.has(tag), `${reportFile} duplicate tag: ${tag}`);
    seen.add(tag);
  }
}

async function verifyReportMetadata(reportFile) {
  const html = await fs.readFile(path.join(root, 'reports', reportFile), 'utf8');
  const meta = extractReportMetadata(html, reportFile);

  assert(typeof meta.clientGroup === 'string' && meta.clientGroup.trim(), `${reportFile} metadata.clientGroup is required for maintenance`);
  assertTags(reportFile, meta.tags);
  assert(visibilityValues.has(meta.visibility), `${reportFile} metadata.visibility must be public, internal, or private`);

  await assertOptionalAsset(reportFile, 'thumbnail', meta.thumbnail || '');
  await assertOptionalAsset(reportFile, 'pdf', meta.pdf || '');

  return meta;
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

async function main() {
  await Promise.all(requiredDocs.map(assertFileExists));

  const reportFiles = (await fs.readdir(path.join(root, 'reports')))
    .filter((file) => file.toLowerCase().endsWith('.html'))
    .sort();
  assert(reportFiles.length >= 2, 'Maintenance audit expects at least the migrated reports');

  const metadata = await Promise.all(reportFiles.map(verifyReportMetadata));
  const payload = await buildReportIndex({ root, quiet: true });

  for (const report of payload.reports) {
    assert(report.clientGroup, `${report.id} missing indexed clientGroup`);
    assert(Array.isArray(report.tags) && report.tags.length > 0, `${report.id} missing indexed tags`);
    assert(visibilityValues.has(report.visibility), `${report.id} missing indexed visibility`);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    reportCount: payload.count,
    clientGroups: countBy(metadata.map((meta) => meta.clientGroup)),
    visibility: countBy(metadata.map((meta) => meta.visibility)),
    tags: [...new Set(metadata.flatMap((meta) => meta.tags))].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    pdfReadyCount: metadata.filter((meta) => Boolean(meta.pdf)).length,
    thumbnailReadyCount: metadata.filter((meta) => Boolean(meta.thumbnail)).length
  };

  await fs.mkdir(path.join(root, 'data'), { recursive: true });
  await fs.writeFile(path.join(root, 'data', 'maintenance-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(
    `Maintenance audit passed: ${summary.reportCount} reports, ${Object.keys(summary.clientGroups).length} client groups, ${summary.tags.length} tags.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
