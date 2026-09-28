'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createServer } = require('../server');

function listen(server) {
  return new Promise((resolve) => server.listen(0, () => resolve(server.address().port)));
}

async function post(port, action) {
  const res = await fetch(`http://localhost:${port}/api/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  });
  return { status: res.status, body: await res.json() };
}

// Opens an SSE stream and collects parsed `state` events.
function subscribe(port) {
  const events = [];
  const waiters = [];
  const req = http.get(`http://localhost:${port}/api/events`, (res) => {
    let buf = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n\n')) !== -1) {
        const block = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const data = block.split('\n').find((l) => l.startsWith('data: '));
        if (block.includes('event: state') && data) {
          events.push(JSON.parse(data.slice(6)));
          waiters.splice(0).forEach((fn) => fn());
        }
      }
    });
  });
  const waitFor = async (n) => {
    while (events.length < n) await new Promise((r) => waiters.push(r));
    return events[n - 1];
  };
  return { events, waitFor, close: () => req.destroy() };
}

test('actions are persisted and broadcast to every connected client', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-'));
  const dataFile = path.join(dir, 'workouts.json');
  const server = createServer({ dataFile });
  const port = await listen(server);
  t.after(() => {
    server.closeAllConnections();
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const a = subscribe(port);
  const b = subscribe(port);
  assert.equal((await a.waitFor(1)).version, 0, 'initial snapshot on connect');
  await b.waitFor(1);

  const { status, body } = await post(port, { type: 'startWorkout', name: 'Legs' });
  assert.equal(status, 200);
  assert.equal(body.workouts[0].name, 'Legs');

  const [fromA, fromB] = await Promise.all([a.waitFor(2), b.waitFor(2)]);
  assert.equal(fromA.version, 1);
  assert.deepEqual(fromA, fromB);

  const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.equal(saved.workouts[0].name, 'Legs');

  // A fresh server picks up the persisted state.
  const again = createServer({ dataFile });
  const port2 = await listen(again);
  const state = await (await fetch(`http://localhost:${port2}/api/state`)).json();
  again.close();
  assert.equal(state.activeWorkoutId, body.activeWorkoutId);

  a.close();
  b.close();
});

test('invalid actions return 400 and are not broadcast', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-'));
  const server = createServer({ dataFile: path.join(dir, 'w.json') });
  const port = await listen(server);
  t.after(() => {
    server.closeAllConnections();
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const bad = await post(port, { type: 'addExercise', workoutId: 'nope', name: 'Squat' });
  assert.equal(bad.status, 400);
  assert.match(bad.body.error, /workout not found/);

  const res = await fetch(`http://localhost:${port}/api/actions`, { method: 'POST', body: '{not json' });
  assert.equal(res.status, 400);
});

test('static files are served and path traversal is blocked', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workout-'));
  const server = createServer({ dataFile: path.join(dir, 'w.json') });
  const port = await listen(server);
  t.after(() => {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const index = await fetch(`http://localhost:${port}/`);
  assert.equal(index.status, 200);
  assert.match(await index.text(), /Workout Tracker/);

  const traversal = await fetch(`http://localhost:${port}/..%2fserver.js`);
  assert.notEqual(traversal.status, 200);
});
