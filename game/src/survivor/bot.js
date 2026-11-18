// Test bot for Roof Rumble: kites the swarm, grabs coins when it is safe, dodges boss smashes,
// and picks upgrades by a simple priority. Writes a report to window.__botReport.
import { S } from './config.js';

const PRIORITY = ['pipes', 'stomp', 'quick', 'haymaker', 'wrench', 'reach', 'ironskin', 'sneakers', 'magnet', 'secondwind', 'heal'];

export class SurvivorBot {
  constructor(run, input) {
    this.run = run; this.input = input;
    this.report = { done: false, result: null, time: 0, kills: 0, level: 1, picks: [], hurt: 0, damageTaken: 0, peakEnemies: 0, bosses: 0, bossesKilled: 0, coins: 0, maxPenetration: 0, stuckSeconds: 0 };
    this.lastPos = { x: 0, z: 0, t: 0 };
    run.on((ev, r) => {
      const R = this.report;
      if (ev.type === 'levelup') setTimeout(() => this.pick(), 0);
      if (ev.type === 'hurt') { R.hurt++; R.damageTaken += ev.amount; }
      if (ev.type === 'boss') R.bosses++;
      if (ev.type === 'kill' && ev.kind === 'boss') R.bossesKilled++;
      if (ev.type === 'coin') R.coins++;
      if (ev.type === 'dead' || ev.type === 'won') { R.result = ev.type; R.done = true; R.time = +r.time.toFixed(1); R.kills = r.kills; R.level = r.juno.level; }
    });
  }

  pick() {
    const r = this.run;
    if (r.phase !== 'levelup') return;
    const k = PRIORITY.find((p) => r.choices.includes(p)) || r.choices[0];
    this.report.picks.push(k);
    r.choose(k);
  }

  think(dt) {
    const r = this.run, j = r.juno, R = this.report;
    if (r.phase === 'levelup') { this.pick(); return; }
    R.time = +r.time.toFixed(1); R.kills = r.kills; R.level = j.level;
    const live = r.enemies.filter((e) => !e.dead);
    R.peakEnemies = Math.max(R.peakEnemies, live.length);
    for (const e of [j, ...live]) R.maxPenetration = Math.max(R.maxPenetration, +r.penetration(e).toFixed(4));

    // Fight like a player: stay at punching distance from the nearest Crow and circle the crowd;
    // back off when crowded or when Grudge winds up; grab coins when it is calm.
    let fx = 0, fz = 0, near = null, nd = Infinity, crowd = 0;
    for (const e of live) {
      const dx = j.x - e.x, dz = j.z - e.z, d = Math.hypot(dx, dz) || 0.01;
      if (d < nd) { nd = d; near = e; }
      if (d < 2.4) crowd += e.kind === 'brute' ? 2 : 1;
      const danger = e.kind === 'boss' ? (e.windup > 0 ? 8 : 2) : e.kind === 'brute' ? 1.5 : 1;
      if (d < 3) { fx += (dx / d) * danger / (d * d); fz += (dz / d) * danger / (d * d); }
    }
    if (near && crowd < 4 && !(near.kind === 'boss' && near.windup > 0)) {
      const dx = near.x - j.x, dz = near.z - j.z, d = nd;
      const want = r.reach * 0.75 + near.radius;
      const toward = d > want ? 1 : -0.6;
      fx = (dx / d) * toward + (-dz / d) * 0.8; // closing in while circling
      fz = (dz / d) * toward + (dx / d) * 0.8;
    }
    fx += -j.x * 0.01; fz += -j.z * 0.006;
    // keep off the walls: the closer, the harder it steers back toward the middle
    const A = S.arena, ex = A.width / 2 - Math.abs(j.x), ez = A.depth / 2 - Math.abs(j.z);
    if (ex < 2.5) fx += -Math.sign(j.x) * (2.5 - ex) * 0.8;
    if (ez < 2.5) fz += -Math.sign(j.z) * (2.5 - ez) * 0.8;
    if (crowd < 2 && r.coins.length) {
      let c = r.coins[0], cd = Infinity;
      for (const k of r.coins) { const d = Math.hypot(k.x - j.x, k.z - j.z) - (k.heal && j.hp < j.maxHp * 0.6 ? 3 : 0); if (d < cd) { cd = d; c = k; } }
      if (cd < 5) { fx += (c.x - j.x) / cd * 0.6; fz += (c.z - j.z) / cd * 0.6; }
    }
    const m = Math.hypot(fx, fz);
    this.input.mx = m > 0.02 ? fx / m : 0;
    this.input.mz = m > 0.02 ? fz / m : 0;
    // stuck check: wants to move but has not moved for a second
    if (r.time - this.lastPos.t > 1) {
      // stuck = wants to move, has open space (no Crow within 1.5 m), yet did not move: a collision bug
      const open = !live.some((e) => Math.hypot(e.x - j.x, e.z - j.z) < 1.5 + e.radius);
      if (m > 0.05 && open && Math.hypot(j.x - this.lastPos.x, j.z - this.lastPos.z) < 0.2) R.stuckSeconds++;
      this.lastPos = { x: j.x, z: j.z, t: r.time };
    }
  }
}
