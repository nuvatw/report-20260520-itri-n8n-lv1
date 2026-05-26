#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildReportIndex } from './build-report-index.mjs';

const root = process.cwd();

const requiredFiles = [
  'index.html',
  'README.md',
  'package.json',
  'scripts/build-report-index.mjs',
  'scripts/dev-server.mjs',
  'scripts/verify-week-one.mjs',
  'scripts/verify-week-two.mjs',
  'scripts/verify-week-three.mjs',
  'docs/report-metadata.schema.json',
  'docs/report-categories.json',
  'docs/report-delivery-standard.md',
  'docs/homepage-browsing-standard.md',
  'docs/week-1-handoff.md',
  'docs/week-2-handoff.md',
  'docs/week-3-handoff.md',
  'templates/report-template.html',
  'assets/favicon.svg'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readText(file) {
  return fs.readFile(path.join(root, file), 'utf8');
}

async function assertFileExists(file) {
  const target = path.join(root, file);
  const stat = await fs.stat(target).catch(() => null);
  assert(stat?.isFile(), `Missing required file: ${file}`);
}

function runWeekTwoVerification() {
  const result = spawnSync(process.execPath, ['scripts/verify-week-two.mjs'], {
    cwd: root,
    encoding: 'utf8'
  });

  assert(result.status === 0, `Week two verification failed:\n${result.stdout}\n${result.stderr}`.trim());
}

function assertContains(source, pattern, message) {
  assert(pattern.test(source), message);
}

async function verifyHomepage() {
  const html = await readText('index.html');

  const requiredSelectors = [
    'id="year-chips"',
    'id="month-nav"',
    'id="active-filters"',
    'id="clear-filters"',
    'id="month-count"',
    'class="latest-badge"'
  ];

  for (const selector of requiredSelectors) {
    assert(html.includes(selector), `Homepage missing ${selector}`);
  }

  assertContains(html, /data-year=/, 'Homepage needs year filter buttons');
  assertContains(html, /data-month=/, 'Homepage needs month filter buttons');
  assertContains(html, /aria-pressed=/, 'Homepage filter buttons need aria-pressed');
  assertContains(html, /state\.year/, 'Homepage filtering must include year state');
  assertContains(html, /state\.month/, 'Homepage filtering must include month state');
  assertContains(html, /state\.category/, 'Homepage filtering must include category state');
  assertContains(html, /state\.query/, 'Homepage filtering must include query state');
  assertContains(html, /latestReportId/, 'Homepage needs latest report detection');
  assertContains(html, /resetFilters/, 'Homepage needs clear filter behavior');
  assertContains(html, /沒有符合條件的成果報告/, 'Homepage needs filtered empty state');
  assertContains(html, /索引資料尚未建立/, 'Homepage needs missing-index empty state');
  assertContains(html, /目前沒有成果報告/, 'Homepage needs no-report empty state');
}

async function verifyGeneratedData() {
  const payload = await buildReportIndex({ root, quiet: true });
  assert(payload.count >= 2, 'Week three expects at least the two migrated reports');

  const categories = new Set(payload.reports.map((report) => report.category));
  const years = new Set(payload.reports.map((report) => String(report.date || '').slice(0, 4)));
  const months = new Set(payload.reports.map((report) => report.month));

  assert(categories.size >= 2, 'Homepage category filter needs at least two categories in current data');
  assert(years.has('2026'), 'Homepage year filter should include 2026');
  assert(months.has('2026.05'), 'Homepage month filter should include 2026.05');
  assert(payload.reports[0]?.id === '2026-05-22-itri-n8n-lv1', 'Latest report should be the 2026-05-22 report');
  assert(payload.reports.every((report) => report.search.includes(report.category.toLowerCase())), 'Search text should include category');
}

async function main() {
  await Promise.all(requiredFiles.map(assertFileExists));
  runWeekTwoVerification();
  await verifyHomepage();
  await verifyGeneratedData();
  console.log('Week three verification passed: homepage browsing experience is wired.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
