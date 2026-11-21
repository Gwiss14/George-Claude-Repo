// Title, HUD, level-up cards, results and the upgrade shop. Plain DOM over the 3D canvas.

import { S, UPGRADES, SHOP } from './config.js';

const $ = (id) => document.getElementById(id);
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const ICON = { haymaker: 'H', quick: 'Q', reach: 'L', pipes: 'O', wrench: 'W', stomp: 'S', sneakers: 'R', magnet: 'M', ironskin: 'I', secondwind: '+', heal: '+' };

// Saved between runs on this phone. Wrapped: private windows may refuse storage.
export const Save = {
  load() {
    try { return { bank: 0, best: 0, bestKills: 0, wins: 0, shop: {}, ...JSON.parse(localStorage.getItem('rr-save') || '{}') }; }
    catch { return { bank: 0, best: 0, bestKills: 0, wins: 0, shop: {} }; }
  },
  store(s) { try { localStorage.setItem('rr-save', JSON.stringify(s)); } catch { /* keep playing without saving */ } },
};

export class UI {
  constructor({ onPlay, onChoose, onPause, onQuit }) {
    this.save = Save.load();
    this.onPlay = onPlay; this.onChoose = onChoose;
    $('play-btn').addEventListener('click', () => onPlay());
    $('again-btn').addEventListener('click', () => onPlay());
    $('shop-btn').addEventListener('click', () => this.openShop());
    $('end-shop-btn').addEventListener('click', () => this.openShop());
    $('shop-close').addEventListener('click', () => this.closeShop());
    $('pause-btn').addEventListener('click', () => onPause(true));
    $('resume-btn').addEventListener('click', () => onPause(false));
    $('quit-btn').addEventListener('click', () => onQuit());
    this.showTitle();
  }

  // ---- screens --------------------------------------------------------------------------
  screen(id) {
    for (const s of ['title', 'hud', 'levelup', 'results', 'shop', 'paused']) $(s).hidden = s !== id && !(id === 'levelup' && s === 'hud') && !(id === 'paused' && s === 'hud');
  }

  showTitle() {
    const v = this.save;
    $('title-best').textContent = v.best ? `Best: ${fmt(v.best)}${v.wins ? ` · ${v.wins} win${v.wins > 1 ? 's' : ''}` : ''}` : 'Hold the roof for 5:00';
    $('title-bank').textContent = Math.floor(v.bank);
    this.screen('title');
  }

  startRun() { this.screen('hud'); $('banner').classList.remove('show'); }

  // ---- HUD --------------------------------------------------------------------------------
  update(run) {
    const j = run.juno;
    $('timer').textContent = fmt(Math.max(0, S.run.length - run.time));
    $('xp-fill').style.width = `${Math.min(100, (j.xp / j.xpNeed) * 100)}%`;
    $('level').textContent = `LV ${j.level}`;
    $('hp-fill').style.width = `${Math.max(0, (j.hp / j.maxHp) * 100)}%`;
    $('hp-fill').classList.toggle('low', j.hp / j.maxHp < 0.3);
    $('kills').textContent = run.kills;
    $('run-coins').textContent = Math.floor(run.bank);
    // the ROLL button empties when used and refills as the cooldown runs out
    const cd = j.rollCd / S.juno.roll.cooldown;
    const btn = $('roll-btn');
    btn.style.setProperty('--cd', cd.toFixed(3));
    btn.classList.toggle('ready', cd <= 0);
  }

  banner(text, ms = 1600) {
    const b = $('banner');
    b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(this.bt); this.bt = setTimeout(() => b.classList.remove('show'), ms);
  }

  pop(x, y, text, cls = '') {
    const el = document.createElement('div');
    el.className = `pop ${cls}`; el.textContent = text;
    el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.setProperty('--tilt', `${(Math.random() - 0.5) * 16}deg`);
    $('pops').appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  // ---- level up: pick 1 of 3 --------------------------------------------------------------
  showLevelUp(run, choices) {
    const box = $('cards');
    box.innerHTML = '';
    for (const key of choices) {
      const now = run.lv(key), next = now + 1;
      const u = UPGRADES[key] || { name: 'Patch Up', text: () => 'Heal 30' };
      const b = document.createElement('button');
      b.className = 'card'; b.dataset.key = key;
      b.innerHTML = `<span class="icon">${ICON[key]}</span><span class="what"><b>${u.name}</b><span>${u.text(next)}</span></span>
        <span class="pips">${key === 'heal' ? '' : Array.from({ length: 5 }, (_, i) => `<i class="${i < next ? 'on' : ''}${i === now ? ' new' : ''}"></i>`).join('')}</span>`;
      b.addEventListener('click', () => this.onChoose(key), { once: true });
      box.appendChild(b);
    }
    $('levelup-title').textContent = `LEVEL ${run.juno.level}!`;
    this.screen('levelup');
  }

  hideLevelUp() { this.screen('hud'); }

  // ---- results ---------------------------------------------------------------------------
  showResults(run, won) {
    const v = this.save, earned = Math.floor(run.bank);
    const newBest = run.time > v.best + 0.5;
    v.bank += earned;
    v.best = Math.max(v.best, run.time);
    v.bestKills = Math.max(v.bestKills, run.kills);
    if (won) v.wins++;
    Save.store(v);
    $('results-title').textContent = won ? 'ROOF HELD!' : 'KNOCKED OUT';
    $('results').classList.toggle('won', won);
    $('res-time').textContent = fmt(run.time);
    $('res-kills').textContent = run.kills;
    $('res-coins').textContent = `+${earned}`;
    $('res-level').textContent = run.juno.level;
    $('res-best').textContent = newBest ? 'New best time!' : `Best: ${fmt(v.best)}`;
    this.screen('results');
  }

  // ---- shop -----------------------------------------------------------------------------
  openShop() {
    this.backTo = $('results').hidden ? 'title' : 'results';
    this.renderShop();
    this.screen('shop');
  }

  closeShop() {
    if (this.backTo === 'results') this.screen('results'); else this.showTitle();
  }

  renderShop() {
    const v = this.save, list = $('shop-list');
    $('shop-bank').textContent = Math.floor(v.bank);
    list.innerHTML = '';
    for (const [key, item] of Object.entries(SHOP)) {
      const lvl = v.shop[key] || 0, max = item.costs.length, cost = item.costs[lvl];
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `<div class="what"><b>${item.name}</b><span>${lvl ? item.text(lvl) : item.text(1)}</span>
        <span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span></div>`;
      const b = document.createElement('button');
      b.id = `buy-${key}`;
      if (lvl >= max) { b.textContent = 'MAX'; b.disabled = true; }
      else { b.innerHTML = `<span class="coin"></span>${cost}`; b.disabled = v.bank < cost; }
      b.addEventListener('click', () => {
        if (v.bank < cost || lvl >= max) return;
        v.bank -= cost; v.shop[key] = lvl + 1; Save.store(v); this.renderShop();
      });
      row.appendChild(b);
      list.appendChild(row);
    }
  }
}
