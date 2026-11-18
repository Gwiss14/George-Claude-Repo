// The shooter: same roof, waves, enemies, coins and rack as the brawler (it extends Game),
// but Juno is the camera. She looks with the mouse or a finger, moves relative to where she
// looks, and shoots. Nothing here knows how anything looks.

import { CONFIG } from '../config.js';
import { Game } from '../game/game.js';

const TAU = Math.PI * 2;
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const SOLID_HEIGHT = { water_tank: 2.5, lamp_post: 3.5, crate: 1.0, weapon_rack: 2.0 };

export class FpsGame extends Game {
  static bestKey = 'trs-best-wave-fps';

  reset() {
    super.reset();
    this.juno.pitch = 0;
    this.projectiles = [];
    this.projUid = 1;
    this.streak = 0;
    this.gun = this.makeGun('pistol');
  }

  makeGun(id) {
    const g = CONFIG.guns[id];
    return { id, mag: g.mag, reserve: id === 'pistol' ? Infinity : g.ammo, cooldown: 0, reloading: 0 };
  }

  get gunDef() { return CONFIG.guns[this.gun.id]; }

  step(dt, input) {
    super.step(dt, input);
    for (const f of this.fighters) if (f.staggerCd > 0) f.staggerCd -= dt;
    this.updateProjectiles(dt);
  }

  // ---- Juno: look, move, shoot, reload, buy ----------------------------------------
  // input: { forward, strafe (-1..1), yaw, pitch, fireHeld, firePresses, buyPresses, reloadPresses }
  updateJuno(dt, input) {
    const j = this.juno, F = CONFIG.fps;
    j.vx = j.vz = 0;
    if (j.state !== 'defeated') {
      j.yaw = wrap(input.yaw);
      j.pitch = Math.max(-1.3, Math.min(1.3, input.pitch));
    }
    const buy = input.buyPresses, reload = input.reloadPresses, fire = input.fireHeld || input.firePresses > 0;
    input.buyPresses = input.reloadPresses = input.firePresses = 0;
    this.tickGun(dt);
    if (j.frozen || this.phase !== 'playing') return;
    if (!['idle', 'run', 'win'].includes(j.state)) return; // hurt or knocked down: no control

    if (buy > 0) { const pad = this.padUnder(j); if (pad) this.tryBuy(pad); }
    if (reload > 0) this.startReload();
    if (fire) this.tryFire();

    const m = Math.hypot(input.forward, input.strafe);
    if (m > 0.08) {
      const fx = Math.sin(j.yaw), fz = Math.cos(j.yaw), rx = -Math.cos(j.yaw), rz = Math.sin(j.yaw);
      const s = (CONFIG.juno.speed * F.moveMul * this.gunDef.moveMul) / Math.max(1, m);
      j.vx = (fx * input.forward + rx * input.strafe) * s;
      j.vz = (fz * input.forward + rz * input.strafe) * s;
      if (j.state === 'idle') this.setState(j, 'run');
    } else if (j.state === 'run') {
      this.setState(j, 'idle');
    }
  }

  tickGun(dt) {
    const gun = this.gun, def = this.gunDef;
    gun.cooldown -= dt;
    if (gun.reloading > 0) {
      gun.reloading -= dt;
      if (gun.reloading <= 0) {
        const take = Math.min(def.mag - gun.mag, gun.reserve);
        gun.mag += take; gun.reserve -= take;
        this.emit({ type: 'reloaded', gun: gun.id });
      }
      return;
    }
    if (gun.mag === 0) {
      if (gun.reserve > 0) this.startReload();
      else if (gun.id !== 'pistol') { this.emit({ type: 'gunEmpty', gun: gun.id }); this.gun = this.makeGun('pistol'); }
    }
  }

  startReload() {
    const gun = this.gun, def = this.gunDef;
    if (gun.reloading > 0 || gun.mag >= def.mag || gun.reserve <= 0) return;
    gun.reloading = def.reload;
    this.emit({ type: 'reload', gun: gun.id, time: def.reload });
  }

  tryBuy(pad) {
    const j = this.juno, w = CONFIG.weapons[pad.weapon];
    if (!this.unlocked(pad.weapon)) { this.emit({ type: 'buyFail', weapon: pad.weapon, locked: w.unlockWave }); return; }
    if (j.coins < w.cost) { this.emit({ type: 'buyFail', weapon: pad.weapon, need: w.cost - j.coins }); return; }
    j.coins -= w.cost;
    this.gun = this.makeGun(pad.weapon);
    this.emit({ type: 'buy', weapon: pad.weapon });
  }

  eye() {
    const j = this.juno;
    return { x: j.x, y: CONFIG.fps.eyeHeight, z: j.z };
  }

  tryFire() {
    const gun = this.gun, def = this.gunDef, j = this.juno;
    if (gun.cooldown > 0 || gun.reloading > 0 || gun.mag <= 0) return;
    gun.mag--;
    gun.cooldown = 1 / def.rate;
    const o = this.eye();
    const perTarget = new Map(); // target -> { damage, pellets, head, point }
    const ends = [];
    let blastAt = null;
    for (let p = 0; p < def.pellets; p++) {
      const yaw = j.yaw + rand(-1, 1) * def.spread, pitch = j.pitch + rand(-1, 1) * def.spread;
      const d = { x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
      const hits = this.raycast(o, d, def.range, def.pierce || 1);
      const last = hits.length ? hits[hits.length - 1] : null;
      const endT = last ? last.t : def.range;
      ends.push({ x: o.x + d.x * endT, y: o.y + d.y * endT, z: o.z + d.z * endT });
      if (def.blast) { blastAt = ends[0]; break; }
      for (const h of hits) {
        if (!h.target) continue;
        const rec = perTarget.get(h.target) || { damage: 0, pellets: 0, head: false, point: h.point };
        rec.damage += def.damage * (h.head ? def.headMul : 1);
        rec.pellets++;
        rec.head ||= h.head;
        perTarget.set(h.target, rec);
      }
    }
    this.emit({ type: 'shot', gun: gun.id, from: o, ends });
    if (blastAt) this.explode(blastAt, def);
    for (const [t, rec] of perTarget) {
      this.applyShot(t, rec.damage, rec.head, def, rec.pellets, rec.point);
    }
    const landed = blastAt ? this.lastBlastHits > 0 : perTarget.size > 0;
    if (landed) {
      this.streak++;
      if (this.streak % CONFIG.fps.comboEvery === 0) {
        const t = [...perTarget.keys()][0] || this.juno;
        this.slowmo = CONFIG.combo.slowmo;
        this.dropCoins(t.x, t.z, CONFIG.coins.comboBonus);
        this.emit({ type: 'combo', x: t.x, z: t.z, streak: this.streak });
      }
    } else {
      this.streak = 0;
    }
  }

  // Hits along a ray, nearest first. Stops at the floor, props, or after `pierce` fighters.
  raycast(o, d, range, pierce) {
    let wall = range;
    if (d.y < -1e-4) wall = Math.min(wall, -o.y / d.y);
    for (const s of this.solids) {
      const h = SOLID_HEIGHT[s.id] ?? 1;
      const t = s.type === 'circle' ? rayCylinder(o, d, s.x, s.z, s.r, h) : rayBox(o, d, s.x - s.hx, s.x + s.hx, 0, h, s.z - s.hz, s.z + s.hz);
      if (t !== null && t < wall) wall = t;
    }
    const F = CONFIG.fps, hits = [];
    for (const e of this.fighters) {
      if (e.team !== 'enemy' || e.state === 'defeated' || e.removed) continue;
      const tall = e.state === 'knocked_down' ? 0.45 : CONFIG.enemies[e.kind].height;
      const t = rayCylinder(o, d, e.x, e.z, e.radius + F.hitRadiusAdd, tall);
      if (t === null || t > wall) continue;
      const y = o.y + d.y * t;
      hits.push({ t, target: e, head: e.state !== 'knocked_down' && y >= tall * (1 - F.headshotTop), point: { x: o.x + d.x * t, y, z: o.z + d.z * t } });
    }
    hits.sort((a, b) => a.t - b.t);
    const out = hits.slice(0, pierce);
    if (out.length < pierce || !out.length) out.push({ t: wall, target: null, point: { x: o.x + d.x * wall, y: o.y + d.y * wall, z: o.z + d.z * wall } });
    return out;
  }

  explode(p, def) {
    this.lastBlastHits = 0;
    for (const e of this.fighters) {
      if (e.team !== 'enemy' || e.state === 'defeated') continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d > def.blast + e.radius) continue;
      const fall = 1 - Math.min(1, d / (def.blast + e.radius)) * 0.6;
      this.applyShot(e, def.damage * fall, false, { ...def, knockdownPellets: 1 }, 1, { x: e.x, y: 1, z: e.z }, p);
      this.lastBlastHits++;
    }
    this.emit({ type: 'boom', x: p.x, y: p.y, z: p.z, radius: def.blast });
  }

  applyShot(t, damage, head, def, pellets, point, from = this.juno) {
    damage = Math.round(damage);
    t.hp = Math.max(0, t.hp - damage);
    const dx = t.x - from.x, dz = t.z - from.z, d = Math.hypot(dx, dz) || 1;
    const k = def.push * CONFIG.combat.pushDecay * Math.min(1, pellets / 2 + 0.5);
    t.kx += (dx / d) * k; t.kz += (dz / d) * k;
    const knock = def.knockdownPellets && pellets >= def.knockdownPellets && CONFIG.enemies[t.kind].downTime > 0;
    if (t.hp <= 0) {
      if (t.token) this.releaseToken(t, 1);
      this.setState(t, 'defeated');
      this.dropCoins(t.x, t.z, CONFIG.coins.drop[t.kind] || 0);
    } else if (knock && t.state !== 'knocked_down') {
      if (t.token) this.releaseToken(t, rand(0.8, 1.5));
      this.setState(t, 'knocked_down');
    } else if (!(t.staggerCd > 0) && t.state !== 'knocked_down') {
      if (t.token) this.releaseToken(t, rand(0.8, 1.5));
      this.setState(t, 'hurt');
      t.staggerCd = CONFIG.fps.staggerEvery;
    }
    t.hurtBy = head ? 'junoKick' : null; // the placeholder snaps its head back on a headshot
    this.emit({
      type: 'hit', attack: this.gun.id, weapon: this.gun.id, attacker: this.juno.uid, target: t.uid, targetTeam: 'enemy',
      damage, defeated: t.hp <= 0, state: t.state, head, x: point.x, y: point.y, z: point.z,
    });
  }

  // ---- thrown wrenches ----------------------------------------------------------------
  startAttack(f, key) {
    f.thrown = false;
    super.startAttack(f, key);
  }

  checkHits(att, a) {
    if (!a.ranged) { super.checkHits(att, a); return; }
    if (att.thrown) return;
    att.thrown = true;
    const F = CONFIG.fps, j = this.juno;
    const from = { x: att.x + Math.sin(att.yaw) * 0.4, y: 1.6, z: att.z + Math.cos(att.yaw) * 0.4 };
    const dist = Math.hypot(j.x - from.x, j.z - from.z);
    const T = Math.max(0.25, dist / F.throwSpeed);
    const tx = j.x + j.vx * T * 0.5, tz = j.z + j.vz * T * 0.5, ty = 1.1; // lead the target a little
    this.projectiles.push({
      id: this.projUid++, x: from.x, y: from.y, z: from.z, px: from.x, py: from.y, pz: from.z,
      vx: (tx - from.x) / T, vz: (tz - from.z) / T, vy: (ty - from.y) / T + 0.5 * F.throwGravity * T,
      damage: a.damage * (att.dmgMul || 1), push: a.push, life: 3, owner: att.uid,
    });
    this.emit({ type: 'throw', x: from.x, z: from.z });
  }

  updateProjectiles(dt) {
    const F = CONFIG.fps, j = this.juno, A = CONFIG.arena;
    for (const p of this.projectiles) {
      p.px = p.x; p.py = p.y; p.pz = p.z;
      p.vy -= F.throwGravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.life -= dt;
      const near = Math.hypot(p.x - j.x, p.z - j.z) < j.radius + 0.25 && p.y > 0 && p.y < 1.8;
      if (near && this.canBeHit(j)) {
        p.dead = true;
        this.hurtJuno(Math.round(p.damage), p);
        continue;
      }
      const inProp = this.solids.some((s) => (s.type === 'circle'
        ? Math.hypot(p.x - s.x, p.z - s.z) < s.r
        : Math.abs(p.x - s.x) < s.hx && Math.abs(p.z - s.z) < s.hz) && p.y < (SOLID_HEIGHT[s.id] ?? 1));
      if (p.y <= 0 || inProp || p.life <= 0 || Math.abs(p.x) > A.width / 2 + 2 || Math.abs(p.z) > A.depth / 2 + 2) {
        p.dead = true;
        this.emit({ type: 'thud', x: p.x, y: Math.max(0.05, p.y), z: p.z });
      }
    }
    if (this.projectiles.some((p) => p.dead)) this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  hurtJuno(damage, p) {
    const j = this.juno;
    j.hp = Math.max(0, j.hp - damage);
    j.invuln = CONFIG.combat.invuln;
    const d = Math.hypot(p.vx, p.vz) || 1;
    j.kx = (p.vx / d) * p.push * CONFIG.combat.pushDecay;
    j.kz = (p.vz / d) * p.push * CONFIG.combat.pushDecay;
    if (j.hp <= 0) { this.setState(j, 'defeated'); this.phase = 'lost'; this.emit({ type: 'lost' }); }
    else this.setState(j, 'hurt');
    this.emit({ type: 'hit', attack: 'eliteThrow', attacker: p.owner, target: j.uid, targetTeam: 'player', damage, defeated: j.hp <= 0, state: j.state, x: j.x, z: j.z });
  }
}

// ---- ray maths ------------------------------------------------------------------------
// Ray against an upright cylinder standing on the floor: distance along the ray, or null.
function rayCylinder(o, d, cx, cz, r, h) {
  const ox = o.x - cx, oz = o.z - cz;
  const a = d.x * d.x + d.z * d.z;
  let best = null;
  if (a > 1e-8) {
    const b = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - r * r;
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
        if (t < 0) continue;
        const y = o.y + d.y * t;
        if (y >= 0 && y <= h) { best = t; break; }
      }
    }
  }
  if (Math.abs(d.y) > 1e-6) { // the flat top
    const t = (h - o.y) / d.y;
    if (t > 0 && (best === null || t < best)) {
      const x = ox + d.x * t, z = oz + d.z * t;
      if (x * x + z * z <= r * r) best = t;
    }
  }
  return best;
}

function rayBox(o, d, x0, x1, y0, y1, z0, z1) {
  let t0 = 0, t1 = Infinity;
  for (const [oo, dd, lo, hi] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
    if (Math.abs(dd) < 1e-9) { if (oo < lo || oo > hi) return null; continue; }
    let a = (lo - oo) / dd, b = (hi - oo) / dd;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    if (t0 > t1) return null;
  }
  return t0;
}
