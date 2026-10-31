'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Local Web UI Server
//  Zero dependencies — uses Node.js built-in http, fs, path, child_process
// ─────────────────────────────────────────────────────────────────────────────

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { exec } = require('child_process');

const { humanize, humanizeString } = require('./index');
const { diff } = require('./diff');
const pkg = require('../package.json');

function openBrowser(url) {
  const start = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32'  ? 'start' : 'xdg-open';
  exec(`${start} ${url}`, () => {});
}

function sendJSON(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(payload);
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(text);
}

function createRequestHandler(docsDir = path.resolve(__dirname, '../docs')) {
  return async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      res.end();
      return;
    }

    const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    // API: Health
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJSON(res, 200, { status: 'ok', version: pkg.version });
    }

    // API: Humanize
    if (pathname === '/api/humanize' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const raw = payload.text || payload.content || '';
          const opts = {
            format: payload.format || 'plain',
            mode: payload.mode || 'structured',
            lang: payload.lang || 'English',
            engine: payload.engine || 'local',
            aiProvider: payload.aiProvider || 'anthropic',
            apiKey: payload.apiKey,
            context: payload.context,
          };

          const result = await humanizeString(raw, opts);
          return sendJSON(res, 200, { success: true, result });
        } catch (err) {
          return sendJSON(res, 400, { success: false, error: err.message });
        }
      });
      return;
    }

    // API: Diff
    if (pathname === '/api/diff' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const { parseAny } = require('./parsers');
          const a = typeof payload.a === 'string' ? parseAny(payload.a) : payload.a;
          const b = typeof payload.b === 'string' ? parseAny(payload.b) : payload.b;
          const opts = {
            format: payload.format || 'plain',
            lang: payload.lang || 'English',
            engine: payload.engine || 'local',
          };

          const result = await diff(a, b, opts);
          return sendJSON(res, 200, { success: true, result });
        } catch (err) {
          return sendJSON(res, 400, { success: false, error: err.message });
        }
      });
      return;
    }

    // Static files: serve docs/index.html as default UI
    let filePath = path.join(docsDir, pathname === '/' ? 'index.html' : pathname);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(docsDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js':   'application/javascript; charset=utf-8',
      '.css':  'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png':  'image/png',
      '.svg':  'image/svg+xml',
      '.ico':  'image/x-icon',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      sendText(res, 200, content, contentType);
    } catch (err) {
      sendText(res, 500, `Internal Server Error: ${err.message}`);
    }
  };
}

function startServer(options = {}) {
  const port = Number(options.port) || 3456;
  const shouldOpen = options.open !== false;
  const docsDir = path.resolve(__dirname, '../docs');
  const handler = createRequestHandler(docsDir);

  const server = http.createServer(handler);

  return new Promise((resolve) => {
    server.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`\n  🚀  json-humanized UI is running at: ${url}`);
      console.log('  Press Ctrl+C to stop the server.\n');
      if (shouldOpen) {
        openBrowser(url);
      }
      resolve({ server, port, url });
    });
  });
}

module.exports = { startServer, createRequestHandler };
