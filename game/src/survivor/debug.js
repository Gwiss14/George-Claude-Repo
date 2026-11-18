// Hidden debug panel (` key or ?debug): FPS, draw calls, live Crows, and a slider for every number in S.
import { S } from './config.js';

export class SurvivorDebug {
  constructor(run, renderer, onRestart) {
    this.run = run; this.renderer = renderer;
    const root = this.root = document.getElementById('debug');
    root.innerHTML = '<div class="bar"><button id="dbg-restart">Restart run</button><button id="dbg-close">Close</button></div><pre class="readout"></pre><div class="sliders"></div>';
    root.querySelector('#dbg-restart').onclick = onRestart;
    root.querySelector('#dbg-close').onclick = () => this.toggle(false);
    this.readout = root.querySelector('.readout');
    const box = root.querySelector('.sliders');
    const add = (obj, key, name) => {
      const v = obj[key];
      const row = document.createElement('label'); row.className = 'row';
      const step = Number.isInteger(v) && Math.abs(v) >= 5 ? 1 : Math.abs(v) >= 1 ? 0.05 : 0.005;
      row.innerHTML = `<span>${name}</span><input type="range" min="0" max="${v === 0 ? 1 : Math.abs(v) * 3}" step="${step}" value="${v}"><b>${v}</b>`;
      const inp = row.querySelector('input'), out = row.querySelector('b');
      inp.oninput = () => { obj[key] = Number(inp.value); out.textContent = inp.value; };
      box.appendChild(row);
    };
    const walk = (obj, path) => {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'number') add(obj, k, `${path}.${k}`);
        else if (Array.isArray(v)) v.forEach((n, i) => typeof n === 'number' && add(v, i, `${path}.${k}[${i}]`));
        else if (v && typeof v === 'object') walk(v, `${path}.${k}`);
      }
    };
    for (const [k, v] of Object.entries(S)) { const h = document.createElement('h4'); h.textContent = k; box.appendChild(h); if (typeof v === 'object') walk(v, k); }
    this.frames = 0; this.acc = 0; this.fps = 0; this.tick = 0;
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
  }
  get open() { return this.root.classList.contains('show'); }
  toggle(force) { this.root.classList.toggle('show', force ?? !this.open); }
  update(dt) {
    this.frames++; this.acc += dt;
    if (this.acc >= 0.5) { this.fps = this.frames / this.acc; this.frames = 0; this.acc = 0; }
    if (!this.open || (this.tick -= dt) > 0) return;
    this.tick = 0.25;
    const r = this.run, i = this.renderer.info.render;
    this.readout.textContent = `FPS ${this.fps.toFixed(0)}   draw calls ${i.calls}   triangles ${i.triangles}
time ${r.time.toFixed(1)} s   phase ${r.phase}   crows ${r.enemies.filter((e) => !e.dead).length}   coins ${r.coins.length}
level ${r.juno.level}   hp ${Math.ceil(r.juno.hp)}/${r.juno.maxHp}   ups ${JSON.stringify(r.juno.ups)}`;
  }
}
