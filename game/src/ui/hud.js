// Health bars, wave label, banners and the end-of-round screen.

import { CONFIG } from '../config.js';

const HIT_WORDS = ['BAP!', 'WHAM!', 'KA-POW!'];
const SWING_WORDS = ['CLANG!', 'KLONK!', 'KRASH!'];

export class Hud {
  constructor(game, onRestart, view) {
    this.game = game;
    this.view = view;
    this.coinCount = document.getElementById('coin-count');
    this.weaponChip = document.getElementById('weapon-chip');
    this.weaponName = document.getElementById('weapon-name');
    this.weaponPips = document.getElementById('weapon-pips');
    this.padPrompt = document.getElementById('pad-prompt');
    this.pops = document.getElementById('pops');
    this.shownWeapon = undefined; this.shownDur = -1;
    this.el = (id) => document.getElementById(id);
    this.hpFill = this.el('hp-fill');
    this.hpText = this.el('hp-text');
    this.wave = this.el('wave');
    this.boss = this.el('boss');
    this.bossFill = this.el('boss-fill');
    this.banner = this.el('banner');
    this.end = this.el('end');
    this.endTitle = this.el('end-title');
    this.endSub = this.el('end-sub');
    this.bannerTimer = 0;
    this.endTimer = 0;
    for (const id of ['restart-btn', 'end-restart']) {
      this.el(id).addEventListener('click', (e) => { e.stopPropagation(); onRestart(); });
    }
    game.on((ev) => {
      if (ev.type === 'wave') this.show(ev.wave === ev.total ? 'Final wave: Grudge!' : `Wave ${ev.wave}`);
      if (ev.type === 'waveClear') this.show('Wave cleared  +25');
      if (ev.type === 'reset') { this.end.classList.remove('show'); this.endTimer = 0; }
      if (ev.type === 'comboHit') this.popAt(ev.x, 2.0, ev.z, (ev.weapon ? SWING_WORDS : HIT_WORDS)[Math.min(2, ev.n - 1)], ev.n >= 3 ? '' : '', (ev.n - 2) * 7);
      if (ev.type === 'combo') this.popAt(ev.x, 2.6, ev.z, `COMBO! +${CONFIG.coins.comboBonus}`, 'big', -8);
      if (ev.type === 'coin') { const j = this.game.juno; this.popAt(j.x, 1.9, j.z, '+1', 'coin', 0); }
      if (ev.type === 'buy') this.show(`Got the ${ev.weapon}!`);
      if (ev.type === 'buyFail') { const j = this.game.juno; this.popAt(j.x, 2.0, j.z, `Need ${ev.need} more`, 'bad', 0); }
      if (ev.type === 'weaponBreak') { const j = this.game.juno; this.popAt(j.x, 2.1, j.z, `${ev.weapon} broke!`, 'bad', 5); }
    });
  }

  // Comic word that pops up over a point in the world and floats away.
  popAt(x, y, z, text, cls, tilt) {
    if (!this.view) return;
    const p = this.view.project(x, y, z);
    if (p.behind) return;
    const el = document.createElement('div');
    el.className = `pop ${cls || ''}`;
    el.textContent = text;
    el.style.left = `${p.x}px`; el.style.top = `${p.y}px`;
    el.style.setProperty('--tilt', `${tilt}deg`);
    this.pops.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  show(text) {
    this.banner.textContent = text;
    this.banner.classList.add('show');
    this.bannerTimer = 1.6;
  }

  update(dt) {
    const g = this.game, j = g.juno;
    this.hpFill.style.width = `${(j.hp / j.maxHp) * 100}%`;
    this.hpText.textContent = `${Math.ceil(j.hp)}`;
    const total = 3;
    this.wave.textContent = g.waveIndex < 0 ? 'Get ready' : `Wave ${g.waveIndex + 1} / ${total}`;
    const boss = g.fighters.find((f) => f.kind === 'grudge');
    this.boss.style.display = boss ? 'block' : 'none';
    if (boss) this.bossFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;

    this.coinCount.textContent = j.coins;
    if (this.shownWeapon !== j.weapon || this.shownDur !== j.durability) {
      this.shownWeapon = j.weapon; this.shownDur = j.durability;
      this.weaponChip.classList.toggle('show', !!j.weapon);
      if (j.weapon) {
        const max = CONFIG.weapons[j.weapon].durability;
        this.weaponName.textContent = j.weapon.toUpperCase();
        this.weaponPips.innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i < j.durability ? '' : 'used'}"></i>`).join('');
      }
    }
    const pad = g.phase === 'playing' ? g.padUnder(j) : null;
    if (pad) {
      const w = CONFIG.weapons[pad.weapon], touch = document.body.classList.contains('touch');
      const rich = j.coins >= w.cost;
      this.padPrompt.textContent = rich ? `${touch ? 'HIT' : 'J'} to buy ${pad.weapon.toUpperCase()} · ${w.cost} coins` : `${pad.weapon.toUpperCase()} costs ${w.cost} coins`;
      this.padPrompt.classList.toggle('poor', !rich);
    }
    this.padPrompt.classList.toggle('show', !!pad);

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner.classList.remove('show');
    }
    if (g.phase !== 'playing') {
      this.endTimer += dt;
      if (this.endTimer > 1.2 && !this.end.classList.contains('show')) {
        const won = g.phase === 'won';
        this.endTitle.textContent = won ? 'Roof cleared!' : 'Knocked out';
        this.endSub.textContent = won ? 'The Tin Crows fly home.' : `You reached wave ${g.waveIndex + 1}.`;
        this.end.classList.toggle('won', won);
        this.end.classList.add('show');
      }
    }
  }
}
