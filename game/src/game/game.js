// Gameplay: fighters, states, attacks, enemy turns, waves and collisions.
// Nothing in this file knows how anything looks; the view reads this state and draws it.
// Angles: yaw 0 faces +Z (south, toward the camera); yaw PI faces -Z (north).

import { CONFIG } from '../config.js';
import { PROPS, JUNO_START, SPAWN_X, SPAWN_Z } from './level.js';

const TAU = Math.PI * 2;
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

const JUNO_CHAIN = ['junoJab', 'junoCross', 'junoKick'];
const CHAIN_LABEL = { junoJab: 'jab', junoCross: 'cross', junoKick: 'kick' };
const ENEMY_FREE = new Set(['enter', 'circle', 'approach']);

export function cfgOf(f) {
  return f.team === 'player' ? CONFIG.juno : CONFIG.enemies[f.kind];
}

// The state name shown in the debug panel and used by the view to pick a pose/animation.
export function stateLabel(f) {
  if (f.state !== 'attack') return f.state;
  if (f.team === 'player') return CHAIN_LABEL[f.attack];
  const a = CONFIG.attacks[f.attack];
  return f.stateTime / a.length < a.lands ? 'windup' : 'attack';
}

export class Game {
  constructor() {
    this.listeners = [];
    this.reset();
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { ev.time = this.time; for (const fn of this.listeners) fn(ev, this); }

  reset() {
    this.uid = 1;
    this.time = 0;
    this.phase = 'playing';       // playing | won | lost
    this.waveIndex = -1;
    this.waveActive = false;
    this.waveTimer = 0.8;
    this.nextAttackTime = 0;
    this.spawnCount = 0;
    this.solids = PROPS.map((p) => ({ ...p.solid, x: p.x, z: p.z, id: p.id }));
    this.fighters = [];
    this.juno = this.makeFighter('juno', 'player', JUNO_START.x, JUNO_START.z);
    this.juno.yaw = this.juno.pyaw = Math.PI;
    this.fighters.push(this.juno);
    this.emit({ type: 'reset' });
  }

  makeFighter(kind, team, x, z) {
    const c = team === 'player' ? CONFIG.juno : CONFIG.enemies[kind];
    return {
      uid: this.uid++, kind, team,
      hp: c.health, maxHp: c.health, radius: c.radius,
      x, z, px: x, pz: z, yaw: 0, pyaw: 0,
      vx: 0, vz: 0, kx: 0, kz: 0, speedNow: 0,
      state: team === 'player' ? 'idle' : 'enter', stateTime: 0,
      attack: null, hitSet: new Set(), queued: false,
      freeze: 0, frozen: false, invuln: 0, hurtBy: null,
      comboIndex: 0, comboTimer: 0,
      token: false, cooldown: 0, waitTime: 0, nextAttack: null, attackCount: 0,
      circleR: 3, strafeDir: 1, strafeTimer: 2, blockedTime: 0,
      entryX: x, entryZ: z, removed: false,
    };
  }

  get enemies() { return this.fighters.filter((f) => f.team === 'enemy'); }
  liveEnemies() { return this.fighters.filter((f) => f.team === 'enemy' && f.state !== 'defeated'); }

  // ---- one fixed step ------------------------------------------------------
  // input: { mx, mz } world-space move (length 0..1), attackPresses: number
  step(dt, input) {
    this.time += dt;
    for (const f of this.fighters) { f.px = f.x; f.pz = f.z; f.pyaw = f.yaw; f.frozen = f.freeze > 0; }

    this.updateJuno(dt, input);
    this.director();
    for (const e of this.fighters) if (e.team === 'enemy') this.updateEnemy(e, dt);
    for (const f of this.fighters) this.advance(f, dt);
    this.physics(dt);
    this.updateWaves(dt);
    this.fighters = this.fighters.filter((f) => !f.removed);
  }

  // ---- Juno ------------------------------------------------------------------
  updateJuno(dt, input) {
    const j = this.juno, c = CONFIG.juno;
    j.vx = j.vz = 0;
    const presses = this.phase === 'playing' ? input.attackPresses : 0;

    if (j.state === 'attack' && presses > 0) j.queued = true;
    if (j.frozen) return;

    if (j.comboTimer > 0) { j.comboTimer -= dt; if (j.comboTimer <= 0) j.comboIndex = 0; }

    if (j.state !== 'idle' && j.state !== 'run') return;
    if (this.phase === 'won') { this.setState(j, 'win'); return; }
    if (this.phase !== 'playing') { this.setState(j, 'idle'); return; }

    if (presses > 0) { this.startJunoAttack(); return; }

    const m = Math.hypot(input.mx, input.mz);
    if (m > 0.08) {
      const s = c.speed * Math.min(1, m);
      j.vx = (input.mx / m) * s;
      j.vz = (input.mz / m) * s;
      this.turnToward(j, Math.atan2(input.mx, input.mz), c.turnRate, dt);
      if (j.state !== 'run') this.setState(j, 'run');
    } else if (j.state !== 'idle') {
      this.setState(j, 'idle');
    }
  }

  startJunoAttack() {
    const j = this.juno;
    const key = JUNO_CHAIN[j.comboIndex % JUNO_CHAIN.length];
    j.comboIndex = (j.comboIndex + 1) % JUNO_CHAIN.length;
    j.comboTimer = 0;
    // Snap to face the nearest enemy in range, so attacks are easy to aim on a phone.
    let best = null, bestD = CONFIG.juno.autoFaceRange;
    for (const e of this.liveEnemies()) {
      const d = Math.hypot(e.x - j.x, e.z - j.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) j.yaw = yawTo(j, best);
    this.startAttack(j, key);
  }

  // ---- enemies -----------------------------------------------------------------
  // Hands out attack turns: only a few enemies may attack at once, with a gap between attacks.
  director() {
    if (this.phase !== 'playing') return;
    const j = this.juno;
    if (j.state === 'knocked_down' || j.state === 'defeated') return;
    const max = CONFIG.ai.maxAttackers[Math.max(0, this.waveIndex)] ?? 1;
    const live = this.liveEnemies();
    if (live.filter((e) => e.token).length >= max) return;
    let pick = null;
    for (const e of live) {
      if (e.state !== 'circle' || e.cooldown > 0 || e.frozen) continue;
      if (!pick || e.waitTime > pick.waitTime) pick = e;
    }
    if (!pick) return;
    pick.token = true;
    pick.waitTime = 0;
    const list = CONFIG.enemies[pick.kind].attacks;
    const every = CONFIG.enemies[pick.kind].smashEvery;
    pick.nextAttack = list.length > 1 && every && pick.attackCount % every === every - 1 ? list[1] : list[0];
    this.setState(pick, 'approach');
  }

  updateEnemy(e, dt) {
    e.vx = e.vz = 0;
    if (e.frozen) return;
    e.cooldown -= dt;
    if (!ENEMY_FREE.has(e.state)) return;

    const c = CONFIG.enemies[e.kind], ai = CONFIG.ai, j = this.juno;
    const dx = e.x - j.x, dz = e.z - j.z;
    const d = Math.hypot(dx, dz) || 0.001;
    this.turnToward(e, yawTo(e, j), 10, dt);

    if (e.state === 'enter') {
      const ex = e.entryX - e.x, ez = e.entryZ - e.z, ed = Math.hypot(ex, ez);
      if (ed < 0.25 || e.stateTime > 4) { this.setState(e, 'circle'); return; }
      e.vx = (ex / ed) * c.speed; e.vz = (ez / ed) * c.speed;
      return;
    }

    if (e.state === 'circle') {
      e.waitTime += dt;
      const ux = dx / d, uz = dz / d;
      const radial = Math.max(-1, Math.min(1, (e.circleR - d) * 1.5));
      e.strafeTimer -= dt;
      if (e.strafeTimer <= 0) { e.strafeDir = Math.random() < 0.5 ? -1 : 1; e.strafeTimer = rand(1.5, 3); }
      let mx = ux * radial - uz * e.strafeDir * 0.7;
      let mz = uz * radial + ux * e.strafeDir * 0.7;
      const m = Math.hypot(mx, mz);
      if (m > 0.01) {
        const s = c.speed * ai.strafe * Math.min(1, m);
        e.vx = (mx / m) * s; e.vz = (mz / m) * s;
      }
      return;
    }

    // approach: walk in and attack when close enough and it is this enemy's turn
    if (j.state === 'knocked_down' || j.state === 'defeated' || this.phase !== 'playing'
        || e.stateTime > ai.approachTimeout) {
      this.releaseToken(e, rand(0.4, 0.9));
      this.setState(e, 'circle');
      return;
    }
    const a = CONFIG.attacks[e.nextAttack];
    const range = a.reach * ai.rangeShare + j.radius;
    const facing = Math.abs(wrap(yawTo(e, j) - e.yaw)) < 0.35;
    if (d <= range) {
      if (facing && this.time >= this.nextAttackTime) {
        this.nextAttackTime = this.time + ai.attackGap;
        e.attackCount++;
        this.startAttack(e, e.nextAttack);
      }
      return; // hold position until the gap has passed
    }
    e.vx = (-dx / d) * c.speed; e.vz = (-dz / d) * c.speed;
  }

  releaseToken(e, cooldown) {
    e.token = false;
    e.cooldown = cooldown;
  }

  // ---- states ------------------------------------------------------------------
  setState(f, s) { f.state = s; f.stateTime = 0; }

  startAttack(f, key) {
    f.attack = key;
    f.hitSet = new Set();
    f.queued = false;
    this.setState(f, 'attack');
    this.emit({ type: 'attackStart', uid: f.uid, team: f.team, attack: key });
  }

  endAttack(f) {
    if (f.team === 'player') {
      if (f.queued && this.phase === 'playing') { this.startJunoAttack(); return; }
      f.comboTimer = CONFIG.juno.comboReset;
      this.setState(f, 'idle');
    } else {
      this.releaseToken(f, rand(CONFIG.ai.cooldownMin, CONFIG.ai.cooldownMax));
      this.setState(f, 'circle');
    }
  }

  backToFree(f) {
    if (f.team === 'player') this.setState(f, 'idle');
    else { this.releaseToken(f, rand(0.5, 1.2)); this.setState(f, 'circle'); }
  }

  advance(f, dt) {
    if (f.freeze > 0) { f.freeze -= dt; return; }
    f.invuln = Math.max(0, f.invuln - dt);
    f.stateTime += dt;
    const c = cfgOf(f);
    switch (f.state) {
      case 'attack': {
        const a = CONFIG.attacks[f.attack];
        const frac = f.stateTime / a.length;
        if (frac >= a.lands && frac < a.ends) this.checkHits(f, a);
        if (frac >= 1) this.endAttack(f);
        break;
      }
      case 'hurt':
        if (f.stateTime >= c.hurtTime) this.backToFree(f);
        break;
      case 'knocked_down':
        if (f.stateTime >= c.downTime) {
          this.backToFree(f);
          if (f.team === 'player') f.invuln = CONFIG.juno.invulnAfterDown;
        }
        break;
      case 'defeated':
        if (f.team === 'enemy' && f.stateTime > 2.0) f.removed = true;
        break;
    }
  }

  // ---- combat ------------------------------------------------------------------
  canBeHit(t) {
    return t.state !== 'defeated' && t.state !== 'knocked_down' && t.invuln <= 0 && !t.removed;
  }

  checkHits(att, a) {
    const cone = (CONFIG.combat.coneDeg * Math.PI) / 180;
    for (const t of this.fighters) {
      if (t.team === att.team || t.removed || att.hitSet.has(t.uid) || !this.canBeHit(t)) continue;
      const dx = t.x - att.x, dz = t.z - att.z, d = Math.hypot(dx, dz);
      if (d > a.reach + t.radius) continue;
      if (d > 0.05 && Math.abs(wrap(Math.atan2(dx, dz) - att.yaw)) > cone) continue;
      this.applyHit(att, t, a, d, dx, dz);
    }
  }

  applyHit(att, t, a, d, dx, dz) {
    const cc = CONFIG.combat;
    att.hitSet.add(t.uid);
    t.hp = Math.max(0, t.hp - a.damage);
    t.invuln = cc.invuln;
    t.hurtBy = att.attack;
    const nx = d > 0.01 ? dx / d : Math.sin(att.yaw), nz = d > 0.01 ? dz / d : Math.cos(att.yaw);
    t.kx = nx * a.push * cc.pushDecay;
    t.kz = nz * a.push * cc.pushDecay;
    att.freeze = t.freeze = cc.hitstop;
    if (t.team === 'enemy' && t.token) this.releaseToken(t, rand(0.8, 1.5));

    if (t.hp <= 0) {
      this.setState(t, 'defeated');
      if (t.team === 'player') { this.phase = 'lost'; this.emit({ type: 'lost' }); }
    } else if (a.knockdown && cfgOf(t).downTime > 0) {
      this.setState(t, 'knocked_down');
    } else {
      this.setState(t, 'hurt');
    }
    this.emit({
      type: 'hit', attack: att.attack, attacker: att.uid, target: t.uid, targetTeam: t.team,
      damage: a.damage, defeated: t.hp <= 0, state: t.state,
      x: (att.x + t.x) / 2, z: (att.z + t.z) / 2,
    });
  }

  // ---- movement and collisions ---------------------------------------------
  turnToward(f, target, rate, dt) {
    f.yaw = wrap(f.yaw + wrap(target - f.yaw) * (1 - Math.exp(-rate * dt)));
  }

  physics(dt) {
    const decay = Math.exp(-CONFIG.combat.pushDecay * dt);
    for (const f of this.fighters) {
      if (f.frozen) continue;
      f.x += (f.vx + f.kx) * dt;
      f.z += (f.vz + f.kz) * dt;
      f.kx *= decay; f.kz *= decay;
    }
    const solid = this.fighters.filter((f) => f.state !== 'defeated');
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < solid.length; i++) {
        for (let k = i + 1; k < solid.length; k++) this.separate(solid[i], solid[k]);
      }
      for (const f of this.fighters) this.keepOut(f);
    }
    // In a tight spot (squeezed between a prop and a wall) the pushes can fight each other.
    // If a fighter is still inside something, put it back where it was last step and stop its knockback.
    for (const f of this.fighters) {
      if (this.penetration(f) > 0.005) { f.x = f.px; f.z = f.pz; f.kx = f.kz = 0; }
    }
    for (const f of this.fighters) {
      f.speedNow = Math.hypot(f.x - f.px, f.z - f.pz) / dt;
      // a circling enemy that is blocked turns the other way
      if (f.team === 'enemy' && f.state === 'circle') {
        const want = Math.hypot(f.vx, f.vz);
        f.blockedTime = want > 0.3 && f.speedNow < want * 0.3 ? f.blockedTime + dt : 0;
        if (f.blockedTime > 0.35) { f.strafeDir *= -1; f.strafeTimer = rand(1.5, 3); f.blockedTime = 0; }
      }
    }
  }

  separate(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.radius + b.radius;
    if (d >= min) return;
    const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
    const ma = a.radius * a.radius, mb = b.radius * b.radius, over = min - d;
    const sa = mb / (ma + mb), sb = ma / (ma + mb);
    a.x -= nx * over * sa; a.z -= nz * over * sa;
    b.x += nx * over * sb; b.z += nz * over * sb;
  }

  keepOut(f) {
    const r = f.radius;
    for (const s of this.solids) {
      if (s.type === 'circle') {
        const dx = f.x - s.x, dz = f.z - s.z, d = Math.hypot(dx, dz), min = s.r + r;
        if (d < min) {
          const nx = d > 1e-4 ? dx / d : 0, nz = d > 1e-4 ? dz / d : 1;
          f.x = s.x + nx * min; f.z = s.z + nz * min;
        }
      } else {
        const cx = Math.max(s.x - s.hx, Math.min(f.x, s.x + s.hx));
        const cz = Math.max(s.z - s.hz, Math.min(f.z, s.z + s.hz));
        const dx = f.x - cx, dz = f.z - cz, d = Math.hypot(dx, dz);
        if (d > 1e-4 && d < r) {
          f.x = cx + (dx / d) * r; f.z = cz + (dz / d) * r;
        } else if (d <= 1e-4) { // centre inside the box: push out along the shortest axis
          const px = s.hx + r - Math.abs(f.x - s.x), pz = s.hz + r - Math.abs(f.z - s.z);
          if (px < pz) f.x = s.x + Math.sign(f.x - s.x || 1) * (s.hx + r);
          else f.z = s.z + Math.sign(f.z - s.z || 1) * (s.hz + r);
        }
      }
    }
    const A = CONFIG.arena;
    const hw = A.width / 2 - A.wallThickness - r, hd = A.depth / 2 - A.wallThickness - r;
    f.x = Math.max(-hw, Math.min(hw, f.x));
    f.z = Math.max(-hd, Math.min(hd, f.z));
  }

  // How far (metres) a fighter is inside a prop or the wall; 0 when clear.
  penetration(f) {
    const r = f.radius, A = CONFIG.arena;
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

  // ---- waves -------------------------------------------------------------------
  updateWaves(dt) {
    if (this.phase !== 'playing') return;
    const W = CONFIG.waves;
    if (this.waveActive && this.liveEnemies().length === 0) {
      this.waveActive = false;
      this.waveTimer = W.delay;
      if (this.waveIndex >= W.list.length - 1) {
        this.phase = 'won';
        this.emit({ type: 'won' });
        return;
      }
      this.juno.hp = Math.min(this.juno.maxHp, this.juno.hp + W.healOnClear);
      this.emit({ type: 'waveClear', wave: this.waveIndex + 1 });
    }
    if (!this.waveActive) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) this.startWave(this.waveIndex + 1);
    }
  }

  startWave(i) {
    this.waveIndex = i;
    this.waveActive = true;
    this.nextAttackTime = this.time + 1.0;
    for (const kind of CONFIG.waves.list[i]) {
      const x = SPAWN_X[this.spawnCount++ % SPAWN_X.length];
      const e = this.makeFighter(kind, 'enemy', x, SPAWN_Z);
      e.entryZ = CONFIG.waves.entryZ + rand(-0.4, 0.4);
      e.circleR = rand(CONFIG.ai.circleMin, CONFIG.ai.circleMax);
      e.strafeDir = Math.random() < 0.5 ? -1 : 1;
      e.cooldown = rand(0.2, 1.0);
      this.fighters.push(e);
    }
    this.emit({ type: 'wave', wave: i + 1, total: CONFIG.waves.list.length });
  }
}
