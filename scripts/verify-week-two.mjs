#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildReportIndex, extractReportMetadata, REQUIRED_META_FIELDS } from './build-report-index.mjs';

const root = process.cwd();
const fileNamePattern = /^20\d{2}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.html$/;

const requiredFiles = [
  'index.html',
  'README.md',
  'package.json',
  'scripts/build-report-index.mjs',
  'scripts/dev-server.mjs',
  'scripts/verify-week-one.mjs',
  'scripts/verify-week-two.mjs',
  'docs/report-metadata.schema.json',
  'docs/report-categories.json',
  'docs/report-delivery-standard.md',
  'docs/week-1-handoff.md',
  'docs/week-2-handoff.md',
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

function assertDate(value, context) {
  assert(/^20\d{2}-\d{2}-\d{2}$/.test(value), `${context} date must use YYYY-MM-DD`);
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  assert(
    parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day,
    `${context} date is not a valid calendar date`
  );
}

function decodeEntities(value = '') {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function textContent(html = '') {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function firstPageHtml(html) {
  const bodyStart = html.search(/<body\b/i);
  const body = bodyStart >= 0 ? html.slice(bodyStart) : html;
  const pagePattern = /<[^>]+class=["'][^"']*\bpage\b[^"']*["'][^>]*>/gi;
  const first = pagePattern.exec(body);
  if (!first) return body.slice(0, 18000);

  const second = pagePattern.exec(body);
  return second ? body.slice(first.index, second.index) : body.slice(first.index);
}

function containsVisibleDate(html, date) {
  const [year, rawMonth, rawDay] = date.split('-');
  const month = String(Number(rawMonth));
  const day = String(Number(rawDay));
  const monthPattern = rawMonth.startsWith('0') ? `0?${month}` : rawMonth;
  const dayPattern = rawDay.startsWith('0') ? `0?${day}` : rawDay;
  const pattern = new RegExp(`${year}\\D{0,16}${monthPattern}\\D{0,16}${dayPattern}`);
  return pattern.test(textContent(firstPageHtml(html)));
}

function countPages(html) {
  return (html.match(/class=["'][^"']*\bpage\b[^"']*["']/gi) || []).length;
}

function countPageNumbers(html) {
  return (html.match(/class=["'][^"']*\bpgn\b[^"']*["']/gi) || []).length;
}

async function allowedCategories() {
  const categoryFile = await readText('docs/report-categories.json');
  const parsed = JSON.parse(categoryFile);
  const names = new Set((parsed.categories || []).map((category) => category.name));
  assert(names.size > 0, 'docs/report-categories.json must define at least one category');
  return names;
}

function assertMetadata(meta, context, categories) {
  for (const field of REQUIRED_META_FIELDS) {
    assert(typeof meta[field] === 'string' && meta[field].trim(), `${context} metadata.${field} is required`);
  }

  assertDate(meta.date, `${context} metadata`);
  assert(categories.has(meta.category), `${context} metadata.category must exist in docs/report-categories.json`);
  assert(/^20\d{2}\s+\S+/.test(meta.timeline), `${context} metadata.timeline should look like "2026 六月"`);
  assert(/^20\d{2}/.test(meta.period), `${context} metadata.period should start with a year`);
}

async function verifyReportFile(file, categories) {
  assert(fileNamePattern.test(file), `${file} must follow YYYY-MM-DD-project-slug.html`);

  const html = await readText(path.join('reports', file));
  const meta = extractReportMetadata(html, file);
  assertMetadata(meta, file, categories);

  const fileDate = file.slice(0, 10);
  assert(meta.date === fileDate, `${file} metadata.date must match filename date ${fileDate}`);
  assert(/<title[^>]*>[\s\S]*?<\/title>/i.test(html), `${file} needs a <title>`);
  assert(/<h1[^>]*>[\s\S]*?<\/h1>/i.test(html), `${file} needs an <h1>`);
  assert(countPages(html) > 0, `${file} must contain at least one .page`);
  assert(countPageNumbers(html) > 0, `${file} should contain .pgn page number elements`);
  assert(containsVisibleDate(html, meta.date), `${file} first page should visibly include metadata.date ${meta.date}`);
}

async function verifyTemplate(categories) {
  const file = 'templates/report-template.html';
  const html = await readText(file);
  const meta = extractReportMetadata(html, file);

  assertMetadata(meta, file, categories);
  assert(/<link[^>]+rel=["']icon["'][^>]+href=["']\.\.\/assets\/favicon\.svg["']/i.test(html), `${file} needs the shared favicon`);
  assert(/<title[^>]*>[\s\S]*?<\/title>/i.test(html), `${file} needs a <title>`);
  assert(/<h1[^>]*>[\s\S]*?<\/h1>/i.test(html), `${file} needs an <h1>`);
  assert(countPages(html) >= 3, `${file} should include cover, summary, and outcomes pages`);
  assert(countPageNumbers(html) >= 3, `${file} should include .pgn on each template page`);
  assert(containsVisibleDate(html, meta.date), `${file} first page should visibly include metadata.date ${meta.date}`);
}

async function main() {
  await Promise.all(requiredFiles.map(assertFileExists));

  const categories = await allowedCategories();
  await verifyTemplate(categories);

  const reportsDir = path.join(root, 'reports');
  const reportFiles = (await fs.readdir(reportsDir)).filter((file) => file.toLowerCase().endsWith('.html'));
  assert(reportFiles.length >= 2, 'Week two needs the migrated report HTML files in reports/');
  await Promise.all(reportFiles.map((file) => verifyReportFile(file, categories)));

  const payload = await buildReportIndex({ root, quiet: true });
  assert(payload.count === reportFiles.length, 'Generated report count does not match reports/*.html');

  const ids = new Set();
  for (const report of payload.reports) {
    assert(!ids.has(report.id), `Duplicate report id: ${report.id}`);
    ids.add(report.id);
    await assertFileExists(report.file);
    assert(categories.has(report.category), `${report.id} category must exist in docs/report-categories.json`);
    assert(report.pages > 0, `${report.id} must have a page count`);
  }

  const sorted = [...payload.reports].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  assert(
    sorted.every((report, index) => report.id === payload.reports[index].id),
    'Reports must be sorted by date descending'
  );

  console.log(`Week two verification passed: ${payload.count} reports indexed with delivery standards.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
