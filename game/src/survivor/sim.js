// One run of Roof Rumble: Juno auto-fights swarms of Tin Crows for 5 minutes.
// Gameplay only: nothing here knows how anything looks. The view reads this state.
// Yaw 0 faces +Z (toward the camera); +Z is south.

import { S, UPGRADES } from './config.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

export const PROPS = [
  { id: 'water_tank', x: -5.5, z: -9, solid: { type: 'circle', r: 1.0 } },
  { id: 'water_tank', x: 5.5, z: 8, solid: { type: 'circle', r: 1.0 } },
  { id: 'crate', x: -6, z: 3, solid: { type: 'box', hx: 0.5, hz: 0.5 } },
  { id: 'crate', x: -6, z: 4, yaw: Math.PI / 2, solid: { type: 'box', hx: 0.5, hz: 0.5 } },
  { id: 'crate', x: 6, z: -3, yaw: Math.PI, solid: { type: 'box', hx: 0.5, hz: 0.5 } },
  { id: 'crate', x: 6, z: -4, solid: { type: 'box', hx: 0.5, hz: 0.5 } },
  { id: 'crate', x: 1.5, z: -11, yaw: 0.6, solid: { type: 'box', hx: 0.5, hz: 0.5 } },
  { id: 'crate', x: -2, z: 11, yaw: 0.3, solid: { type: 'box', hx: 0.5, hz: 0.5 } },
  { id: 'lamp_post', x: -8.4, z: -13.4, solid: { type: 'circle', r: 0.15 } },
  { id: 'lamp_post', x: 8.4, z: -13.4, solid: { type: 'circle', r: 0.15 } },
  { id: 'lamp_post', x: -8.4, z: 13.4, solid: { type: 'circle', r: 0.15 } },
  { id: 'lamp_post', x: 8.4, z: 13.4, solid: { type: 'circle', r: 0.15 } },
];

export class Run {
  constructor(meta = {}) {
    this.listeners = [];
    this.meta = meta; // permanent upgrade levels from the shop
    this.reset();
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { ev.time = this.time; for (const fn of this.listeners) fn(ev, this); }

  reset() {
    const m = this.meta, J = S.juno;
    this.time = 0;
    this.phase = 'play';          // play | levelup | dead | won
    this.uid = 1;
    this.enemies = [];
    this.coins = [];
    this.shots = [];              // wrenches thrown by Crows
    this.tosses = [];             // wrenches thrown by Juno
    this.spawnAcc = 0;
    this.bossIndex = 0;
    this.kills = 0;
    this.bank = 0;                // coins collected this run, kept after it
    this.hitstop = 0;
    this.choices = null;
    this.pendingLevels = 0;
    this.revives = m.revive ? 1 : 0;
    this.solids = PROPS.map((p) => ({ ...p.solid, x: p.x, z: p.z, id: p.id }));
    const maxHp = J.hp + 15 * (m.vitality || 0);
    this.juno = {
      x: 0, z: 2, px: 0, pz: 2, vx: 0, vz: 0, kx: 0, kz: 0, yaw: Math.PI, radius: J.radius,
      hp: maxHp, maxHp, iframes: 0, attackT: 0.3, chain: 0, swing: 0, swingChain: 0, speedNow: 0,
      level: 1, xp: 0, xpNeed: S.xp.first, ups: { ...J.starter }, koCount: 0,
      pipeAngle: 0, wrenchT: 1, stompT: 2,
      rollT: 0, rollCd: 0, rollX: 0, rollZ: 1, rolls: 0,
    };
    this.emit({ type: 'reset' });
  }

  // ---- derived stats from upgrades and the shop ---------------------------------------
  lv(k) { return this.juno.ups[k] || 0; }
  get dmgMul() { return (1 + 0.25 * this.lv('haymaker')) * (1 + 0.08 * (this.meta.might || 0)); }
  get interval() { return S.juno.attackInterval * Math.pow(0.88, this.lv('quick')); }
  get reach() { return S.juno.reach + 0.3 * this.lv('reach'); }
  get arc() { return ((S.juno.arcDeg + 12 * this.lv('reach')) * Math.PI) / 180; }
  get speed() { return S.juno.speed * (1 + 0.1 * this.lv('sneakers')) * (1 + 0.05 * (this.meta.swift || 0)); }
  get magnet() { return S.xp.magnet * (1 + 0.45 * this.lv('magnet')); }
  get coinMul() { return 1 + 0.15 * (this.meta.greed || 0); }

  // ---- one step ---------------------------------------------------------------------------
  step(dt, input) {
    if (this.phase !== 'play') return;
    if (this.hitstop > 0) { this.hitstop -= dt; return; } // the whole roof freezes for a heartbeat on a big hit
    this.time += dt;
    const j = this.juno;
    j.px = j.x; j.pz = j.z;
    for (const e of this.enemies) { e.px = e.x; e.pz = e.z; }
    for (const c of this.coins) { c.px = c.x; c.pz = c.z; c.py = c.y; }
    for (const s of this.shots) { s.px = s.x; s.pz = s.z; s.py = s.y; }
    for (const s of this.tosses) { s.px = s.x; s.pz = s.z; }

    this.spawn(dt);
    this.moveJuno(dt, input);
    this.autoAttack(dt);
    this.weapons(dt);
    this.moveEnemies(dt);
    this.projectiles(dt);
    this.pickups(dt);
    this.cleanup(dt);

    if (this.time >= S.run.length && this.phase === 'play') {
      this.phase = 'won';
      this.emit({ type: 'won', kills: this.kills, bank: this.bank });
    }
  }

  // ---- spawning ---------------------------------------------------------------------------
  spawn(dt) {
    const P = S.spawn, t = this.time;
    if (this.bossIndex < P.bossAt.length && t >= P.bossAt[this.bossIndex]) {
      this.addEnemy('boss', 1 + this.bossIndex * 0.8);
      this.bossIndex++;
      this.emit({ type: 'boss', n: this.bossIndex });
    }
    const rate = Math.min(P.maxPerSecond, P.perSecond + P.growth * t);
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.filter((e) => !e.dead).length >= P.maxAlive) break;
      const pool = [['grunt', 6]];
      if (t >= P.from.runner) pool.push(['runner', 3]);
      if (t >= P.from.thrower) pool.push(['thrower', 1.4]);
      if (t >= P.from.brute) pool.push(['brute', 1]);
      let r = Math.random() * pool.reduce((s, p) => s + p[1], 0), kind = 'grunt';
      for (const [k, w] of pool) { if ((r -= w) <= 0) { kind = k; break; } }
      // runners come in packs
      const n = kind === 'runner' ? P.runnerPack : 1;
      for (let i = 0; i < n; i++) this.addEnemy(kind, 1);
    }
  }

  addEnemy(kind, hpScale) {
    const A = S.arena, E = S.enemies[kind], j = this.juno;
    const hw = A.width / 2 - A.wallThickness - E.radius, hd = A.depth / 2 - A.wallThickness - E.radius;
    let x = 0, z = 0;
    for (let tries = 0; tries < 20; tries++) { // climb in over the wall, away from Juno
      const side = Math.floor(Math.random() * 4);
      x = side < 2 ? rand(-hw, hw) : (side === 2 ? -hw : hw);
      z = side >= 2 ? rand(-hd, hd) : (side === 0 ? -hd : hd);
      if (Math.hypot(x - j.x, z - j.z) >= S.spawn.minDistance && this.penetration({ x, z, radius: E.radius }) <= 0) break;
    }
    const hp = Math.round(E.hp * (1 + S.spawn.hpGrowth * this.time) * hpScale);
    this.enemies.push({
      id: this.uid++, kind, x, z, px: x, pz: z, vx: 0, vz: 0, kx: 0, kz: 0, yaw: 0, radius: E.radius,
      hp, maxHp: hp, flash: 0, cd: 0, walk: Math.random() * 6, dead: false, deadT: 0, hurtT: 0,
      throwT: rand(1, E.throwEvery || 2), smashT: E.smashEvery || 0, windup: 0, pipeCd: 0, strafe: Math.random() < 0.5 ? 1 : -1,
    });
  }

  // ---- Juno ---------------------------------------------------------------------------------
  // input: { mx, mz } move direction (length 0..1) and roll: presses of the ROLL button since the last step
  moveJuno(dt, input) {
    const j = this.juno, R = S.juno.roll;
    j.iframes = Math.max(0, j.iframes - dt);
    j.rollCd = Math.max(0, j.rollCd - dt);
    const m = Math.hypot(input.mx, input.mz);
    if (input.roll > 0) {
      input.roll = 0;
      if (j.rollCd <= 0 && j.rollT <= 0) {
        // roll the way the thumb points, or straight ahead when standing still
        j.rollX = m > 0.05 ? input.mx / m : Math.sin(j.yaw);
        j.rollZ = m > 0.05 ? input.mz / m : Math.cos(j.yaw);
        j.yaw = Math.atan2(j.rollX, j.rollZ);
        j.rollT = R.time; j.rollCd = R.cooldown; j.rolls++;
        j.iframes = Math.max(j.iframes, R.iframes);
        j.swing = 0;
        this.emit({ type: 'roll', x: j.x, z: j.z });
      }
    }
    if (j.rollT > 0) {
      j.rollT -= dt;
      const k = R.speed * (0.45 + 0.55 * Math.max(0, j.rollT) / R.time); // fast out, easing off
      j.vx = j.rollX * k; j.vz = j.rollZ * k;
      j.x += j.vx * dt; j.z += j.vz * dt;
      this.keepOut(j);
      if (this.penetration(j) > 0.005) { j.x = j.px; j.z = j.pz; }
      j.speedNow = Math.hypot(j.x - j.px, j.z - j.pz) / dt;
      return;
    }
    const s = this.speed * Math.min(1, m);
    j.vx = m > 0.05 ? (input.mx / m) * s : 0;
    j.vz = m > 0.05 ? (input.mz / m) * s : 0;
    if (m > 0.05 && j.swing <= 0) j.yaw = turn(j.yaw, Math.atan2(input.mx, input.mz), 14 * dt);
    const decay = Math.exp(-10 * dt);
    j.x += (j.vx + j.kx) * dt; j.z += (j.vz + j.kz) * dt;
    j.kx *= decay; j.kz *= decay;
    this.keepOut(j);
    if (this.penetration(j) > 0.005) { j.x = j.px; j.z = j.pz; }
    j.speedNow = Math.hypot(j.x - j.px, j.z - j.pz) / dt;
  }

  nearest(x, z, maxD) {
    let best = null, bd = maxD;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.z - z) - e.radius;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  autoAttack(dt) {
    const j = this.juno;
    if (j.rollT > 0) return; // no punching mid-roll
    j.attackT -= dt;
    j.swing = Math.max(0, j.swing - dt);
    if (j.attackT > 0) return;
    const target = this.nearest(j.x, j.z, this.reach + 0.2);
    if (!target) { j.chain = 0; return; }
    j.yaw = Math.atan2(target.x - j.x, target.z - j.z);
    const c = j.chain;
    const dmg = S.juno.damage[c] * this.dmgMul, push = S.juno.push[c], arc = this.arc / 2;
    let hits = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - j.x, dz = e.z - j.z, d = Math.hypot(dx, dz);
      if (d - e.radius > this.reach) continue;
      if (d > 0.1 && Math.abs(wrap(Math.atan2(dx, dz) - j.yaw)) > arc) continue;
      this.damage(e, dmg, push, dx / (d || 1), dz / (d || 1), c === 2 ? 'kick' : 'punch');
      hits++;
    }
    j.swing = 0.22; j.swingChain = c;
    j.chain = (c + 1) % 3;
    j.attackT = this.interval;
    if (hits && c === 2) this.hitstop = S.feel.hitstop;
    this.emit({ type: 'swing', chain: c, hits });
  }

  weapons(dt) {
    const j = this.juno;
    // orbiting pipes
    const pipes = Math.min(4, this.lv('pipes'));
    if (pipes) {
      j.pipeAngle += dt * (3 + 0.3 * this.lv('pipes'));
      for (let i = 0; i < pipes; i++) {
        const a = j.pipeAngle + (i / pipes) * TAU, px = j.x + Math.sin(a) * 1.9, pz = j.z + Math.cos(a) * 1.9;
        for (const e of this.enemies) {
          if (e.dead || e.pipeCd > 0 || Math.hypot(e.x - px, e.z - pz) > e.radius + 0.35) continue;
          e.pipeCd = 0.45;
          this.damage(e, (9 + 3 * this.lv('pipes')) * this.dmgMul, 1.4, Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2), 'pipe');
        }
      }
    }
    // wrench toss
    const w = this.lv('wrench');
    if (w) {
      j.wrenchT -= dt;
      if (j.wrenchT <= 0) {
        j.wrenchT = 1.7 - 0.2 * w;
        const n = 1 + Math.floor((w - 1) / 2);
        const near = this.enemies.filter((e) => !e.dead && Math.hypot(e.x - j.x, e.z - j.z) < 9);
        for (let i = 0; i < n && near.length; i++) {
          const t = near.splice(Math.floor(Math.random() * near.length), 1)[0];
          const dx = t.x - j.x, dz = t.z - j.z, d = Math.hypot(dx, dz) || 1;
          this.tosses.push({ x: j.x, z: j.z, px: j.x, pz: j.z, vx: (dx / d) * 13, vz: (dz / d) * 13, life: 1.2, pierce: w >= 4 ? 2 : 1, hit: new Set(), spin: 0 });
        }
        this.emit({ type: 'toss' });
      }
    }
    // shockwave stomp
    const s = this.lv('stomp');
    if (s) {
      j.stompT -= dt;
      if (j.stompT <= 0) {
        j.stompT = 3.4 - 0.3 * s;
        const r = 2.4 + 0.3 * s;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const dx = e.x - j.x, dz = e.z - j.z, d = Math.hypot(dx, dz);
          if (d - e.radius > r) continue;
          this.damage(e, (14 + 8 * s) * this.dmgMul, 4, dx / (d || 1), dz / (d || 1), 'stomp');
        }
        this.emit({ type: 'stomp', x: j.x, z: j.z, r });
      }
    }
  }

  damage(e, amount, push, nx, nz, source) {
    if (e.dead) return;
    e.hp -= amount;
    e.flash = 0.1;
    e.hurtT = 0.18;
    const k = push / S.enemies[e.kind].mass;
    e.kx += nx * k * 10; e.kz += nz * k * 10;
    this.emit({ type: 'hit', id: e.id, kind: e.kind, x: e.x, z: e.z, amount, source });
    if (e.hp <= 0) this.kill(e, source);
  }

  kill(e, source) {
    e.dead = true; e.deadT = 0;
    this.kills++;
    const E = S.enemies[e.kind];
    const value = E.xp;
    // big Crows burst into several coins
    const n = Math.min(6, value);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = rand(1.5, 3.5);
      this.coins.push({ x: e.x, z: e.z, px: e.x, pz: e.z, y: 0.6, py: 0.6, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: rand(3, 5), value: value / n, age: 0 });
    }
    if (Math.random() < S.heal.chance || e.kind === 'brute' && Math.random() < 0.3) {
      this.coins.push({ x: e.x, z: e.z, px: e.x, pz: e.z, y: 0.6, py: 0.6, vx: rand(-1, 1), vz: rand(-1, 1), vy: 4, value: 0, heal: S.heal.amount, age: 0 });
    }
    const j = this.juno, sw = this.lv('secondwind');
    if (sw && ++j.koCount >= 10 - sw) { j.koCount = 0; j.hp = Math.min(j.maxHp, j.hp + 4); this.emit({ type: 'heal', amount: 4 }); }
    if (e.kind === 'boss' || e.kind === 'brute') this.hitstop = S.feel.hitstop * 2.5;
    this.emit({ type: 'kill', kind: e.kind, x: e.x, z: e.z, source });
  }

  hurtJuno(amount, fromX, fromZ, push = 2) {
    const j = this.juno;
    if (j.iframes > 0 || this.phase !== 'play') return false;
    j.hp -= amount;
    j.iframes = S.juno.iframes;
    const dx = j.x - fromX, dz = j.z - fromZ, d = Math.hypot(dx, dz) || 1;
    j.kx += (dx / d) * push * 4; j.kz += (dz / d) * push * 4;
    this.emit({ type: 'hurt', amount, hp: j.hp });
    if (j.hp <= 0) {
      if (this.revives > 0) {
        this.revives--;
        j.hp = j.maxHp * 0.5; j.iframes = 2;
        for (const e of this.enemies) { // push everyone away
          const ex = e.x - j.x, ez = e.z - j.z, ed = Math.hypot(ex, ez) || 1;
          if (ed < 5) { e.kx += (ex / ed) * 25; e.kz += (ez / ed) * 25; }
        }
        this.emit({ type: 'revive' });
      } else {
        j.hp = 0;
        this.phase = 'dead';
        this.emit({ type: 'dead', kills: this.kills, bank: this.bank, time: this.time });
      }
    }
    return true;
  }

  // ---- Crows -----------------------------------------------------------------------------
  moveEnemies(dt) {
    const j = this.juno;
    const decay = Math.exp(-8 * dt);
    for (const e of this.enemies) {
      if (e.dead) { e.deadT += dt; continue; }
      const E = S.enemies[e.kind];
      e.flash = Math.max(0, e.flash - dt);
      e.hurtT = Math.max(0, e.hurtT - dt);
      e.cd = Math.max(0, e.cd - dt);
      e.pipeCd = Math.max(0, e.pipeCd - dt);
      const dx = j.x - e.x, dz = j.z - e.z, d = Math.hypot(dx, dz) || 0.001;
      let mx = dx / d, mz = dz / d, sp = E.speed;
      if (e.hurtT > 0) sp *= 0.25; // flinch

      if (e.kind === 'thrower') {
        // keep a throwing distance and strafe
        if (d < E.range - 1.5) { mx = -mx; mz = -mz; }
        else if (d < E.range) { const t = mx; mx = -mz * e.strafe; mz = t * e.strafe; sp *= 0.6; }
        e.throwT -= dt;
        if (e.throwT <= 0 && d < E.range + 2) {
          e.throwT = E.throwEvery;
          const T = Math.max(0.3, d / 10), tx = j.x + j.vx * T * 0.6, tz = j.z + j.vz * T * 0.6;
          this.shots.push({ x: e.x, z: e.z, y: 1.5, px: e.x, pz: e.z, py: 1.5, vx: (tx - e.x) / T, vz: (tz - e.z) / T, vy: (1 - 1.5) / T + 6 * T, life: 3, damage: E.damage });
          this.emit({ type: 'throw', x: e.x, z: e.z });
        }
      }
      if (e.kind === 'boss') {
        if (e.windup > 0) {
          e.windup -= dt; sp = 0;
          if (e.windup <= 0) {
            e.smashT = E.smashEvery;
            if (Math.hypot(j.x - e.x, j.z - e.z) < E.smashRadius + j.radius) this.hurtJuno(E.damage, e.x, e.z, 6);
            for (const o of this.enemies) if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.z - e.z) < E.smashRadius) { o.kx += (o.x - e.x) * 6; o.kz += (o.z - e.z) * 6; }
            this.hitstop = S.feel.hitstop * 2;
            this.emit({ type: 'smash', x: e.x, z: e.z, r: E.smashRadius });
          }
        } else {
          e.smashT -= dt;
          if (e.smashT <= 0 && d < E.smashRadius + 0.5) { e.windup = E.smashWindup; this.emit({ type: 'windup', x: e.x, z: e.z, r: E.smashRadius, t: E.smashWindup }); }
        }
      }

      e.vx = mx * sp; e.vz = mz * sp;
      e.yaw = turn(e.yaw, Math.atan2(dx, dz), 10 * dt);
      e.x += (e.vx + e.kx) * dt; e.z += (e.vz + e.kz) * dt;
      e.kx *= decay; e.kz *= decay;
      e.walk += dt * (2 + sp * 2.2);

      // contact damage
      if (e.cd <= 0 && e.kind !== 'boss' && d < e.radius + j.radius + 0.08) {
        if (this.hurtJuno(E.damage, e.x, e.z, 1.6)) e.cd = S.contactCooldown;
      }
    }
    this.separate();
    for (const e of this.enemies) {
      if (e.dead) continue;
      this.keepOut(e);
      if (this.penetration(e) > 0.01) { e.x = e.px; e.z = e.pz; e.kx = e.kz = 0; }
    }
  }

  // push overlapping Crows apart, using a grid so 100+ stay cheap
  separate() {
    const cell = 1.2, grid = new Map(), live = this.enemies.filter((e) => !e.dead);
    for (const e of live) {
      const k = `${Math.floor(e.x / cell)},${Math.floor(e.z / cell)}`;
      (grid.get(k) || grid.set(k, []).get(k)).push(e);
    }
    const j = this.juno;
    for (const e of live) {
      const cx = Math.floor(e.x / cell), cz = Math.floor(e.z / cell);
      for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) {
        const list = grid.get(`${cx + ix},${cz + iz}`);
        if (!list) continue;
        for (const o of list) {
          if (o.id <= e.id) continue;
          const dx = o.x - e.x, dz = o.z - e.z, d = Math.hypot(dx, dz), min = e.radius + o.radius;
          if (d >= min || d < 1e-5) continue;
          const push = (min - d) / 2, nx = dx / d, nz = dz / d;
          const me = S.enemies[e.kind].mass, mo = S.enemies[o.kind].mass, we = mo / (me + mo), wo = me / (me + mo);
          e.x -= nx * push * 2 * we; e.z -= nz * push * 2 * we;
          o.x += nx * push * 2 * wo; o.z += nz * push * 2 * wo;
        }
      }
      // Crows cannot stand inside Juno (she is pushed a little too), except while she rolls through them
      const dx = j.x - e.x, dz = j.z - e.z, d = Math.hypot(dx, dz), min = e.radius + j.radius;
      if (d < min && d > 1e-5 && j.rollT <= 0) {
        const over = min - d;
        e.x -= (dx / d) * over * 0.8; e.z -= (dz / d) * over * 0.8;
        j.x += (dx / d) * over * 0.2; j.z += (dz / d) * over * 0.2;
      }
    }
    this.keepOut(j);
  }

  // ---- projectiles and pickups -------------------------------------------------------------
  projectiles(dt) {
    const j = this.juno;
    for (const s of this.shots) {
      s.vy -= 12 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.life -= dt;
      if (Math.hypot(s.x - j.x, s.z - j.z) < j.radius + 0.25 && s.y < 1.8) { this.hurtJuno(s.damage, s.x - s.vx, s.z - s.vz, 1.2); s.dead = true; }
      else if (s.y <= 0 || s.life <= 0 || this.penetration({ x: s.x, z: s.z, radius: 0.05 }) > 0) s.dead = true;
    }
    for (const t of this.tosses) {
      t.x += t.vx * dt; t.z += t.vz * dt; t.life -= dt; t.spin += dt * 20;
      for (const e of this.enemies) {
        if (e.dead || t.hit.has(e.id) || Math.hypot(e.x - t.x, e.z - t.z) > e.radius + 0.3) continue;
        t.hit.add(e.id);
        this.damage(e, (16 + 4 * this.lv('wrench')) * this.dmgMul, 1.8, t.vx / 13, t.vz / 13, 'wrench');
        if (t.hit.size >= t.pierce) { t.dead = true; break; }
      }
      if (t.life <= 0 || this.penetration({ x: t.x, z: t.z, radius: 0.05 }) > 0) t.dead = true;
    }
  }

  pickups(dt) {
    const j = this.juno, X = S.xp, mag = this.magnet;
    for (const c of this.coins) {
      c.age += dt;
      if (c.y > 0 || c.vy > 0) {
        c.vy -= 18 * dt; c.y += c.vy * dt;
        if (c.y <= 0) { c.y = 0; c.vy = c.vy < -2 ? -c.vy * 0.3 : 0; c.vx *= 0.4; c.vz *= 0.4; }
      } else { c.vx *= Math.exp(-6 * dt); c.vz *= Math.exp(-6 * dt); }
      c.x += c.vx * dt; c.z += c.vz * dt;
      const dx = j.x - c.x, dz = j.z - c.z, d = Math.hypot(dx, dz);
      if (c.age > 0.3 && d < mag && d > 0.01) {
        const step = Math.min(d, (X.magnetSpeed + (mag - d) * 3) * dt);
        c.x += (dx / d) * step; c.z += (dz / d) * step;
      }
      this.keepOut({ get x() { return c.x; }, set x(v) { c.x = v; }, get z() { return c.z; }, set z(v) { c.z = v; }, radius: 0.12 });
      if (c.age > 0.3 && Math.hypot(j.x - c.x, j.z - c.z) < X.pickup) {
        c.dead = true;
        if (c.heal) { j.hp = Math.min(j.maxHp, j.hp + c.heal); this.emit({ type: 'heal', amount: c.heal }); continue; }
        j.xp += c.value;
        this.bank += c.value * this.coinMul;
        this.emit({ type: 'coin' });
      }
    }
    while (j.xp >= j.xpNeed) {
      j.xp -= j.xpNeed;
      j.level++;
      j.xpNeed = X.first + X.perLevel * (j.level - 1);
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0 && this.phase === 'play') this.offerLevelUp();
  }

  offerLevelUp() {
    const j = this.juno;
    const open = Object.keys(UPGRADES).filter((k) => (j.ups[k] || 0) < 5);
    const pick = [];
    while (pick.length < 3 && open.length) pick.push(open.splice(Math.floor(Math.random() * open.length), 1)[0]);
    if (!pick.length) pick.push('heal');
    this.choices = pick;
    this.phase = 'levelup';
    this.emit({ type: 'levelup', level: j.level, choices: pick });
  }

  choose(key) {
    if (this.phase !== 'levelup') return;
    const j = this.juno;
    if (key === 'heal') j.hp = Math.min(j.maxHp, j.hp + 30);
    else {
      j.ups[key] = (j.ups[key] || 0) + 1;
      if (key === 'ironskin') { j.maxHp += 20; j.hp = Math.min(j.maxHp, j.hp + 20); }
    }
    this.pendingLevels--;
    this.choices = null;
    this.phase = 'play';
    this.emit({ type: 'chose', key, level: j.ups[key] || 0 });
    if (this.pendingLevels > 0) this.offerLevelUp();
  }

  cleanup() {
    if (this.enemies.some((e) => e.dead && e.deadT > 0.6)) this.enemies = this.enemies.filter((e) => !(e.dead && e.deadT > 0.6));
    if (this.coins.some((c) => c.dead)) this.coins = this.coins.filter((c) => !c.dead);
    if (this.shots.some((s) => s.dead)) this.shots = this.shots.filter((s) => !s.dead);
    if (this.tosses.some((s) => s.dead)) this.tosses = this.tosses.filter((s) => !s.dead);
  }

  // ---- collisions with props and walls --------------------------------------------------------
  keepOut(f) {
    const r = f.radius;
    for (const s of this.solids) {
      if (s.type === 'circle') {
        const dx = f.x - s.x, dz = f.z - s.z, d = Math.hypot(dx, dz), min = s.r + r;
        if (d < min) { const nx = d > 1e-4 ? dx / d : 0, nz = d > 1e-4 ? dz / d : 1; f.x = s.x + nx * min; f.z = s.z + nz * min; }
      } else {
        const cx = Math.max(s.x - s.hx, Math.min(f.x, s.x + s.hx)), cz = Math.max(s.z - s.hz, Math.min(f.z, s.z + s.hz));
        const dx = f.x - cx, dz = f.z - cz, d = Math.hypot(dx, dz);
        if (d > 1e-4 && d < r) { f.x = cx + (dx / d) * r; f.z = cz + (dz / d) * r; }
        else if (d <= 1e-4) {
          const px = s.hx + r - Math.abs(f.x - s.x), pz = s.hz + r - Math.abs(f.z - s.z);
          if (px < pz) f.x = s.x + Math.sign(f.x - s.x || 1) * (s.hx + r); else f.z = s.z + Math.sign(f.z - s.z || 1) * (s.hz + r);
        }
      }
    }
    const A = S.arena, hw = A.width / 2 - A.wallThickness - r, hd = A.depth / 2 - A.wallThickness - r;
    f.x = Math.max(-hw, Math.min(hw, f.x));
    f.z = Math.max(-hd, Math.min(hd, f.z));
  }

  penetration(f) {
    const r = f.radius, A = S.arena;
    let pen = Math.max(0, Math.abs(f.x) + r - (A.width / 2 - A.wallThickness), Math.abs(f.z) + r - (A.depth / 2 - A.wallThickness));
    for (const s of this.solids) {
      if (s.type === 'circle') pen = Math.max(pen, s.r + r - Math.hypot(f.x - s.x, f.z - s.z));
      else {
        const cx = Math.max(s.x - s.hx, Math.min(f.x, s.x + s.hx)), cz = Math.max(s.z - s.hz, Math.min(f.z, s.z + s.hz));
        pen = Math.max(pen, r - Math.hypot(f.x - cx, f.z - cz));
      }
    }
    return pen;
  }
}

function turn(a, target, k) { return wrap(a + wrap(target - a) * Math.min(1, k)); }
