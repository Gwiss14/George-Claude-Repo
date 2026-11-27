// Shooter HUD on top of the shared one: crosshair with hit marker, ammo, damage flash, buy button.

import { CONFIG } from '../config.js';
import { Hud } from '../ui/hud.js';

const NAMES = { pistol: 'PISTOL', smg: 'SMG', shotgun: 'SHOTGUN', rifle: 'RIFLE', launcher: 'SPLAT LAUNCHER', minigun: 'MINIGUN' };

export class FpsHud extends Hud {
  constructor(game, onRestart, view, input) {
    super(game, onRestart, view);
    this.input = input;
    document.getElementById('offer-go').addEventListener('click', () => game.closeOffer());
    window.addEventListener('keydown', (e) => { // 1 / 2 / 3 buy a deal, Enter starts the next wave
      if (!game.offer) return;
      if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') { if (game.buyOffer(Number(e.code.slice(-1)) - 1)) this.refreshOffer(); }
      if (e.code === 'Enter') game.closeOffer();
    });
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
      if (ev.type === 'powerBuy') this.show(ev.power === 'ammo' ? 'AMMO REFILLED!' : `${CONFIG.powerups[ev.power].name}!`);
      if (ev.type === 'powerFail' && ev.full) this.show('Health is already full');
      if (ev.type === 'powerFail' && ev.maxed) this.show('This gun is fully upgraded');
      if (ev.type === 'upgrade') this.show(`${NAMES[ev.gun]}: ${ev.name}!`);
      if (ev.type === 'pickup') this.popAt(ev.x, 1.6, ev.z, `${CONFIG.powerups[ev.power].name}!`, 'coin', 0);
      if (ev.type === 'offer') this.openOffer();
      if (ev.type === 'offerClosed') this.closeOfferPanel();
      if (ev.type === 'gunEmpty') this.show(`${NAMES[ev.gun]} is empty`);
      if (ev.type === 'unlock') setTimeout(() => this.show(`New gun: ${NAMES[ev.weapon]}!`), 1700);
    });
  }

  // ---- deals between waves ------------------------------------------------------------
  openOffer() {
    const g = this.game, box = document.getElementById('offer-items');
    document.getElementById('offer-title').textContent = `WAVE ${g.offer.wave} CLEARED: DEALS`;
    box.innerHTML = '';
    g.offer.items.forEach((it, i) => {
      const b = document.createElement('button');
      const P = it.kind === 'power' ? CONFIG.powerups[it.key] : null, U = it.kind === 'upgrade' ? g.nextUpgrade() : null;
      const name = P ? P.name : U ? `${NAMES[g.gun.id]}: ${U.name}` : `${NAMES[g.gun.id]} AMMO`;
      const text = P ? P.text : U ? U.text : 'a full refill of spare rounds';
      if (P) b.style.setProperty('--c', `#${P.color.toString(16).padStart(6, '0')}`); else if (U) b.style.setProperty('--c', '#c79bff');
      b.innerHTML = `<b>${i + 1}. ${name}</b><span>${text}</span><b><s>${it.full}</s> ${it.cost} coins</b>`;
      b.addEventListener('click', () => { if (g.buyOffer(i)) this.refreshOffer(); });
      box.appendChild(b);
    });
    document.getElementById('offer').hidden = false;
    try { document.exitPointerLock?.(); } catch { /* fine */ } // free the mouse so the deals can be clicked
    this.refreshOffer();
  }

  refreshOffer() {
    const g = this.game;
    if (!g.offer) return;
    [...document.getElementById('offer-items').children].forEach((b, i) => {
      const it = g.offer.items[i];
      b.classList.toggle('sold', it.sold);
      b.disabled = it.sold || g.juno.coins < it.cost;
      if (it.sold) b.lastElementChild.textContent = 'BOUGHT';
    });
  }

  closeOfferPanel() { document.getElementById('offer').hidden = true; }

  update(dt) {
    super.update(dt);
    const g = this.game, gun = g.gun, def = g.gunDef;
    if (g.offer) { document.getElementById('offer-time').textContent = `next wave in ${Math.ceil(g.offer.t)} s`; this.refreshOffer(); }
    document.body.classList.toggle('scoped', !!g.juno.aiming);
    document.getElementById('scope-btn').classList.toggle('show', !!def.scope && document.body.classList.contains('touch'));
    const lv = g.gunUps[gun.id] || 0;
    this.ammoName.textContent = NAMES[gun.id] + (lv ? ' ' + '+'.repeat(lv) : '') + (def.scope ? ' · SCOPE' : '');
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
    // power-up station pads
    const pow = g.phase === 'playing' && !pad ? g.powerPadUnder(g.juno) : null;
    if (pow) {
      const P = CONFIG.powerups[pow.power], rich = g.juno.coins >= P.cost;
      this.padPrompt.textContent = rich ? `${touch ? 'BUY' : 'E'} for ${P.name} · ${P.cost} coins (${P.text})` : `${P.name} costs ${P.cost} coins`;
      this.padPrompt.classList.toggle('poor', !rich);
      this.padPrompt.classList.add('show');
    }
    // the upgrade bench
    const bench = g.phase === 'playing' && !pad && !pow && g.onUpgradePad(g.juno);
    if (bench) {
      const u = g.nextUpgrade(), rich = u && g.juno.coins >= u.cost;
      this.padPrompt.textContent = !u ? `${NAMES[gun.id]} is fully upgraded` : rich ? `${touch ? 'BUY' : 'E'} to upgrade ${NAMES[gun.id]}: ${u.name} · ${u.cost} coins (${u.text})` : `${NAMES[gun.id]} ${u.name} costs ${u.cost} coins`;
      this.padPrompt.classList.toggle('poor', !rich);
      this.padPrompt.classList.add('show');
    }
    this.buyBtn.classList.toggle('show', (!!pad || !!pow || bench) && touch);
    // active power-ups and the seconds left
    if (!this.powersEl) { this.powersEl = document.createElement('div'); this.powersEl.id = 'powers'; document.getElementById('hud').appendChild(this.powersEl); }
    const live = Object.entries(g.powers).filter(([, t]) => t > 0);
    const html = live.map(([k, t]) => `<span style="--c:#${CONFIG.powerups[k].color.toString(16).padStart(6, '0')}">${CONFIG.powerups[k].name} ${Math.ceil(t)}</span>`).join('');
    if (html !== this.powersHtml) { this.powersEl.innerHTML = html; this.powersHtml = html; }
    this.reloadBtn.classList.toggle('show', touch && gun.mag < def.mag && gun.reserve > 0 && !(gun.reloading > 0));
    this.aimHint.classList.toggle('show', !touch && !this.input.locked && !this.input.bot);
  }
}
