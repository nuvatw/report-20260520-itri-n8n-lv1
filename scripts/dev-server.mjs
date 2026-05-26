#!/usr/bin/env node
import { createReadStream, watch } from 'node:fs';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { buildReportIndex } from './build-report-index.mjs';

const root = process.cwd();
const host = '127.0.0.1';
const requestedPort = Number(process.env.PORT || readPortArg() || 4173);

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

function readPortArg() {
  const match = process.argv.find((arg) => arg.startsWith('--port='));
  return match ? match.split('=')[1] : '';
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
  if (stat.isDirectory()) {
    return path.join(target, 'index.html');
  }
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
      const headers = {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' || ext === '.js' || ext === '.json' ? 'no-store' : 'public, max-age=3600'
      };
      res.writeHead(200, headers);
      createReadStream(target).pipe(res);
    } catch (error) {
      if (error.code === 'ENOENT') {
        send(res, 404, 'Not found');
        return;
      }
      send(res, 500, error.message);
    }
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(listen(createServer(), port + 1));
        return;
      }
      reject(error);
    });

    server.once('listening', () => {
      resolve({ server, port });
    });

    server.listen(port, host);
  });
}

function watchReports() {
  const reportsPath = path.join(root, 'reports');
  let timer = null;

  try {
    watch(reportsPath, { persistent: true }, (eventType, fileName = '') => {
      if (!fileName.toLowerCase().endsWith('.html')) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await buildReportIndex({ root });
        } catch (error) {
          console.error(error.message);
        }
      }, 150);
    });
  } catch (error) {
    console.warn(`Watch disabled: ${error.message}`);
  }
}

await buildReportIndex({ root });
watchReports();

const { port } = await listen(createServer(), requestedPort);
console.log(`Report timeline running at http://${host}:${port}`);
