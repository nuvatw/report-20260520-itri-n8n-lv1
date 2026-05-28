#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPORTS_DIR = 'reports';
const DATA_DIR = 'data';
const JSON_FILE = 'reports.json';
const JS_FILE = 'reports.js';
const REPORT_READER_SCRIPT = '../assets/report-reader.js';
const REPORT_ACTIONS_SCRIPT = '../assets/report-actions.js';

export const REQUIRED_META_FIELDS = ['title', 'subtitle', 'date', 'period', 'category', 'client', 'timeline'];

const entityMap = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' '
};

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function decodeEntities(value = '') {
  return value.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match) => entityMap[match] || match);
}

function stripTags(value = '') {
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function extractTitleTag(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]) : '';
}

function extractFirstClassText(html, className) {
  const pattern = new RegExp(`<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i');
  const match = html.match(pattern);
  return match ? stripTags(match[1]) : '';
}

function extractH1(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? stripTags(match[1]) : '';
}

export function extractReportMetadata(html, fileName = 'report.html') {
  const match = html.match(/<!--\s*report-meta\s*([\s\S]*?)-->/i);
  if (!match) return {};

  try {
    return JSON.parse(match[1].trim());
  } catch (error) {
    throw new Error(`${fileName} 的 report-meta JSON 無法解析: ${error.message}`);
  }
}

function dateFromFileName(fileName) {
  const match = fileName.match(/(20\d{2})[-_](\d{2})[-_](\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function normalizeDate(rawDate, fallback) {
  if (!rawDate) return fallback || '';
  const normalized = String(rawDate).trim().replace(/\//g, '-').replace(/\./g, '-');
  const match = normalized.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (!match) return fallback || '';
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function monthLabel(date) {
  if (!date) return '未設定日期';
  const [year, month] = date.split('-');
  return `${year}.${month}`;
}

function fallbackCategory(fileName, title) {
  const value = `${fileName} ${title}`;
  if (/課程|course|workshop|n8n/i.test(value)) return '課程成果';
  if (/活動|巡迴|站|event/i.test(value)) return '活動成果';
  return '成果報告';
}

function buildSearchText(report) {
  return [
    report.title,
    report.subtitle,
    report.category,
    report.client,
    report.clientGroup,
    report.period,
    report.timeline,
    ...(report.tags || []),
    report.file
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function countReportPages(html) {
  return [...html.matchAll(/<[^>]+\bclass=["']([^"']*)["'][^>]*>/gi)]
    .filter(([, className]) => className.split(/\s+/).includes('page'))
    .length;
}

function hasReportActionsScript(html) {
  return /<script\b[^>]+\bsrc=["'][^"']*assets\/report-actions\.js[^"']*["'][^>]*>/i.test(html);
}

function hasReportReaderScript(html) {
  return /<script\b[^>]+\bsrc=["'][^"']*assets\/report-reader\.js[^"']*["'][^>]*>/i.test(html);
}

function injectReportActionsScript(html) {
  if (hasReportActionsScript(html)) return html;

  const scriptTag = `  <script src="${REPORT_ACTIONS_SCRIPT}" defer></script>\n`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${scriptTag}</body>`);
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${scriptTag}</html>`);
  return `${html.trimEnd()}\n${scriptTag}`;
}

function injectReportReaderScript(html) {
  if (hasReportReaderScript(html)) return html;

  const scriptTag = `  <script src="${REPORT_READER_SCRIPT}" defer></script>\n`;
  if (hasReportActionsScript(html)) {
    return html.replace(
      /(\s*<script\b[^>]+\bsrc=["'][^"']*assets\/report-actions\.js[^"']*["'][^>]*>\s*<\/script>)/i,
      `\n${scriptTag}$1`
    );
  }
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${scriptTag}</body>`);
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${scriptTag}</html>`);
  return `${html.trimEnd()}\n${scriptTag}`;
}

async function ensureReportActionsScript(root, fileName) {
  const filePath = path.join(root, REPORTS_DIR, fileName);
  const html = await fs.readFile(filePath, 'utf8');
  const nextHtml = injectReportActionsScript(injectReportReaderScript(html));
  if (nextHtml !== html) await fs.writeFile(filePath, nextHtml, 'utf8');
}

async function buildReport(root, fileName) {
  const filePath = path.join(root, REPORTS_DIR, fileName);
  const [html, stat] = await Promise.all([fs.readFile(filePath, 'utf8'), fs.stat(filePath)]);
  const meta = extractReportMetadata(html, fileName);
  const titleTag = extractTitleTag(html);
  const h1 = extractH1(html);
  const title = meta.title || h1 || titleTag || fileName.replace(/\.html$/i, '');
  const subtitle = meta.subtitle || extractFirstClassText(html, 'csub') || titleTag;
  const date = normalizeDate(meta.date, dateFromFileName(fileName));
  const category = meta.category || fallbackCategory(fileName, title);
  const pages = countReportPages(html);

  const report = {
    id: fileName.replace(/\.html$/i, ''),
    file: toPosix(path.join(REPORTS_DIR, fileName)),
    title,
    subtitle,
    date,
    month: monthLabel(date),
    period: meta.period || date,
    category,
    client: meta.client || '',
    clientGroup: meta.clientGroup || '',
    timeline: meta.timeline || monthLabel(date),
    tags: Array.isArray(meta.tags) ? meta.tags.filter(Boolean) : [],
    thumbnail: meta.thumbnail || '',
    pdf: meta.pdf || '',
    visibility: meta.visibility || 'public',
    guestPin: String(meta.guestPin || meta.guestPassword || '').replace(/\D/g, '').slice(0, 4),
    pages,
    updatedAt: stat.mtime.toISOString(),
    sizeKb: Math.max(1, Math.round(stat.size / 1024))
  };

  return {
    ...report,
    search: buildSearchText(report)
  };
}

export async function buildReportIndex({ root = process.cwd(), quiet = false } = {}) {
  const reportsPath = path.join(root, REPORTS_DIR);
  const dataPath = path.join(root, DATA_DIR);
  await fs.mkdir(reportsPath, { recursive: true });
  await fs.mkdir(dataPath, { recursive: true });

  const files = (await fs.readdir(reportsPath))
    .filter((file) => file.toLowerCase().endsWith('.html'))
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'));

  await Promise.all(files.map((file) => ensureReportActionsScript(root, file)));

  const reports = await Promise.all(files.map((file) => buildReport(root, file)));
  reports.sort((a, b) => {
    const dateOrder = (b.date || '').localeCompare(a.date || '');
    if (dateOrder !== 0) return dateOrder;
    return a.title.localeCompare(b.title, 'zh-Hant');
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    count: reports.length,
    reports
  };

  await fs.writeFile(path.join(dataPath, JSON_FILE), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(
    path.join(dataPath, JS_FILE),
    `window.REPORT_TIMELINE = ${JSON.stringify(payload, null, 2)};\n`,
    'utf8'
  );

  if (!quiet) {
    console.log(`Indexed ${reports.length} report${reports.length === 1 ? '' : 's'} into ${DATA_DIR}/${JS_FILE}`);
  }

  return payload;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFile === invokedFile) {
  buildReportIndex().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
