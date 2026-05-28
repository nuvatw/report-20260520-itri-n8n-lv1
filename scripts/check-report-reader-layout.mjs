#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const require = createRequire(import.meta.url);
const host = '127.0.0.1';
const browserTimeoutMs = Number(process.env.READER_CHECK_TIMEOUT_MS || 20000);
const longReportPageThreshold = Number(process.env.READER_CHECK_LONG_REPORT_PAGES || 10);

const viewports = [
  { name: 'desktop', width: 1440, height: 1100 },
  { name: 'narrow', width: 1100, height: 1100 },
  { name: 'tablet', width: 820, height: 1100 },
  { name: 'mobile', width: 390, height: 1200 }
];

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf'
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function isExecutable(candidate) {
  if (!candidate) return false;
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];

  for (const candidate of candidates) {
    if (await isExecutable(candidate)) return candidate;
  }

  throw new Error('Chrome, Chromium, or Edge was not found. Set CHROME_PATH to run reader checks.');
}

function loadPlaywright() {
  const moduleDirs = [
    process.env.PLAYWRIGHT_NODE_MODULES,
    path.join(root, 'node_modules'),
    path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')
  ].filter(Boolean);

  for (const moduleDir of moduleDirs) {
    try {
      const resolved = require.resolve('playwright', { paths: [moduleDir] });
      return require(resolved);
    } catch {
      // Try the next known module location.
    }
  }

  throw new Error('Playwright was not found. Set PLAYWRIGHT_NODE_MODULES or install playwright to run reader checks.');
}

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

async function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}`);
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const target = path.normalize(path.join(root, pathname));
  const relative = path.relative(root, target);

  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;

  const stat = await fs.stat(target);
  if (stat.isDirectory()) return path.join(target, 'index.html');
  return target;
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const target = await resolveRequestPath(req.url || '/');
      if (!target) {
        send(res, 403, 'Forbidden');
        return;
      }

      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      createReadStream(target).pipe(res);
    } catch (error) {
      send(res, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not found' : error.message);
    }
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', () => {
      const address = server.address();
      resolve(address.port);
    });
    server.listen(0, host);
  });
}

async function listReports() {
  const reportsDir = path.join(root, 'reports');
  const entries = await fs.readdir(reportsDir);
  return entries
    .filter((entry) => entry.endsWith('.html'))
    .sort()
    .map((entry) => `reports/${entry}`);
}

async function inspectReader(page) {
  return page.evaluate(() => {
    function rectFor(node) {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    }

    function overlaps(a, b) {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    const reader = document.getElementById('nuva-report-reader');
    const readerRect = rectFor(reader);
    const readerStyle = reader ? window.getComputedStyle(reader) : null;
    const readerHidden = !reader
      || reader.classList.contains('is-reader-hidden')
      || readerStyle?.display === 'none'
      || readerStyle?.visibility === 'hidden'
      || !readerRect?.width
      || !readerRect?.height;
    const pages = [...document.querySelectorAll('.page')].map((node) => ({
      id: node.id || '',
      rect: rectFor(node)
    }));
    const collisions = readerHidden || !readerRect
      ? []
      : pages.filter((entry) => entry.rect && overlaps(readerRect, entry.rect)).map((entry) => entry.id || '(no id)');

    return {
      title: document.title,
      pageCount: pages.length,
      tocCount: document.querySelectorAll('#toc .toc-sub').length,
      readerExists: Boolean(reader),
      readerHidden,
      readerCompact: Boolean(reader?.classList.contains('is-reader-compact')),
      readerLinks: document.querySelectorAll('#nuva-report-reader .reader-link').length,
      readerHeight: readerRect?.height || 0,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      collisions
    };
  });
}

async function main() {
  const browserPath = await findBrowser();
  const playwright = loadPlaywright();
  const reports = await listReports();
  const server = createServer();
  const port = await listen(server);
  const baseUrl = `http://${host}:${port}`;
  const browser = await playwright.chromium.launch({
    headless: true,
    executablePath: browserPath,
    timeout: browserTimeoutMs
  });
  const errors = [];
  const warnings = [];
  let measurements = 0;

  try {
    for (const reportPath of reports) {
      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        const browserErrors = [];
        page.on('pageerror', (error) => browserErrors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') browserErrors.push(message.text());
        });

        try {
          await page.goto(`${baseUrl}/${reportPath}`, { waitUntil: 'networkidle', timeout: browserTimeoutMs });
          await page.waitForTimeout(350);
          const result = await inspectReader(page);
          measurements += 1;

          if (!result.readerExists) errors.push(`${reportPath} ${viewport.name}: reader missing`);
          if (result.readerLinks <= 0) errors.push(`${reportPath} ${viewport.name}: reader has no links`);
          if (result.overflow > 1) errors.push(`${reportPath} ${viewport.name}: horizontal overflow ${result.overflow}px`);
          if (result.collisions.length > 0) {
            errors.push(`${reportPath} ${viewport.name}: reader overlaps pages ${result.collisions.join(', ')}`);
          }
          if (viewport.name === 'desktop' && result.readerHidden) {
            errors.push(`${reportPath} desktop: reader is hidden`);
          }
          if (viewport.name === 'desktop' && result.pageCount > longReportPageThreshold && result.tocCount === 0) {
            warnings.push(`${reportPath}: ${result.pageCount} pages without curated #toc .toc-sub`);
          }
          if (viewport.name === 'desktop' && result.readerHeight > viewport.height * 1.5) {
            warnings.push(`${reportPath}: reader height ${Math.round(result.readerHeight)}px exceeds viewport height; consider curated TOC or internal reader scroll`);
          }
          if (browserErrors.length > 0) {
            errors.push(`${reportPath} ${viewport.name}: browser errors:\n${browserErrors.join('\n')}`);
          }
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (warnings.length > 0) {
    console.warn(`Reader layout warnings:\n${warnings.map((warning) => `- ${warning}`).join('\n')}`);
  }

  assert(errors.length === 0, `Reader layout check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  console.log(`Reader layout check passed: ${reports.length} reports across ${measurements} viewport checks.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
