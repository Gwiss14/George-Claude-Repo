import './style.css';
import { CONFIG } from './config.js';
import { Game } from './game/game.js';
import { View } from './view/view.js';
import { Input } from './input.js';
import { Hud } from './ui/hud.js';
import { Debug } from './ui/debug.js';

const params = new URLSearchParams(location.search);
if (params.has('speed')) CONFIG.sim.timeScale = Number(params.get('speed')) || 1;

const game = new Game();
const view = new View(document.getElementById('app'), game);
const restart = () => game.reset();
const debug = new Debug(game, view, restart);
const input = new Input({ onRestart: restart, onDebug: () => debug.toggle() });
const hud = new Hud(game, restart, view);
if (params.has('debug')) debug.toggle(true);

if (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch');
window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') document.body.classList.add('touch'); });

let bot = null;
if (params.get('bot')) {
  const { Bot } = await import('./bot.js');
  bot = new Bot(params.get('bot'), game, input, Number(params.get('waves')) || 6);
}

// Fixed gameplay steps; rendering interpolates between the last two steps.
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const step = 1 / CONFIG.sim.hz;
  acc += dt * CONFIG.sim.timeScale * game.timeWarp;
  const maxSteps = Math.ceil(14 * CONFIG.sim.timeScale);
  let n = 0;
  while (acc >= step && n < maxSteps) {
    if (bot) bot.think(step);
    const m = input.move();
    game.step(step, { mx: m.x, mz: -m.y, attackPresses: input.takeAttacks() });
    acc -= step;
    n++;
  }
  if (n >= maxSteps) acc = 0;
  view.render(acc / step, dt, now / 1000);
  hud.update(dt);
  debug.update(dt);
}
requestAnimationFrame(frame);

// for tests and the console
Object.assign(window, { __game: game, __view: view, __input: input, __config: CONFIG });
