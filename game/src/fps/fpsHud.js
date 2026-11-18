// Shooter HUD on top of the shared one: crosshair with hit marker, ammo, damage flash, buy button.

import { CONFIG } from '../config.js';
import { Hud } from '../ui/hud.js';

const NAMES = { pistol: 'PISTOL', smg: 'SMG', shotgun: 'SHOTGUN', rifle: 'RIFLE', launcher: 'SPLAT LAUNCHER', minigun: 'MINIGUN' };

export class FpsHud extends Hud {
  constructor(game, onRestart, view, input) {
    super(game, onRestart, view);
    this.input = input;
    const $ = (id) => document.getElementById(id);
    this.cross = $('crosshair'); this.ammoName = $('ammo-name'); this.ammoCount = $('ammo-count');
    this.reloadBar = $('reload-fill'); this.vignette = $('vignette'); this.buyBtn = $('buy-btn');
    this.aimHint = $('aim-hint'); this.reloadBtn = $('reload-btn');
    this.markTimer = 0;
    game.on((ev) => {
      if (ev.type === 'hit' && ev.targetTeam === 'enemy') {
        this.markTimer = 0.12;
        this.cross.classList.toggle('head', !!ev.head);
        if (ev.head) this.popAt(ev.x, ev.y + 0.4, ev.z, 'HEADSHOT!', 'bad', -6);
        if (ev.defeated) this.popAt(ev.x, ev.y + 0.2, ev.z, ['POW!', 'BLAM!', 'KA-POW!', 'BONK!'][Math.floor(Math.random() * 4)], '', 6);
      }
      if (ev.type === 'hit' && ev.targetTeam === 'player') {
        this.vignette.classList.remove('show'); void this.vignette.offsetWidth; this.vignette.classList.add('show');
      }
      if (ev.type === 'combo') this.popAt(ev.x, 2.4, ev.z, `${ev.streak} IN A ROW!`, 'coin', 4);
      if (ev.type === 'gunEmpty') this.show(`${NAMES[ev.gun]} is empty`);
      if (ev.type === 'unlock') setTimeout(() => this.show(`New gun: ${NAMES[ev.weapon]}!`), 1700);
    });
  }

  update(dt) {
    super.update(dt);
    const g = this.game, gun = g.gun, def = CONFIG.guns[gun.id];
    this.ammoName.textContent = NAMES[gun.id];
    this.ammoCount.textContent = gun.reserve === Infinity ? `${gun.mag} / ∞` : `${gun.mag} / ${gun.reserve}`;
    this.ammoCount.classList.toggle('low', gun.mag <= Math.ceil(def.mag * 0.25));
    this.reloadBar.style.width = gun.reloading > 0 ? `${(1 - gun.reloading / def.reload) * 100}%` : '0%';
    this.markTimer -= dt;
    this.cross.classList.toggle('hit', this.markTimer > 0);

    // the buy prompt speaks shooter: E or BUY, and gun names
    const pad = g.phase === 'playing' ? g.padUnder(g.juno) : null;
    const touch = document.body.classList.contains('touch');
    if (pad) {
      const w = CONFIG.weapons[pad.weapon], name = NAMES[pad.weapon];
      if (!g.unlocked(pad.weapon)) this.padPrompt.textContent = `${name} unlocks at wave ${w.unlockWave}`;
      else if (g.juno.coins >= w.cost) this.padPrompt.textContent = `${touch ? 'BUY' : 'E'} to buy ${name} · ${w.cost} coins`;
      else this.padPrompt.textContent = `${name} costs ${w.cost} coins`;
    }
    this.buyBtn.classList.toggle('show', !!pad && touch);
    this.reloadBtn.classList.toggle('show', touch && gun.mag < def.mag && gun.reserve > 0 && !(gun.reloading > 0));
    this.aimHint.classList.toggle('show', !touch && !this.input.locked && !this.input.bot);
  }
}
