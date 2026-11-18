import '../style.css';
import './fps.css';
import './setup.js';
import { CONFIG } from '../config.js';
import { FpsGame } from './fpsGame.js';
import { FpsView } from './fpsView.js';
import { FpsInput } from './fpsInput.js';
import { FpsHud } from './fpsHud.js';
import { Debug } from '../ui/debug.js';

const params = new URLSearchParams(location.search);
if (params.has('speed')) CONFIG.sim.timeScale = Number(params.get('speed')) || 1;

const game = new FpsGame();
const view = new FpsView(document.getElementById('app'), game);
const restart = () => game.reset();
const debug = new Debug(game, view, restart);
const input = new FpsInput({ canvas: view.renderer.domElement, onDebug: () => debug.toggle() });
const hud = new FpsHud(game, restart, view, input);
if (params.has('debug')) debug.toggle(true);

if (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch');
window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') document.body.classList.add('touch'); });
document.getElementById('end-restart').addEventListener('click', () => {
  try { view.renderer.domElement.requestPointerLock?.()?.catch?.(() => {}); } catch { /* fine without */ }
});

let bot = null;
if (params.get('bot')) {
  const { FpsBot } = await import('./fpsBot.js');
  bot = new FpsBot(params.get('bot'), game, input, Number(params.get('waves')) || 6);
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
  if (!bot) input.sample(dt);
  while (acc >= step && n < maxSteps) {
    if (bot) { bot.think(step); input.sample(step); }
    game.step(step, input.state);
    acc -= step;
    n++;
  }
  if (n >= maxSteps) acc = 0;
  view.render(acc / step, dt, now / 1000);
  hud.update(dt);
  debug.update(dt);
}
requestAnimationFrame(frame);

Object.assign(window, { __game: game, __view: view, __input: input, __config: CONFIG });
