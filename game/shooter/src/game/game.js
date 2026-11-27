// Gameplay: fighters, states, attacks, enemy turns, waves and collisions.
// Nothing in this file knows how anything looks; the view reads this state and draws it.
// Angles: yaw 0 faces +Z (south, toward the camera); yaw PI faces -Z (north).

import { CONFIG } from '../config.js';
import { PROPS, JUNO_START, SPAWN_X, SPAWN_Z, WEAPON_PADS } from './level.js';

const TAU = Math.PI * 2;
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

const JUNO_CHAIN = ['junoJab', 'junoCross', 'junoKick'];
const CHAIN_LABEL = { junoJab: 'jab', junoCross: 'cross', junoKick: 'kick' };
const WEAPON_LABEL = { junoJab: 'swing', junoCross: 'backswing', junoKick: 'overhead' };
const ENEMY_FREE = new Set(['enter', 'circle', 'approach']);

export function cfgOf(f) {
  return f.team === 'player' ? CONFIG.juno : CONFIG.enemies[f.kind];
}

// The attack a fighter is doing right now, with Juno's weapon applied.
export function attackOf(f) {
  const a = CONFIG.attacks[f.attack];
  if (f.team !== 'player') return f.dmgMul > 1 ? { ...a, damage: Math.round(a.damage * f.dmgMul) } : a;
  if (!f.weapon) return a;
  const w = CONFIG.weapons[f.weapon];
  return {
    ...a, length: a.length * w.lengthMul, reach: a.reach + w.reachAdd,
    damage: Math.round(a.damage * w.damageMul), knockdown: a.knockdown || !!w.knockdownAll,
  };
}

// The state name shown in the debug panel and used by the view to pick a pose/animation.
export function stateLabel(f) {
  if (f.state !== 'attack') return f.state;
  if (f.team === 'player') return (f.weapon ? WEAPON_LABEL : CHAIN_LABEL)[f.attack];
  const a = CONFIG.attacks[f.attack];
  return f.stateTime / a.length < a.lands ? 'windup' : 'attack';
}

export class Game {
  static bestKey = 'trs-best-wave'; // where the best wave is remembered (one key per game)

  constructor() {
    this.listeners = [];
    this.reset();
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { ev.time = this.time; for (const fn of this.listeners) fn(ev, this); }

  reset() {
    this.uid = 1;
    this.time = 0;
    this.phase = 'playing';       // playing | lost (waves never end)
    this.waveIndex = -1;       // 0-based: wave 1 is index 0
    this.wavesCleared = 0;
    this.queue = [];           // enemies of this wave still waiting to climb in
    this.reinforceTimer = 0;
    try { this.best = Number(localStorage.getItem(this.constructor.bestKey)) || 0; } catch { this.best = 0; }
    this.waveActive = false;
    this.waveTimer = 0.8;
    this.nextAttackTime = 0;
    this.spawnCount = 0;
    this.coins = [];
    this.coinUid = 1;
    this.slowmo = 0;
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
      coins: 0, weapon: null, durability: 0, comboHits: 0, comboBroken: false, dmgMul: 1,
    };
  }

  // Game speed multiplier (slow motion after a full combo). The main loop applies it.
  get timeWarp() { return this.slowmo > 0 ? CONFIG.combo.slowmoSpeed : 1; }

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
    this.updateCoins(dt);
    this.slowmo = Math.max(0, this.slowmo - dt);
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
    if (this.phase !== 'playing') { this.setState(j, 'idle'); return; }

    if (presses > 0) {
      const pad = this.padUnder(j);
      if (pad) this.tryBuy(pad); else this.startJunoAttack();
      return;
    }

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
    if (key === JUNO_CHAIN[0]) { j.comboHits = 0; j.comboBroken = false; }
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
    const caps = CONFIG.ai.maxAttackers;
    const max = caps[Math.min(caps.length - 1, Math.max(0, this.waveIndex))] ?? 1;
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
        this.nextAttackTime = this.time + this.attackGap();
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
      if (f.hitSet.size === 0) f.comboBroken = true; // a miss breaks the finisher
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
        const a = attackOf(f);
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
      case 'win':
        if (f.stateTime > 1.0) this.setState(f, 'idle'); // short cheer after a boss wave
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
      if (t.team === 'enemy') this.dropCoins(t.x, t.z, CONFIG.coins.drop[t.kind] || 0);
      if (t.team === 'player') { this.phase = 'lost'; this.emit({ type: 'lost' }); }
    } else if (a.knockdown && cfgOf(t).downTime > 0) {
      this.setState(t, 'knocked_down');
    } else {
      this.setState(t, 'hurt');
    }
    if (att.team === 'player') this.playerLanded(att, t);
    this.emit({
      type: 'hit', attack: att.attack, weapon: att.weapon, attacker: att.uid, target: t.uid, targetTeam: t.team,
      damage: a.damage, defeated: t.hp <= 0, state: t.state,
      x: (att.x + t.x) / 2, z: (att.z + t.z) / 2,
    });
  }

  // Combo counting, finisher and weapon wear, after one of Juno's hits lands.
  playerLanded(j, t) {
    if (j.hitSet.size === 1) { // first target this attack: counts toward the combo
      j.comboHits++;
      this.emit({ type: 'comboHit', n: j.comboHits, x: t.x, z: t.z, weapon: j.weapon });
      if (j.attack === JUNO_CHAIN[2] && j.comboHits === 3 && !j.comboBroken) {
        this.slowmo = CONFIG.combo.slowmo;
        this.dropCoins(t.x, t.z, CONFIG.coins.comboBonus);
        this.emit({ type: 'combo', x: t.x, z: t.z, weapon: j.weapon });
      }
    }
    if (j.weapon && --j.durability <= 0) {
      this.emit({ type: 'weaponBreak', weapon: j.weapon });
      j.weapon = null;
    }
  }

  // ---- coins and the weapons spot ---------------------------------------------
  dropCoins(x, z, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = rand(1, 2.4);
      this.coins.push({
        id: this.coinUid++, x, z, y: 1.0, px: x, pz: z, py: 1.0, radius: 0.15,
        vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: rand(3, 5), age: 0, taken: false,
      });
    }
  }

  updateCoins(dt) {
    const C = CONFIG.coins, j = this.juno;
    for (const c of this.coins) {
      c.px = c.x; c.pz = c.z; c.py = c.y;
      c.age += dt;
      if (c.y > 0 || c.vy > 0) {
        c.vy -= 20 * dt;
        c.y += c.vy * dt;
        if (c.y <= 0) {
          c.y = 0;
          c.vy = c.vy < -2 ? -c.vy * 0.35 : 0;
          c.vx *= 0.5; c.vz *= 0.5;
        }
      } else {
        const f = Math.exp(-6 * dt);
        c.vx *= f; c.vz *= f;
      }
      c.x += c.vx * dt; c.z += c.vz * dt;
      const dx = j.x - c.x, dz = j.z - c.z, d = Math.hypot(dx, dz);
      const canTake = j.state !== 'defeated' && c.age > 0.35;
      if (canTake && c.y < 0.4 && d < C.magnetRadius && d > 0.01) {
        const step = Math.min(d, C.magnetSpeed * dt);
        c.x += (dx / d) * step; c.z += (dz / d) * step;
      }
      this.keepOut(c);
      if (canTake && Math.hypot(j.x - c.x, j.z - c.z) < C.pickupRadius) {
        c.taken = true;
        j.coins++;
        this.emit({ type: 'coin', total: j.coins });
      } else if (c.age > C.life) {
        c.taken = true;
      }
    }
    if (this.coins.some((c) => c.taken)) this.coins = this.coins.filter((c) => !c.taken);
  }

  // A weapon is on sale once the waves before its unlock wave are cleared.
  unlocked(weapon) { return this.wavesCleared + 1 >= CONFIG.weapons[weapon].unlockWave; }

  padUnder(f) {
    for (const p of WEAPON_PADS) if (Math.hypot(f.x - p.x, f.z - p.z) < CONFIG.weapons.padRadius) return p;
    return null;
  }

  tryBuy(pad) {
    const j = this.juno, w = CONFIG.weapons[pad.weapon];
    if (!this.unlocked(pad.weapon)) {
      this.emit({ type: 'buyFail', weapon: pad.weapon, locked: w.unlockWave });
      return;
    }
    if (j.coins < w.cost) {
      this.emit({ type: 'buyFail', weapon: pad.weapon, need: w.cost - j.coins });
      return;
    }
    j.coins -= w.cost;
    j.weapon = pad.weapon;
    j.durability = w.durability;
    j.comboIndex = 0;
    this.emit({ type: 'buy', weapon: pad.weapon });
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

  // ---- waves (endless) -----------------------------------------------------------
  attackGap() {
    const W = CONFIG.waves;
    return Math.max(W.minAttackGap, CONFIG.ai.attackGap - W.attackGapShrink * Math.max(0, this.waveIndex));
  }

  // Who is in wave n (1-based): more Crows each wave, elites from wave 2, Grudge every 5th wave.
  static roster(n) {
    const W = CONFIG.waves;
    const total = Math.min(W.maxEnemies, Math.floor(W.baseCrows + W.crowsPerWave * (n - 1)));
    const boss = n % W.bossEvery === 0;
    const elites = n >= W.eliteFrom ? Math.min(total - 1, Math.floor(1 + W.elitesPerWave * (n - W.eliteFrom))) : 0;
    const list = [];
    if (boss) list.push('grudge');
    const grunts = total - list.length;
    for (let i = 0; i < grunts; i++) list.push(i < elites ? 'crow_elite' : 'crow');
    // mix the order so elites do not all come first
    return [list[0], ...list.slice(1).sort(() => Math.random() - 0.5)];
  }

  updateWaves(dt) {
    if (this.phase !== 'playing') return;
    const W = CONFIG.waves;
    const live = this.liveEnemies().length;

    // reinforcements climb in as others fall
    if (this.waveActive && this.queue.length && live < W.maxAlive) {
      this.reinforceTimer -= dt;
      if (this.reinforceTimer <= 0) { this.spawnEnemy(this.queue.shift()); this.reinforceTimer = W.reinforceDelay; }
    }

    if (this.waveActive && live === 0 && this.queue.length === 0) {
      this.waveActive = false;
      this.waveTimer = W.delay;
      this.wavesCleared = this.waveIndex + 1;
      this.juno.hp = Math.min(this.juno.maxHp, this.juno.hp + W.healOnClear);
      const boss = this.wavesCleared % W.bossEvery === 0;
      if (boss && (this.juno.state === 'idle' || this.juno.state === 'run')) this.setState(this.juno, 'win');
      this.emit({ type: 'waveClear', wave: this.wavesCleared, boss });
      for (const [name, w] of Object.entries(CONFIG.weapons)) {
        if (typeof w === 'object' && w.unlockWave === this.wavesCleared + 1 && w.unlockWave > 1) {
          this.emit({ type: 'unlock', weapon: name, cost: w.cost });
        }
      }
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
    const roster = Game.roster(i + 1);
    const first = roster.splice(0, CONFIG.waves.maxAlive);
    for (const kind of first) this.spawnEnemy(kind);
    this.queue = roster;
    this.reinforceTimer = CONFIG.waves.reinforceDelay;
    if (i + 1 > this.best) {
      this.best = i + 1;
      try { localStorage.setItem(this.constructor.bestKey, String(this.best)); } catch { /* private window: keep it in memory */ }
    }
    this.emit({ type: 'wave', wave: i + 1, boss: (i + 1) % CONFIG.waves.bossEvery === 0, size: first.length + roster.length });
  }

  spawnEnemy(kind) {
    const W = CONFIG.waves, n = this.waveIndex;
    const x = SPAWN_X[this.spawnCount++ % SPAWN_X.length];
    const e = this.makeFighter(kind, 'enemy', x, SPAWN_Z);
    e.hp = e.maxHp = Math.round(e.maxHp * (1 + W.healthGrowth * n));
    e.dmgMul = 1 + W.damageGrowth * n;
    e.entryZ = W.entryZ + rand(-0.4, 0.4);
    e.circleR = rand(CONFIG.ai.circleMin, CONFIG.ai.circleMax);
    e.strafeDir = Math.random() < 0.5 ? -1 : 1;
    e.cooldown = rand(0.2, 1.0);
    this.fighters.push(e);
  }
}
