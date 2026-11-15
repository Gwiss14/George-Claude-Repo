// Test bots. Open the game with ?bot=good or ?bot=bad (add &speed=4 to run faster).
// They press the same virtual buttons a player does, and write a report to window.__botReport.
//   good: walks to the nearest enemy, chains attacks, rolls away from Grudge's smash.
//   bad:  holds directions into walls and obstacles, mashes attack and roll now and then.
// Both also check that nobody ends up inside a wall or prop, and that nothing gets stuck.

import { CONFIG } from './config.js';
import { WEAPON_PADS } from './game/level.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class Bot {
  constructor(mode, game, input, targetWaves = 6) {
    this.mode = mode; this.game = game; this.input = input;
    this.targetWaves = targetWaves; // waves are endless: the good bot stops after clearing this many
    input.bot = { mx: 0, my: 0, attack: false, dodge: false };
    this.rollTimer = 0;
    this.pressTimer = 0;
    this.seg = 0; this.segTime = 0; this.segStart = null; this.escapeCheck = null;
    this.enemyTrack = new Map();
    this.lastHit = new Map();
    this.lastEnemyAttack = -Infinity;
    this.r = this.blankReport();
    window.__botReport = this.r;
    game.on((ev, g) => this.onEvent(ev, g));
  }

  blankReport() {
    return {
      mode: this.mode, done: false, result: null, simTime: 0, wavesCleared: 0,
      hitsLanded: 0, damageDealt: 0, knockdownsDealt: 0, enemiesDefeated: 0, hitsByAttack: {},
      hitsTaken: 0, damageTaken: 0, timesKnockedDown: 0,
      enemyAttacks: 0, maxEnemiesAttackingAtOnce: 0, minGapBetweenEnemyAttacks: null,
      doubleHits: 0, maxWallPenetration: 0, maxFighterOverlap: 0,
      escapeChecks: 0, escapeFailures: 0, enemyStuck: 0, enemyTurnsGivenUp: 0, lowestHp: 100,
      coinsCollected: 0, combos: 0, weaponsBought: [], weaponHits: 0, weaponBreaks: 0, buyFails: 0,
      weaponsUnlocked: [], bossWavesCleared: 0, biggestWave: 0,
      rolls: 0, dodges: 0, modifiers: [], weaponsPutAway: 0,
    };
  }

  onEvent(ev, g) {
    const r = this.r;
    if (ev.type === 'reset') { Object.assign(r, this.blankReport()); this.lastEnemyAttack = -Infinity; return; }
    if (ev.type === 'hit') {
      const last = this.lastHit.get(ev.target);
      if (last !== undefined && ev.time - last < CONFIG.combat.invuln - 1e-6) r.doubleHits++;
      this.lastHit.set(ev.target, ev.time);
      if (ev.targetTeam === 'enemy') {
        r.hitsLanded++; r.damageDealt += ev.damage;
        r.hitsByAttack[ev.attack] = (r.hitsByAttack[ev.attack] || 0) + 1;
        if (ev.state === 'knocked_down') r.knockdownsDealt++;
        if (ev.defeated) r.enemiesDefeated++;
      } else {
        r.hitsTaken++; r.damageTaken += ev.damage;
        if (ev.state === 'knocked_down') r.timesKnockedDown++;
      }
    }
    if (ev.type === 'attackStart' && ev.team === 'enemy') {
      r.enemyAttacks++;
      const gap = ev.time - this.lastEnemyAttack;
      if (Number.isFinite(gap)) r.minGapBetweenEnemyAttacks = Math.min(r.minGapBetweenEnemyAttacks ?? Infinity, +gap.toFixed(3));
      this.lastEnemyAttack = ev.time;
    }
    if (ev.type === 'waveClear') { r.wavesCleared = ev.wave; if (ev.boss) r.bossWavesCleared++; }
    if (ev.type === 'unlock') r.weaponsUnlocked.push(ev.weapon);
    if (ev.type === 'wave') r.biggestWave = Math.max(r.biggestWave, ev.size);
    if (ev.type === 'coin') r.coinsCollected++;
    if (ev.type === 'combo') r.combos++;
    if (ev.type === 'buy') r.weaponsBought.push(ev.weapon);
    if (ev.type === 'buyFail') r.buyFails++;
    if (ev.type === 'weaponBreak') r.weaponBreaks++;
    if (ev.type === 'hit' && ev.weapon && ev.targetTeam === 'enemy') r.weaponHits++;
    if (ev.type === 'lost') r.result = 'lost';
    if (ev.type === 'roll') r.rolls++;
    if (ev.type === 'dodged') r.dodges++;
    if (ev.type === 'wave' && ev.modifier) r.modifiers.push(`${ev.wave}:${ev.modifier}`);
    if (ev.type === 'weaponBack') r.weaponsPutAway++;
  }

  setMove(wx, wz) { // world direction -> stick (y is up the screen = -Z)
    const m = Math.hypot(wx, wz);
    this.input.bot.mx = m > 0 ? wx / m : 0;
    this.input.bot.my = m > 0 ? -wz / m : 0;
  }

  press(dt, every) {
    this.pressTimer -= dt;
    if (this.pressTimer <= 0) { this.input.bot.attack = true; this.pressTimer = every; }
  }

  think(dt) {
    const g = this.game, r = this.r;
    r.simTime = +g.time.toFixed(2);
    r.lowestHp = Math.min(r.lowestHp, g.juno.hp);
    this.check(dt);
    if (g.phase !== 'playing') {
      this.setMove(0, 0);
      this.endTime = (this.endTime ?? g.time);
      if (g.time - this.endTime > 1) r.done = true;
      return;
    }
    if (this.mode === 'good' && g.wavesCleared >= this.targetWaves) { r.result = `cleared ${g.wavesCleared} waves`; r.done = true; return; }
    if (g.time > 600) { r.result = r.result ?? 'timeout'; r.done = true; return; }
    if (this.mode === 'bad') this.thinkBad(dt); else this.thinkGood(dt);
  }

  thinkGood(dt) {
    const g = this.game, j = g.juno;
    const live = g.liveEnemies();
    if (!live.length) { this.shop(dt); return; }

    // roll away from a smash that is winding up nearby (and keep backing off after)
    for (const e of live) {
      if (e.state !== 'attack' || e.attack !== 'grudgeSmash') continue;
      const a = CONFIG.attacks.grudgeSmash;
      if (e.stateTime / a.length < a.ends && dist(e, j) < a.reach + j.radius + 0.9) {
        this.setMove(j.x - e.x, j.z - e.z);
        if (j.state === 'idle' || j.state === 'run' || j.state === 'attack') this.input.bot.dodge = true;
        return;
      }
    }
    const hittable = live.filter((e) => e.state !== 'knocked_down');
    const pool = hittable.length ? hittable : live;
    let t = pool[0];
    for (const e of pool) if (dist(e, j) < dist(t, j)) t = e;
    const d = dist(t, j);
    if (d > 1.1 + t.radius) { this.setMove(t.x - j.x, t.z - j.z); return; }
    this.setMove(0, 0);
    if (t.state !== 'knocked_down') this.press(dt, 0.12);
  }

  // Between waves: pick up coins, then buy the best weapon it can afford if empty-handed.
  shop(dt) {
    const g = this.game, j = g.juno;
    if (g.coins.length) {
      let c = g.coins[0];
      for (const k of g.coins) if (dist(k, j) < dist(c, j)) c = k;
      this.setMove(c.x - j.x, c.z - j.z);
      return;
    }
    const want = !j.weapon && [...WEAPON_PADS].sort((a, b) => CONFIG.weapons[b.weapon].cost - CONFIG.weapons[a.weapon].cost)
      .find((p) => g.unlocked(p.weapon) && j.coins >= CONFIG.weapons[p.weapon].cost);
    if (want) {
      if (dist(want, j) < CONFIG.weapons.padRadius * 0.6) { this.setMove(0, 0); this.press(dt, 0.3); }
      else this.setMove(want.x - j.x, want.z - j.z);
      return;
    }
    this.setMove(-j.x, -j.z);
    if (Math.hypot(j.x, j.z) < 0.5) this.setMove(0, 0);
  }

  thinkBad(dt) {
    const g = this.game, j = g.juno;
    const tank = g.solids.find((s) => s.id === 'water_tank');
    const lamp = g.solids.find((s) => s.id === 'lamp_post');
    const crate = g.solids.find((s) => s.id === 'crate');
    const segs = [
      [0, -1, 5], [-1, 0, 4], [tank.x - j.x, tank.z - j.z, 4], [0, 1, 4],
      [1, 0, 4], [lamp.x - j.x, lamp.z - j.z, 4], [crate.x - j.x, crate.z - j.z, 4], [1, -1, 4],
    ];
    const s = segs[this.seg % segs.length];
    this.segTime += dt;
    const ec = this.escapeCheck;
    if (ec && !ec.done) {
      // escape phase: hold the opposite of the last push; Juno must get at least 0.4 m away
      this.setMove(ec.dx, ec.dz);
      if (j.state !== 'run' && j.state !== 'idle') ec.busy += dt; else ec.t += dt;
      if (Math.hypot(j.x - ec.x, j.z - ec.z) > 0.4) { ec.done = true; this.r.escapeChecks++; this.segTime = 0; }
      else if (ec.t > 1.0) { ec.done = true; this.r.escapeChecks++; this.r.escapeFailures++; this.segTime = 0; }
      return;
    }
    if (this.segTime > s[2]) {
      this.segTime = 0; this.seg++;
      this.escapeCheck = { x: j.x, z: j.z, dx: -s[0], dz: -s[1], t: 0, busy: 0, done: false };
      return;
    }
    this.setMove(s[0], s[1]);
    this.press(dt, 1.4);
    this.rollTimer -= dt;
    if (this.rollTimer <= 0) { this.input.bot.dodge = true; this.rollTimer = 2.1; } // rolls straight into walls too
  }

  // Safety checks that run for both bots, every step.
  check(dt) {
    const g = this.game, r = this.r, A = CONFIG.arena;
    for (const f of g.fighters) {
      let pen = 0;
      const hw = A.width / 2 - A.wallThickness, hd = A.depth / 2 - A.wallThickness;
      pen = Math.max(pen, Math.abs(f.x) + f.radius - hw, Math.abs(f.z) + f.radius - hd);
      for (const s of g.solids) {
        if (s.type === 'circle') pen = Math.max(pen, s.r + f.radius - Math.hypot(f.x - s.x, f.z - s.z));
        else {
          const cx = Math.max(s.x - s.hx, Math.min(f.x, s.x + s.hx)), cz = Math.max(s.z - s.hz, Math.min(f.z, s.z + s.hz));
          pen = Math.max(pen, f.radius - Math.hypot(f.x - cx, f.z - cz));
        }
      }
      r.maxWallPenetration = Math.max(r.maxWallPenetration, +pen.toFixed(4));
    }
    const live = g.fighters.filter((f) => f.state !== 'defeated');
    for (let i = 0; i < live.length; i++) for (let k = i + 1; k < live.length; k++) {
      const o = live[i].radius + live[k].radius - dist(live[i], live[k]);
      if (o > r.maxFighterOverlap) {
        r.maxFighterOverlap = +o.toFixed(4);
        const who = (f) => `${f.kind}:${f.state}@${f.x.toFixed(2)},${f.z.toFixed(2)}`;
        r.worstOverlap = `${who(live[i])} vs ${who(live[k])} wave ${g.waveIndex + 1} ${g.modKey ?? 'plain'}`;
      }
    }
    r.maxEnemiesAttackingAtOnce = Math.max(r.maxEnemiesAttackingAtOnce, g.fighters.filter((f) => f.team === 'enemy' && f.state === 'attack').length);

    // an enemy that wants to move but has not moved for 3 s is stuck
    for (const e of g.fighters) {
      if (e.team !== 'enemy') continue;
      let t = this.enemyTrack.get(e.uid);
      if (!t) { t = { x: e.x, z: e.z, time: 0, approachSeen: 0 }; this.enemyTrack.set(e.uid, t); }
      const wants = ['enter', 'circle', 'approach'].includes(e.state) && Math.hypot(e.vx, e.vz) > 0.2;
      if (e.state === 'approach') t.approachSeen += dt; else if (t.approachSeen > 0) {
        if (t.approachSeen > CONFIG.ai.approachTimeout - 0.01) r.enemyTurnsGivenUp++;
        t.approachSeen = 0;
      }
      if (!wants || Math.hypot(e.x - t.x, e.z - t.z) > 0.1) { t.x = e.x; t.z = e.z; t.time = 0; continue; }
      t.time += dt;
      if (t.time > 3) { r.enemyStuck++; t.time = 0; }
    }
  }
}
