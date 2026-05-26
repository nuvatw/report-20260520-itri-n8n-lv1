#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredProtocols = /^(mailto:|tel:|javascript:|data:|blob:)/i;
const externalSampleLimit = Number(readArg('--external-sample') || 6);
const strictExternal = process.argv.includes('--strict-external');
const timeoutMs = Number(readArg('--timeout') || 3500);
const externalCheckSkips = new Set([
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
]);

function readArg(name) {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : '';
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function exists(file) {
  return Boolean(await fs.stat(file).catch(() => null));
}

async function htmlFiles() {
  const reports = await fs.readdir(path.join(root, 'reports')).catch(() => []);
  return [
    'index.html',
    'templates/report-template.html',
    ...reports.filter((file) => file.toLowerCase().endsWith('.html')).map((file) => path.join('reports', file))
  ];
}

function extractLinks(html) {
  const links = [];
  const attrPattern = /\b(?:href|src)=["']([^"']+)["']/gi;
  let match;

  while ((match = attrPattern.exec(html))) {
    links.push(match[1].trim());
  }

  return links;
}

function extractIds(html) {
  const ids = new Set();
  const idPattern = /\bid=["']([^"']+)["']/gi;
  let match;

  while ((match = idPattern.exec(html))) {
    ids.add(match[1]);
  }

  return ids;
}

function normalizeLocalPath(sourceFile, rawUrl) {
  const [urlPath, hash = ''] = rawUrl.split('#');
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const sourceDir = path.dirname(path.join(root, sourceFile));
  const target = cleanPath.startsWith('/')
    ? path.join(root, cleanPath.slice(1))
    : path.join(sourceDir, cleanPath);
  const normalized = path.normalize(target);
  const relative = path.relative(root, normalized);

  return {
    target: normalized,
    relative,
    hash
  };
}

async function checkLocalLink(sourceFile, sourceHtml, rawUrl) {
  if (rawUrl.startsWith('#')) {
    const id = rawUrl.slice(1);
    if (!id) return null;
    return extractIds(sourceHtml).has(id) ? null : `${sourceFile} missing same-page anchor #${id}`;
  }

  const { target, relative, hash } = normalizeLocalPath(sourceFile, rawUrl);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return `${sourceFile} links outside project root: ${rawUrl}`;
  }

  const stat = await fs.stat(target).catch(() => null);
  if (!stat) return `${sourceFile} missing local link target: ${rawUrl}`;

  if (hash && target.toLowerCase().endsWith('.html')) {
    const html = await fs.readFile(target, 'utf8');
    if (!extractIds(html).has(hash)) {
      return `${sourceFile} target ${rawUrl} missing anchor #${hash}`;
    }
  }

  return null;
}

async function checkExternalLink(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal
    });

    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
    }

    return response.ok ? null : `${url} returned HTTP ${response.status}`;
  } catch (error) {
    return `${url} could not be checked: ${error.name === 'AbortError' ? 'timeout' : error.message}`;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const files = await htmlFiles();
  const localErrors = [];
  const externalLinks = new Map();
  let localCount = 0;

  for (const file of files) {
    const absolute = path.join(root, file);
    assert(await exists(absolute), `Missing expected HTML file: ${file}`);
    const html = await fs.readFile(absolute, 'utf8');
    const links = extractLinks(html);

    for (const rawUrl of links) {
      if (!rawUrl || ignoredProtocols.test(rawUrl)) continue;
      if (rawUrl.includes('${')) continue;
      if (/^https?:\/\//i.test(rawUrl)) {
        if (externalCheckSkips.has(rawUrl.replace(/\/$/, ''))) continue;
        if (!externalLinks.has(rawUrl)) externalLinks.set(rawUrl, file);
        continue;
      }

      localCount += 1;
      const error = await checkLocalLink(file, html, rawUrl);
      if (error) localErrors.push(error);
    }
  }

  if (localErrors.length) {
    console.error(localErrors.join('\n'));
    process.exitCode = 1;
    return;
  }

  const externalWarnings = [];
  const sample = [...externalLinks.keys()].slice(0, externalSampleLimit);
  for (const url of sample) {
    const warning = await checkExternalLink(url);
    if (warning) externalWarnings.push(warning);
  }

  if (externalWarnings.length) {
    const message = `External link warnings:\n${externalWarnings.join('\n')}`;
    if (strictExternal) {
      console.error(message);
      process.exitCode = 1;
      return;
    }
    console.warn(message);
  }

  console.log(
    `Link check passed: ${localCount} local links checked, ${sample.length}/${externalLinks.size} external links sampled.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
