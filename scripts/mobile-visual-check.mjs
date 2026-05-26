#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const require = createRequire(import.meta.url);
const host = '127.0.0.1';
const artifactDir = path.join(root, 'artifacts', 'qa');
const minScreenshotBytes = 8000;
const browserTimeoutMs = Number(process.env.VISUAL_CHECK_TIMEOUT_MS || 15000);

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
  if (!condition) {
    throw new Error(message);
  }
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

  throw new Error('Chrome, Chromium, or Edge was not found. Set CHROME_PATH to run visual checks.');
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

  return null;
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

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

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

async function screenshotLooksValid(file) {
  const stat = await fs.stat(file).catch(() => null);
  return Boolean(stat?.isFile() && stat.size >= minScreenshotBytes);
}

function runBrowser(browserPath, args, expectedOutput) {
  return new Promise((resolve, reject) => {
    const child = spawn(browserPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let settled = false;

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const settle = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(async () => {
      if (await screenshotLooksValid(expectedOutput)) {
        child.kill('SIGTERM');
        settle(resolve);
        return;
      }

      child.kill('SIGKILL');
      settle(() => reject(new Error(`Headless browser timed out before creating ${expectedOutput}`)));
    }, browserTimeoutMs);

    child.on('error', (error) => {
      settle(() => reject(error));
    });

    child.on('close', async (code) => {
      if (settled) return;
      if (code === 0) {
        settle(resolve);
        return;
      }

      if (await screenshotLooksValid(expectedOutput)) {
        settle(resolve);
        return;
      }

      settle(() => reject(new Error(`Headless browser exited with ${code}: ${stderr.trim()}`)));
    });
  });
}

async function takeScreenshot({ browserPath, url, output, width, height }) {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'report-visual-'));
  await runBrowser(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-dev-shm-usage',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=3000',
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    `--screenshot=${output}`,
    url
  ], output);
}

async function assertScreenshot(file) {
  const stat = await fs.stat(file).catch(() => null);
  assert(stat?.isFile(), `Screenshot was not created: ${file}`);
  assert(stat.size >= minScreenshotBytes, `Screenshot looks too small to be valid: ${file}`);
}

async function runPlaywrightVisualCheck({ playwright, browserPath, url, desktop, mobile }) {
  const browser = await playwright.chromium.launch({
    headless: true,
    executablePath: browserPath
  });

  try {
    for (const target of [
      { file: desktop, width: 1440, height: 1100, name: 'desktop' },
      { file: mobile, width: 390, height: 1200, name: 'mobile' }
    ]) {
      const page = await browser.newPage({ viewport: { width: target.width, height: target.height } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });

      await page.goto(url, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(overflow <= 1, `${target.name} viewport has horizontal overflow: ${overflow}px`);
      await page.screenshot({ path: target.file, fullPage: false });
      assert(errors.length === 0, `${target.name} browser errors:\n${errors.join('\n')}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  await fs.mkdir(artifactDir, { recursive: true });

  const browserPath = await findBrowser();
  const playwright = loadPlaywright();
  const server = createServer();
  const port = await listen(server);
  const url = `http://${host}:${port}`;
  const desktop = path.join(artifactDir, 'home-desktop.png');
  const mobile = path.join(artifactDir, 'home-mobile.png');

  try {
    if (playwright) {
      await runPlaywrightVisualCheck({ playwright, browserPath, url, desktop, mobile });
    } else {
      await takeScreenshot({ browserPath, url, output: desktop, width: 1440, height: 1100 });
      await takeScreenshot({ browserPath, url, output: mobile, width: 500, height: 1200 });
    }

    await assertScreenshot(desktop);
    await assertScreenshot(mobile);
  } finally {
    server.close();
  }

  console.log(`Visual check passed: ${path.relative(root, desktop)}, ${path.relative(root, mobile)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
