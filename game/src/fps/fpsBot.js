// Shooter test bots, built on the brawler bots' report and safety checks.
//   good: aims at the nearest Crow (head for the rifle), shoots, backs off from anyone too close,
//         sidesteps thrown wrenches, and shops for the best gun between waves.
//   bad:  walks into walls and props while spinning and spraying.

import { CONFIG } from '../config.js';
import { Bot } from '../bot.js';
import { WEAPON_PADS } from '../game/level.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const wrap = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };

export class FpsBot extends Bot {
  constructor(mode, game, input, targetWaves) {
    super(mode, game, input, targetWaves);
    input.bot = { forward: 0, strafe: 0, yaw: Math.PI, pitch: 0, fire: false, buy: false };
    this.b = input.bot;
    Object.assign(this.r, { shots: 0, headshots: 0, throwsSeen: 0, throwHits: 0, gunsEmptied: 0 });
    game.on((ev) => {
      if (ev.type === 'reset') Object.assign(this.r, { shots: 0, headshots: 0, throwsSeen: 0, throwHits: 0, gunsEmptied: 0 });
      if (ev.type === 'shot') this.r.shots++;
      if (ev.type === 'hit' && ev.head) this.r.headshots++;
      if (ev.type === 'throw') this.r.throwsSeen++;
      if (ev.type === 'hit' && ev.attack === 'eliteThrow') this.r.throwHits++;
      if (ev.type === 'gunEmpty') this.r.gunsEmptied++;
    });
  }

  // world direction -> forward/strafe relative to where the bot is looking
  setMove(wx, wz) {
    const m = Math.hypot(wx, wz), y = this.b.yaw;
    if (m < 1e-6) { this.b.forward = this.b.strafe = 0; return; }
    wx /= m; wz /= m;
    this.b.forward = wx * Math.sin(y) + wz * Math.cos(y);
    this.b.strafe = wx * -Math.cos(y) + wz * Math.sin(y);
  }

  press(dt, every) { // only used for buying in the shooter
    this.pressTimer -= dt;
    if (this.pressTimer <= 0) { this.b.buy = true; this.pressTimer = every; }
  }

  aimAt(x, y, z, dt) {
    const e = this.game.eye();
    const yaw = Math.atan2(x - e.x, z - e.z), pitch = Math.atan2(y - e.y, Math.hypot(x - e.x, z - e.z));
    const k = 1 - Math.exp(-14 * dt); // turn quickly, but not instantly
    this.b.yaw += wrap(yaw - this.b.yaw) * k;
    this.b.pitch += (pitch - this.b.pitch) * k;
    return Math.abs(wrap(yaw - this.b.yaw)) + Math.abs(pitch - this.b.pitch);
  }

  // Between waves: pick up coins, then buy the best gun it can afford while holding the pistol.
  shop(dt) {
    const g = this.game, j = g.juno;
    if (g.coins.length) {
      let c = g.coins[0];
      for (const k of g.coins) if (dist(k, j) < dist(c, j)) c = k;
      this.setMove(c.x - j.x, c.z - j.z);
      return;
    }
    const want = g.gun.id === 'pistol' && [...WEAPON_PADS].sort((a, b) => CONFIG.weapons[b.weapon].cost - CONFIG.weapons[a.weapon].cost)
      .find((p) => g.unlocked(p.weapon) && j.coins >= CONFIG.weapons[p.weapon].cost);
    if (want) {
      if (dist(want, j) < CONFIG.weapons.padRadius * 0.6) { this.setMove(0, 0); this.press(dt, 0.3); }
      else this.setMove(want.x - j.x, want.z - j.z);
      return;
    }
    this.setMove(-j.x, -j.z);
    if (Math.hypot(j.x, j.z) < 0.5) this.setMove(0, 0);
  }

  thinkGood(dt) {
    const g = this.game, j = g.juno;
    this.b.fire = false;
    const live = g.liveEnemies();
    if (!live.length) { this.b.pitch *= 0.9; this.shop(dt); return; }
    let t = live[0];
    for (const e of live) if (dist(e, j) < dist(t, j)) t = e;
    const tall = t.state === 'knocked_down' ? 0.3 : CONFIG.enemies[t.kind].height;
    const aimY = g.gun.id === 'rifle' || g.gun.id === 'pistol' ? tall * 0.9 : tall * 0.6;
    const off = this.aimAt(t.x, aimY, t.z, dt);
    this.b.fire = off < 0.05;

    // movement: keep about 4 m away, sidestep incoming wrenches
    const d = dist(t, j);
    let mx = 0, mz = 0;
    if (d < 3.5) { mx = j.x - t.x; mz = j.z - t.z; }
    else if (d > 6) { mx = t.x - j.x; mz = t.z - j.z; }
    for (const p of g.projectiles) {
      const to = Math.hypot(p.x - j.x, p.z - j.z);
      if (to < 4) { mx += -p.vz; mz += p.vx; } // step across its path
    }
    // drift back toward the middle so it does not get cornered
    mx += -j.x * 0.15; mz += -j.z * 0.15;
    this.setMove(mx, mz);
  }

  thinkBad(dt) {
    const g = this.game;
    this.segTime += dt;
    const segs = 6;
    if (this.segTime > 4) { this.segTime = 0; this.seg++; }
    // spin slowly while walking into the walls in turn
    this.b.yaw = wrap(this.b.yaw + dt * 0.8);
    const dirs = [[0, -1], [-1, 0], [0, 1], [1, 0], [-1, -1], [1, -1]];
    const [dx, dz] = dirs[this.seg % segs];
    this.setMove(dx, dz);
    this.b.fire = Math.floor(g.time * 2) % 3 === 0;
    this.b.pitch = Math.sin(g.time) * 0.5;
  }
}
