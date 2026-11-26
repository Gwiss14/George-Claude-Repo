// Hidden debug panel: open with ` (backquote) or add ?debug to the address.
// Sliders are generated from CONFIG, so every tunable number is here automatically.

import { CONFIG } from '../config.js';
import { stateLabel } from '../game/game.js';

function stepFor(v) {
  if (Number.isInteger(v) && Math.abs(v) >= 5) return 1;
  if (Math.abs(v) >= 1) return 0.05;
  return 0.005;
}

export class Debug {
  constructor(game, view, onRestart) {
    this.game = game; this.view = view;
    this.root = document.getElementById('debug');
    this.readout = document.createElement('pre');
    this.readout.className = 'readout';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.innerHTML = `<label><input type="checkbox" id="dbg-boxes"> bounding boxes</label>
      <button id="dbg-restart">Restart</button><button id="dbg-close">Close</button>`;
    this.root.append(bar, this.readout);
    bar.querySelector('#dbg-boxes').addEventListener('change', (e) => view.setDebugShapes(e.target.checked));
    bar.querySelector('#dbg-restart').addEventListener('click', onRestart);
    bar.querySelector('#dbg-close').addEventListener('click', () => this.toggle(false));
    this.buildSliders();
    this.frames = 0; this.acc = 0; this.fps = 0; this.tick = 0;
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  buildSliders() {
    const box = document.createElement('div');
    box.className = 'sliders';
    for (const [section, obj] of Object.entries(CONFIG)) {
      const h = document.createElement('h4'); h.textContent = section; box.appendChild(h);
      this.addGroup(box, obj, section);
    }
    this.root.appendChild(box);
  }

  addGroup(box, obj, path) {
    for (const [key, v] of Object.entries(obj)) {
      const name = `${path}.${key}`;
      if (typeof v === 'number') this.addSlider(box, obj, key, name);
      else if (Array.isArray(v) && v.every((n) => typeof n === 'number')) v.forEach((_, i) => this.addSlider(box, v, i, `${name}[${i}]`));
      else if (v && typeof v === 'object' && !Array.isArray(v)) this.addGroup(box, v, name);
    }
  }

  addSlider(box, obj, key, name) {
    const v = obj[key];
    const row = document.createElement('label');
    row.className = 'row';
    const min = v < 0 ? v * 3 : 0, max = v === 0 ? 1 : Math.abs(v) * 3;
    row.innerHTML = `<span>${name}</span><input type="range" min="${min}" max="${max}" step="${stepFor(v)}" value="${v}"><b>${v}</b>`;
    const input = row.querySelector('input'), out = row.querySelector('b');
    input.addEventListener('input', () => { obj[key] = Number(input.value); out.textContent = input.value; });
    box.appendChild(row);
  }

  get open() { return this.root.classList.contains('show'); }
  toggle(force) { this.root.classList.toggle('show', force ?? !this.open); }

  update(dt) {
    this.frames++; this.acc += dt;
    if (this.acc >= 0.5) { this.fps = this.frames / this.acc; this.frames = 0; this.acc = 0; }
    if (!this.open) return;
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 0.25;
    const info = this.view.renderer.info.render;
    const g = this.game;
    const lines = [
      `FPS ${this.fps.toFixed(0)}   draw calls ${info.calls}   triangles ${info.triangles}`,
      `time ${g.time.toFixed(1)} s   phase ${g.phase}   wave ${g.waveIndex + 1}   attackers ${g.fighters.filter((f) => f.token).length}`,
      '',
      'fighter        state         hp    size w×h×d (m)',
    ];
    for (const f of g.fighters) {
      const s = this.view.measure(f.uid);
      const size = s ? `${s.x.toFixed(2)}×${s.y.toFixed(2)}×${s.z.toFixed(2)}` : '-';
      lines.push(`${(f.kind + '#' + f.uid).padEnd(15)}${stateLabel(f).padEnd(14)}${String(Math.ceil(f.hp)).padEnd(6)}${size}`);
    }
    this.readout.textContent = lines.join('\n');
  }
}
