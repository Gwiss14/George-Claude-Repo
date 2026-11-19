import './survivor.css';
import { buzz, isIOS, isStandalone } from '../app/app.js';
import { S, UPGRADES } from './config.js';
import { Run } from './sim.js';
import { RunView } from './view.js';
import { UI } from './ui.js';
import { SurvivorDebug } from './debug.js';

const params = new URLSearchParams(location.search);
const timeScale = Number(params.get('speed')) || 1;

const ui = new UI({
  onPlay: () => startRun(),
  onChoose: (k) => run.choose(k),
  onPause: (on) => setPaused(on),
  onQuit: () => { setPaused(false); run.phase = 'dead'; ui.showResults(run, false); },
});
const run = new Run(ui.save.shop);
document.getElementById('install').hidden = !(isIOS && !isStandalone); // iPhone Safari: how to install
const view = new RunView(document.getElementById('app'), run);
const debug = new SurvivorDebug(run, view.renderer, () => startRun());
if (params.has('debug')) debug.toggle(true);

// ---- one-thumb control: touch and drag anywhere; WASD / arrows on a keyboard ------------------
const keys = new Set();
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const base = document.getElementById('stick-base'), knob = document.getElementById('stick-knob');
const zone = document.getElementById('app');
window.addEventListener('keydown', (e) => {
  if (e.code === 'Backquote') { debug.toggle(); return; }
  if (e.code === 'Escape' && run.phase === 'play') setPaused(!paused);
  keys.add(e.code);
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
zone.addEventListener('pointerdown', (e) => {
  if (stick.id !== null) return;
  Object.assign(stick, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 });
  zone.setPointerCapture(e.pointerId);
  base.style.display = 'block'; base.style.left = `${e.clientX}px`; base.style.top = `${e.clientY}px`;
  knob.style.transform = 'translate(-50%, -50%)';
});
zone.addEventListener('pointermove', (e) => {
  if (e.pointerId !== stick.id) return;
  let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
  const d = Math.hypot(dx, dy), m = 50;
  if (d > m) { stick.ox += (dx / d) * (d - m); stick.oy += (dy / d) * (d - m); dx = (dx / d) * m; dy = (dy / d) * m; } // the stick follows the thumb
  stick.x = dx / m; stick.y = dy / m;
  base.style.left = `${stick.ox}px`; base.style.top = `${stick.oy}px`;
  knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
});
const end = (e) => { if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; base.style.display = 'none'; } };
zone.addEventListener('pointerup', end);
zone.addEventListener('pointercancel', end);
const input = { mx: 0, mz: 0 };
function readInput() {
  let x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  let z = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  x += stick.x; z += stick.y; // screen down = world +Z (toward the camera)
  const m = Math.hypot(x, z);
  input.mx = m > 1 ? x / m : x; input.mz = m > 1 ? z / m : z;
}

// ---- game events → screens, words and haptics -----------------------------------------------------
const KO = ['POW!', 'BONK!', 'WHAM!', 'KA-POW!', 'SMACK!'];
let killPopT = 0;
run.on((ev, r) => {
  const p = (x, z, y = 1.8) => view.project(x, y, z);
  switch (ev.type) {
    case 'kill': {
      if (ev.kind === 'boss') { ui.banner('GRUDGE IS DOWN!'); buzz('heavy'); }
      else if (ev.kind === 'brute' || r.time - killPopT > 0.6) { killPopT = r.time; const q = p(ev.x, ev.z); ui.pop(q.x, q.y, KO[Math.floor(Math.random() * KO.length)], ev.kind === 'brute' ? 'big' : ''); }
      buzz(ev.kind === 'grunt' || ev.kind === 'runner' ? 'light' : 'medium');
      break;
    }
    case 'hurt': buzz('medium'); { const q = p(r.juno.x, r.juno.z, 2.1); ui.pop(q.x, q.y, `-${Math.round(ev.amount)}`, 'bad'); } break;
    case 'heal': { const q = p(r.juno.x, r.juno.z, 2.1); ui.pop(q.x, q.y, `+${ev.amount}`, 'heal'); } break;
    case 'boss': ui.banner(ev.n === S.spawn.bossAt.length ? 'GRUDGE IS BACK — LAST TIME!' : 'BOSS: GRUDGE!'); buzz('heavy'); break;
    case 'smash': buzz('heavy'); break;
    case 'levelup': buzz('success'); ui.showLevelUp(r, ev.choices); break;
    case 'chose': if (r.phase === 'play') ui.hideLevelUp(); break;
    case 'revive': ui.banner('BACK ON YOUR FEET!'); buzz('success'); break;
    case 'dead': buzz('error'); setTimeout(() => ui.showResults(r, false), 1200); break;
    case 'won': buzz('success'); ui.banner('ROOF HELD!', 2500); setTimeout(() => ui.showResults(r, true), 2200); break;
  }
});

let paused = false;
function setPaused(on) {
  paused = on && run.phase === 'play';
  document.getElementById('paused').hidden = !paused;
}
document.addEventListener('visibilitychange', () => { if (document.hidden && run.phase === 'play') setPaused(true); });

function startRun() {
  run.meta = ui.save.shop;
  run.reset();
  ui.startRun();
  setPaused(false);
  ui.banner('HOLD THE ROOF!', 1400);
  playing = true;
}

let bot = null, playing = false;
if (params.get('bot')) {
  const { SurvivorBot } = await import('./bot.js');
  bot = new SurvivorBot(run, input);
  window.__botReport = bot.report;
  startRun();
}

// fixed 60 Hz steps, drawing interpolates between them
const STEP = 1 / 60;
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing && !paused) {
    acc += dt * timeScale;
    let n = 0;
    while (acc >= STEP && n < 12 * timeScale) {
      if (bot) bot.think(STEP); else readInput();
      run.step(STEP, input);
      acc -= STEP; n++;
    }
    if (acc > STEP * 4) acc = 0;
  }
  view.render(Math.min(1, acc / STEP), dt, now / 1000);
  if (playing) ui.update(run);
  debug.update(dt);
}
requestAnimationFrame(frame);

Object.assign(window, { __run: run, __view: view, __ui: ui, __S: S, __UPGRADES: UPGRADES });
