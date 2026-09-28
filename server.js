'use strict';

// Zero-dependency workout tracker server.
//   GET  /api/state   -> current state
//   POST /api/actions -> apply an action, persist, broadcast
//   GET  /api/events  -> Server-Sent Events stream of state updates

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { apply, emptyState, ActionError } = require('./store');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function loadState(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`Could not read ${file}, starting fresh:`, err.message);
    return emptyState();
  }
}

function saveState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new ActionError('request body too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.normalize(path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 403, { error: 'forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

function createServer({ dataFile = path.join(__dirname, 'data', 'workouts.json') } = {}) {
  let state = loadState(dataFile);
  const clients = new Set();

  const broadcast = () => {
    const msg = `event: state\ndata: ${JSON.stringify(state)}\n\n`;
    for (const res of clients) res.write(msg);
  };

  // Keep proxies from closing idle SSE connections.
  const heartbeat = setInterval(() => {
    for (const res of clients) res.write(': ping\n\n');
  }, 25000);
  heartbeat.unref();

  const server = http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://x');
    try {
      if (req.method === 'GET' && pathname === '/api/state') return sendJson(res, 200, state);

      if (req.method === 'GET' && pathname === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        res.write(`retry: 2000\nevent: state\ndata: ${JSON.stringify(state)}\n\n`);
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
      }

      if (req.method === 'POST' && pathname === '/api/actions') {
        let action;
        try {
          action = JSON.parse(await readBody(req));
        } catch (err) {
          throw err instanceof ActionError ? err : new ActionError('invalid JSON');
        }
        state = apply(state, action);
        saveState(dataFile, state);
        broadcast();
        return sendJson(res, 200, state);
      }

      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
      sendJson(res, 405, { error: 'method not allowed' });
    } catch (err) {
      if (err instanceof ActionError) return sendJson(res, 400, { error: err.message });
      console.error(err);
      sendJson(res, 500, { error: 'internal error' });
    }
  });

  server.on('close', () => clearInterval(heartbeat));
  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer({ dataFile: process.env.DATA_FILE }).listen(port, () => {
    console.log(`Workout tracker running at http://localhost:${port}`);
  });
}

module.exports = { createServer };
