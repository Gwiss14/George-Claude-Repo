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
    this.modChip = this.el('mod-chip');
    this.shownMod = undefined;
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
      if (ev.type === 'wave') this.show(`${ev.boss ? `Wave ${ev.wave}: Grudge!` : `Wave ${ev.wave}`}${ev.label ? `
${ev.label.toUpperCase()}` : ''}`);
      if (ev.type === 'waveClear') this.show(`Wave ${ev.wave} cleared  +${CONFIG.waves.healOnClear}`);
      if (ev.type === 'unlock') setTimeout(() => this.show(`New weapon: ${ev.weapon.toUpperCase()}!`), 1700);
      if (ev.type === 'reset') { this.end.classList.remove('show'); this.endTimer = 0; }
      if (ev.type === 'comboHit') this.popAt(ev.x, 2.0, ev.z, (ev.weapon ? SWING_WORDS : HIT_WORDS)[Math.min(2, ev.n - 1)], ev.n >= 3 ? '' : '', (ev.n - 2) * 7);
      if (ev.type === 'combo') this.popAt(ev.x, 2.6, ev.z, `COMBO! +${CONFIG.coins.comboBonus}`, 'big', -8);
      if (ev.type === 'coin') { const j = this.game.juno; this.popAt(j.x, 1.9, j.z, '+1', 'coin', 0); }
      if (ev.type === 'buy') this.show(`Got the ${ev.weapon}!`);
      if (ev.type === 'buyFail') { const j = this.game.juno; this.popAt(j.x, 2.0, j.z, ev.fists ? 'Fists only!' : ev.locked ? `Wave ${ev.locked}` : `Need ${ev.need} more`, 'bad', 0); }
      if (ev.type === 'dodged') this.popAt(ev.x, 1.9, ev.z, 'DODGE!', 'dodge', -6);
      if (ev.type === 'weaponBack') { const j = this.game.juno; this.popAt(j.x, 2.1, j.z, `${ev.weapon} back!`, 'coin', 4); }
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
    this.wave.textContent = g.waveIndex < 0 ? 'Get ready' : `Wave ${g.waveIndex + 1}${g.best > 1 ? ` · best ${g.best}` : ''}`;
    const mod = g.mod?.label ?? null;
    if (mod !== this.shownMod) {
      this.shownMod = mod;
      this.modChip.textContent = mod ?? '';
      this.modChip.classList.toggle('show', !!mod);
    }
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
      const rich = j.coins >= w.cost && g.unlocked(pad.weapon);
      this.padPrompt.textContent = g.modVal('fistsOnly', 0) ? 'Rack closed: fists only this wave' : !g.unlocked(pad.weapon) ? `${pad.weapon.toUpperCase()} unlocks at wave ${w.unlockWave}` : rich ? `${touch ? 'HIT' : 'J'} to buy ${pad.weapon.toUpperCase()} · ${w.cost} coins` : `${pad.weapon.toUpperCase()} costs ${w.cost} coins`;
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
        this.endSub.textContent = `You reached wave ${g.waveIndex + 1}. Best: wave ${g.best}.`;
        this.end.classList.toggle('won', won);
        this.end.classList.add('show');
      }
    }
  }
}
