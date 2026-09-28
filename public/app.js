'use strict';

// Client for the workout tracker. State lives on the server; every change is
// sent as an action and every connected device receives the new state over
// Server-Sent Events, so all open tabs/phones stay in sync in real time.

const app = document.getElementById('app');
const statusEl = document.getElementById('status');
const toastEl = document.getElementById('toast');
const restEl = document.getElementById('rest');
const restTimeEl = document.getElementById('rest-time');
const namesList = document.getElementById('exercise-names');

const REST_SECONDS = 90;
let state = null;
let restEndsAt = null;

// ---------- helpers ----------

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const fmtNum = (n) => (Math.round(n * 10) / 10).toLocaleString();
const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function summarize(w) {
  let sets = 0, volume = 0;
  for (const e of w.exercises) {
    for (const s of e.sets) {
      if (!s.done) continue;
      sets += 1;
      volume += s.reps * s.weight;
    }
  }
  return { sets, volume, exercises: w.exercises.length };
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => { toastEl.hidden = true; }, 3000);
}

function setStatus(kind, label) {
  statusEl.dataset.state = kind;
  statusEl.querySelector('.label').textContent = label;
}

// ---------- server sync ----------

function receive(next) {
  // SSE and POST responses can arrive in either order; keep the newest.
  if (state && next.version < state.version) return;
  state = next;
  render();
}

async function send(action) {
  try {
    const res = await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
    receive(body);
  } catch (err) {
    showToast(err.message === 'Failed to fetch' ? 'Offline — change not saved' : err.message);
  }
}

function connect() {
  const es = new EventSource('/api/events');
  es.addEventListener('open', () => setStatus('live', 'Live'));
  es.addEventListener('state', (e) => receive(JSON.parse(e.data)));
  es.addEventListener('error', () => {
    setStatus(es.readyState === EventSource.CLOSED ? 'offline' : 'connecting', 'Reconnecting…');
    if (es.readyState === EventSource.CLOSED) setTimeout(connect, 3000);
  });
}

// ---------- rendering ----------

function renderStats() {
  const done = state.workouts.filter((w) => w.endedAt);
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const thisWeek = done.filter((w) => w.startedAt >= weekAgo).length;
  const totalVolume = done.reduce((sum, w) => sum + summarize(w).volume, 0);
  return `
    <section class="stats">
      <div class="stat"><div class="v">${thisWeek}</div><div class="k">This week</div></div>
      <div class="stat"><div class="v">${done.length}</div><div class="k">Workouts</div></div>
      <div class="stat"><div class="v">${fmtNum(totalVolume)}</div><div class="k">Total volume</div></div>
    </section>`;
}

function renderStart() {
  return `
    <section class="card">
      <h2>Start a workout</h2>
      <form class="row" data-form="start">
        <input name="name" placeholder="Push day, Legs, Full body…" maxlength="80" autocomplete="off" data-key="start-name">
        <button class="primary" type="submit">Start</button>
      </form>
    </section>`;
}

function renderSet(w, e, s, i) {
  const ids = `data-w="${w.id}" data-e="${e.id}" data-s="${s.id}"`;
  return `
    <div class="set ${s.done ? 'done' : ''}">
      <span class="n">${i + 1}</span>
      <input type="number" inputmode="decimal" min="0" step="any" value="${s.weight}" aria-label="Weight" data-field="weight" data-key="w-${s.id}" ${ids}>
      <input type="number" inputmode="numeric" min="0" step="1" value="${s.reps}" aria-label="Reps" data-field="reps" data-key="r-${s.id}" ${ids}>
      <button type="button" class="check" data-act="toggleSet" ${ids} aria-pressed="${s.done}" aria-label="Mark set done">✓</button>
      <button type="button" class="ghost" data-act="removeSet" ${ids} aria-label="Remove set">✕</button>
    </div>`;
}

function renderExercise(w, e) {
  return `
    <section class="card">
      <div class="exercise-head">
        <h3>${esc(e.name)}</h3>
        <button type="button" class="ghost danger small" data-act="removeExercise" data-w="${w.id}" data-e="${e.id}">Remove</button>
      </div>
      <div class="sets">
        ${e.sets.length ? `<div class="set header"><span class="n">Set</span><span>Weight</span><span>Reps</span><span></span><span></span></div>` : ''}
        ${e.sets.map((s, i) => renderSet(w, e, s, i)).join('')}
      </div>
      <button type="button" data-act="addSet" data-w="${w.id}" data-e="${e.id}" style="width:100%;margin-top:8px">+ Add set</button>
    </section>`;
}

function renderActive(w) {
  const sum = summarize(w);
  return `
    <section class="card">
      <div class="workout-head">
        <div style="flex:1;min-width:0">
          <input class="title" value="${esc(w.name)}" maxlength="80" aria-label="Workout name" data-field="workoutName" data-key="wn-${w.id}" data-w="${w.id}">
          <div class="muted small">${sum.exercises} exercises · ${sum.sets} sets · ${fmtNum(sum.volume)} volume</div>
        </div>
        <div class="elapsed" data-started="${w.startedAt}">${fmtDuration(Date.now() - w.startedAt)}</div>
      </div>
    </section>
    ${w.exercises.map((e) => renderExercise(w, e)).join('')}
    <section class="card">
      <form class="row" data-form="addExercise" data-w="${w.id}">
        <input name="name" placeholder="Add exercise (e.g. Bench press)" list="exercise-names" maxlength="80" autocomplete="off" data-key="add-ex">
        <button type="submit">Add</button>
      </form>
    </section>
    <div class="row">
      <button type="button" class="primary" style="flex:1" data-act="finishWorkout" data-w="${w.id}">Finish workout</button>
      <button type="button" class="danger" data-act="deleteWorkout" data-w="${w.id}">Discard</button>
    </div>`;
}

function renderHistory() {
  const done = state.workouts.filter((w) => w.endedAt);
  if (!done.length) return `<section class="card"><h2>History</h2><div class="empty">No finished workouts yet.</div></section>`;
  const items = done.map((w) => {
    const sum = summarize(w);
    const detail = w.exercises.map((e) => {
      const sets = e.sets.filter((s) => s.done).map((s) => `${fmtNum(s.weight)}×${s.reps}`).join(', ');
      return `<li>${esc(e.name)}${sets ? `: ${sets}` : ''}</li>`;
    }).join('');
    return `
      <div class="history-item">
        <details style="flex:1;min-width:0">
          <summary>
            <div class="name">${esc(w.name)}</div>
            <div class="muted small">${fmtDate(w.startedAt)} · ${fmtDuration(w.endedAt - w.startedAt)} · ${sum.sets} sets · ${fmtNum(sum.volume)} vol</div>
          </summary>
          ${detail ? `<ul class="history-detail">${detail}</ul>` : ''}
        </details>
        <button type="button" class="ghost" data-act="deleteWorkout" data-w="${w.id}" aria-label="Delete workout">✕</button>
      </div>`;
  }).join('');
  return `<section class="card"><h2>History</h2><div class="history">${items}</div></section>`;
}

function render() {
  // Preserve focus/typing across re-renders triggered by other devices.
  const focused = document.activeElement;
  const key = focused && focused.dataset ? focused.dataset.key : null;
  const typed = key ? { value: focused.value, start: focused.selectionStart, end: focused.selectionEnd } : null;

  const active = state.workouts.find((w) => w.id === state.activeWorkoutId);
  app.innerHTML = active ? renderActive(active) : renderStats() + renderStart() + renderHistory();

  const names = [...new Set(state.workouts.flatMap((w) => w.exercises.map((e) => e.name)))].sort();
  namesList.innerHTML = names.map((n) => `<option value="${esc(n)}">`).join('');

  if (key) {
    const el = app.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (el) {
      el.value = typed.value;
      el.focus();
      try { el.setSelectionRange(typed.start, typed.end); } catch { /* number inputs */ }
    }
  }
  if (!active) stopRest();
}

// ---------- rest timer (per device) ----------

function startRest(seconds = REST_SECONDS) {
  restEndsAt = Date.now() + seconds * 1000;
  restEl.hidden = false;
  tickRest();
}

function stopRest() {
  restEndsAt = null;
  restEl.hidden = true;
  restEl.classList.remove('over');
}

function tickRest() {
  if (!restEndsAt) return;
  const left = restEndsAt - Date.now();
  restEl.classList.toggle('over', left <= 0);
  restTimeEl.textContent = left > 0 ? fmtDuration(left + 999) : `+${fmtDuration(-left)}`;
  if (left <= 0 && left > -1000 && navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

restEl.addEventListener('click', (e) => {
  const v = e.target.dataset.rest;
  if (!v) return;
  if (v === 'skip') return stopRest();
  restEndsAt = Math.max(Date.now(), restEndsAt) + Number(v) * 1000;
  tickRest();
});

setInterval(() => {
  for (const el of app.querySelectorAll('.elapsed[data-started]')) {
    el.textContent = fmtDuration(Date.now() - Number(el.dataset.started));
  }
  tickRest();
}, 1000);

// ---------- events ----------

app.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const name = form.elements.name.value.trim();
  if (form.dataset.form === 'start') {
    send({ type: 'startWorkout', name: name || undefined });
  } else if (form.dataset.form === 'addExercise' && name) {
    form.elements.name.value = '';
    send({ type: 'addExercise', workoutId: form.dataset.w, name });
  }
});

app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const { act, w, e: ex, s } = btn.dataset;
  switch (act) {
    case 'addSet':
      send({ type: 'addSet', workoutId: w, exerciseId: ex });
      break;
    case 'toggleSet': {
      const done = btn.getAttribute('aria-pressed') !== 'true';
      send({ type: 'updateSet', workoutId: w, exerciseId: ex, setId: s, done });
      if (done) startRest();
      break;
    }
    case 'removeSet':
      send({ type: 'removeSet', workoutId: w, exerciseId: ex, setId: s });
      break;
    case 'removeExercise':
      if (confirm('Remove this exercise and its sets?')) send({ type: 'removeExercise', workoutId: w, exerciseId: ex });
      break;
    case 'finishWorkout':
      send({ type: 'finishWorkout', workoutId: w });
      break;
    case 'deleteWorkout':
      if (confirm('Delete this workout? This cannot be undone.')) send({ type: 'deleteWorkout', workoutId: w });
      break;
  }
});

app.addEventListener('change', (e) => {
  const el = e.target;
  const { field, w, e: ex, s } = el.dataset;
  if (field === 'weight' || field === 'reps') {
    if (el.value === '') return;
    send({ type: 'updateSet', workoutId: w, exerciseId: ex, setId: s, [field]: Number(el.value) });
  } else if (field === 'workoutName' && el.value.trim()) {
    send({ type: 'renameWorkout', workoutId: w, name: el.value });
  }
});

app.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.dataset.field) e.target.blur();
});

connect();
