// Draws a run. Crows are drawn as instanced body parts (one draw call per part for the whole swarm,
// plus one for its outline), so 100+ on screen stay smooth on older iPhones.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { S } from './config.js';
import { PROPS } from './sim.js';
import { build } from '../view/registry.js';
import { Sfx } from '../view/sfx.js';

const lerp = (a, b, t) => a + (b - a) * t;
const MAX = 160;

let gradient = null;
function toon(color) {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([70, 160, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
  }
  return new THREE.MeshToonMaterial({ color, gradientMap: gradient });
}

// One person built from parts, each an InstancedMesh shared by every Crow.
const PARTS = [
  // name, geometry, pivot (hinge, metres at scale 1), offset from the hinge, colour role
  ['torso', () => new THREE.CapsuleGeometry(0.19, 0.2, 4, 8), [0, 0.8, 0], [0, 0.29, 0], 'body'],
  ['head', () => new THREE.CapsuleGeometry(0.13, 0.06, 4, 8), [0, 0.8, 0], [0, 0.69, 0], 'skin'],
  ['visor', () => new THREE.BoxGeometry(0.22, 0.07, 0.08), [0, 0.8, 0], [0, 0.73, 0.11], 'visor'],
  ['armL', () => new THREE.BoxGeometry(0.11, 0.56, 0.11), [0.28, 1.28, 0], [0, -0.28, 0], 'body'],
  ['armR', () => new THREE.BoxGeometry(0.11, 0.56, 0.11), [-0.28, 1.28, 0], [0, -0.28, 0], 'body'],
  ['legL', () => new THREE.BoxGeometry(0.17, 0.8, 0.19), [0.11, 0.8, 0], [0, -0.4, 0], 'legs'],
  ['legR', () => new THREE.BoxGeometry(0.17, 0.8, 0.19), [-0.11, 0.8, 0], [0, -0.4, 0], 'legs'],
];

class Swarm {
  constructor(scene) {
    this.parts = PARTS.map(([name, geo, pivot, offset, role]) => {
      const g = geo();
      const mesh = new THREE.InstancedMesh(g, toon(0xffffff), MAX);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
      mesh.castShadow = true; mesh.frustumCulled = false; mesh.count = 0;
      const line = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0x0b0b10, side: THREE.BackSide }), MAX);
      line.frustumCulled = false; line.count = 0;
      g.computeBoundingBox();
      const size = g.boundingBox.getSize(new THREE.Vector3());
      const t = 0.022;
      const grow = new THREE.Vector3(1 + (2 * t) / size.x, 1 + (2 * t) / size.y, 1 + (2 * t) / size.z);
      scene.add(mesh, line);
      return { name, mesh, line, pivot: new THREE.Vector3(...pivot), offset: new THREE.Vector3(...offset), role, grow };
    });
    this.m = new THREE.Matrix4(); this.p = new THREE.Matrix4(); this.q = new THREE.Quaternion();
    this.e = new THREE.Euler(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3(); this.c = new THREE.Color();
    this.white = new THREE.Color(0xffffff);
    this.tr = new THREE.Matrix4(); this.mat = new THREE.Matrix4(); this.mat2 = new THREE.Matrix4(); // reused every frame: no garbage
    this.skin = new THREE.Color(0xc9a27e); this.legs = new THREE.Color(0x23262e); this.visor = new THREE.Color(0xd7e0f0);
  }

  draw(enemies, alpha, now) {
    let i = 0;
    for (const e of enemies) {
      if (i >= MAX) break;
      const E = S.enemies[e.kind];
      const x = lerp(e.px, e.x, alpha), z = lerp(e.pz, e.z, alpha);
      let sc = E.scale, lean = 0, fall = 0, sink = 0;
      if (e.dead) { fall = Math.min(1, e.deadT / 0.25); sink = Math.max(0, (e.deadT - 0.3) / 0.3); sc *= 1 - sink * 0.6; }
      if (e.hurtT > 0) lean = -0.35;
      if (e.windup > 0) lean = -0.5; // boss rears back before the smash
      const swing = Math.sin(e.walk) * 0.7 * (e.dead ? 0 : 1);
      const armUp = e.kind === 'thrower' && e.throwT < 0.5 ? -2.6 : 0;
      const base = this.m.compose(
        this.v.set(x, 0, z),
        this.q.setFromEuler(this.e.set(-Math.PI / 2 * fall + lean * (1 - fall), e.yaw, 0, 'YXZ')),
        this.s.set(sc, sc, sc),
      );
      const flash = e.flash > 0 ? 1 : 0;
      for (const part of this.parts) {
        let rx = 0;
        if (part.name === 'legL') rx = swing; else if (part.name === 'legR') rx = -swing;
        else if (part.name === 'armL') rx = -swing * 0.6 - 0.5 + (e.windup > 0 ? -2.4 : 0);
        else if (part.name === 'armR') rx = swing * 0.6 - 0.5 + armUp + (e.windup > 0 ? -2.4 : 0);
        this.p.compose(part.pivot, this.q.setFromEuler(this.e.set(rx, 0, 0)), this.s.set(1, 1, 1));
        this.p.multiply(this.tr.makeTranslation(part.offset.x, part.offset.y, part.offset.z));
        const mat = this.mat.multiplyMatrices(base, this.p);
        part.mesh.setMatrixAt(i, mat);
        part.line.setMatrixAt(i, this.mat2.copy(mat).scale(part.grow));
        const col = part.role === 'body' ? this.c.setHex(E.color) : part.role === 'skin' ? this.c.copy(this.skin) : part.role === 'legs' ? this.c.copy(this.legs) : this.c.copy(this.visor);
        if (flash) col.lerp(this.white, 0.75);
        part.mesh.setColorAt(i, col);
      }
      i++;
    }
    for (const part of this.parts) {
      part.mesh.count = part.line.count = i;
      part.mesh.instanceMatrix.needsUpdate = part.line.instanceMatrix.needsUpdate = true;
      if (part.mesh.instanceColor) part.mesh.instanceColor.needsUpdate = true;
    }
  }
}

export class RunView {
  constructor(container, run) {
    this.run = run;
    Object.assign(CONFIG.arena, S.arena); // the shared roof and wall builders read these
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x8a4f6e, 45, 120);
    this.camera = new THREE.PerspectiveCamera(S.camera.fov, 1, 0.1, 300);
    const sun = this.sun = new THREE.DirectionalLight(0xffe2c0, 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 16, bottom: -14, near: 1, far: 50 });
    sun.shadow.bias = -0.0005;
    scene.add(sun, sun.target);
    scene.add(new THREE.HemisphereLight(0xb9a6ff, 0x4a3a40, 0.95));
    scene.add(build('sky'), build('roof'), build('parapet'));
    this.addNeighbourhood(scene);
    for (const p of PROPS) { const o = build(p.id); o.position.set(p.x, 0, p.z); o.rotation.y = p.yaw || 0; scene.add(o); }

    this.juno = build('juno');
    // a bright ring under Juno so she never gets lost in the crowd
    const marker = this.juno.userData.parts.state_ring;
    marker.material.color.setHex(0xffd23f); marker.material.opacity = 0.95; marker.scale.set(1.25, 1, 1.25);
    scene.add(this.juno);
    this.swarm = new Swarm(scene);

    // coins, wrenches, pipes
    const coinGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 14);
    this.coins = new THREE.InstancedMesh(coinGeo, toon(0xffc93c), 400);
    this.coins.material.emissive = new THREE.Color(0x6b4a00);
    this.coins.frustumCulled = false; scene.add(this.coins);
    this.cans = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 12), toon(0xe0342c), 40);
    this.cans.frustumCulled = false; scene.add(this.cans);
    const wrenchGeo = new THREE.BoxGeometry(0.34, 0.06, 0.1);
    this.wrenches = new THREE.InstancedMesh(wrenchGeo, toon(0xc4ccd6), 64);
    this.wrenches.frustumCulled = false; scene.add(this.wrenches);
    this.pipes = [];
    for (let i = 0; i < 4; i++) { const p = build('pipe'); p.scale.setScalar(0.8); p.visible = false; scene.add(p); this.pipes.push(p); }

    // rings: stomp shockwave, boss smash warning
    const ring = (color) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.03; scene.add(m); return m;
    };
    this.stompRing = ring(0x7fe0ff); this.stompT = 0;
    this.warnRing = ring(0xff4a4a);
    this.warnFill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0, depthWrite: false }));
    this.warnFill.rotation.x = -Math.PI / 2; this.warnFill.position.y = 0.02; scene.add(this.warnFill);

    this.sparks = [];
    const sg = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    for (let i = 0; i < 60; i++) { const s = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xffe14d })); s.visible = false; s.userData = { life: 0 }; scene.add(s); this.sparks.push(s); }

    this.shake = 0; this.camX = 0; this.camZ = 2; this.hurtFlash = 0;
    this.sfx = new Sfx();
    this.tmp = new THREE.Object3D();
    run.on((ev) => this.onEvent(ev));
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // Other rooftops lower down and the street far below, so the view past the edge reads as a city.
  addNeighbourhood(scene) {
    const A = S.arena;
    const street = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshBasicMaterial({ color: 0x1b1530 }));
    street.rotation.x = -Math.PI / 2; street.position.y = -16; scene.add(street);
    const n = 46, geo = new THREE.BoxGeometry(1, 1, 1);
    const roofs = new THREE.InstancedMesh(geo, toon(0xffffff), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const tones = [0x5b4f6c, 0x4a4060, 0x6a5878, 0x3f3652];
    let i = 0;
    for (let ring = 0; ring < 2; ring++) {
      for (let k = 0; k < 23 && i < n; k++) {
        const a = (k / 23) * Math.PI * 2 + ring * 0.13;
        const rx = A.width / 2 + 7 + ring * 12 + rnd() * 4, rz = A.depth / 2 + 7 + ring * 12 + rnd() * 4;
        const w = 7 + rnd() * 6, d = 7 + rnd() * 6, top = -2.5 - ring * 3 - rnd() * 5;
        p.set(Math.cos(a) * rx, (top - 16) / 2, Math.sin(a) * rz);
        sc.set(w, top + 16, d);
        roofs.setMatrixAt(i, m.compose(p, q, sc));
        roofs.setColorAt(i, c.setHex(tones[Math.floor(rnd() * tones.length)]));
        i++;
      }
    }
    roofs.count = i;
    scene.add(roofs);
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  burst(x, y, z, n, color, speed = 3) {
    let used = 0;
    for (const s of this.sparks) {
      if (s.userData.life > 0) continue;
      const a = Math.random() * Math.PI * 2, sp = speed * (0.5 + Math.random());
      Object.assign(s.userData, { vx: Math.cos(a) * sp, vy: 1.5 + Math.random() * 3, vz: Math.sin(a) * sp, life: 0.3 });
      s.material.color.setHex(color); s.position.set(x, y, z); s.visible = true;
      if (++used >= n) break;
    }
  }

  onEvent(ev) {
    const F = S.feel;
    switch (ev.type) {
      case 'swing':
        if (ev.hits) this.sfx.hit(ev.move === 'kick' || !!ev.combo); else this.sfx.whoosh(true);
        if (ev.combo) { this.shake = Math.max(this.shake, ev.hits ? F.bigShake : F.shake); this.burst(ev.x, 0.4, ev.z, 14, 0xff5a3c, 5); }
        else if (ev.move === 'kick' && ev.hits) this.shake = Math.max(this.shake, F.shake);
        break;
      case 'hit': if (ev.source === 'wrench' || ev.source === 'pipe') this.sfx.hit(false); this.burst(ev.x, 1.1, ev.z, ev.source === 'kick' ? 5 : 3, 0xffe14d); break;
      case 'kill': this.burst(ev.x, 1, ev.z, ev.kind === 'boss' ? 30 : ev.kind === 'brute' ? 14 : 6, ev.kind === 'boss' ? 0xff7a2a : 0xfff6e0, ev.kind === 'boss' ? 6 : 3.5); if (ev.kind === 'boss' || ev.kind === 'brute') { this.shake = Math.max(this.shake, F.bigShake); this.sfx.boom?.(); } break;
      case 'hurt': this.shake = Math.max(this.shake, F.shake * 1.3); this.hurtFlash = 1; this.sfx.hit(true); break;
      case 'coin': this.sfx.coin(); break;
      case 'roll': this.sfx.whoosh(true); this.burst(ev.x, 0.15, ev.z, 6, 0xc9bfae, 2); break;
      case 'stomp': this.stompT = 0.35; this.stompR = ev.r; this.stompRing.position.set(ev.x, 0.03, ev.z); this.shake = Math.max(this.shake, F.shake); this.sfx.boom?.(); break;
      case 'smash': this.shake = Math.max(this.shake, F.bigShake * 1.2); this.burst(ev.x, 0.3, ev.z, 20, 0x9aa5b1, 6); this.sfx.boom?.(); break;
      case 'levelup': case 'chose': this.sfx.chime(false); break;
      case 'boss': this.sfx.chime(true); break;
      case 'dead': this.sfx.lose(); break;
      case 'won': this.sfx.chime(true); break;
    }
  }

  render(alpha, dt, now) {
    const r = this.run, j = r.juno;
    const jx = lerp(j.px, j.x, alpha), jz = lerp(j.pz, j.z, alpha);

    // Juno
    const o = this.juno, P = o.userData.parts;
    o.position.set(jx, 0, jz); o.rotation.y = j.yaw;
    this.stride = (this.stride || 0) + j.speedNow * dt * 2.4;
    const s = Math.sin(this.stride), amp = Math.min(1, j.speedNow / 3) * 0.8;
    P.leg_l.rotation.x = s * amp; P.leg_r.rotation.x = -s * amp;
    P.body.rotation.set(0.05 + amp * 0.12, 0, 0);
    P.arm_l.rotation.set(-0.75 - s * amp * 0.3, 0, 0.12); P.arm_r.rotation.set(-0.75 + s * amp * 0.3, 0, -0.12);
    if (j.swing > 0) {
      const u = 1 - j.swing / j.swingTime, k = Math.sin(u * Math.PI); // 0 → 1 → 0 over the move
      switch (j.swingMove) {
        case 'punch':
          if (j.swingSide === 0) { P.arm_l.rotation.set(-1.6 * k - 0.75 * (1 - k), 0, 0.12); P.body.rotation.y = -0.35 * k; }
          else { P.arm_r.rotation.set(-1.6 * k - 0.75 * (1 - k), 0, -0.12); P.body.rotation.y = 0.4 * k; }
          break;
        case 'kick': P.leg_r.rotation.x = -1.5 * k; P.body.rotation.x = -0.25 * k; break;
        case 'TRIPLE JAB': P.arm_l.rotation.set(-1.65 * k, 0, -0.1); P.arm_r.rotation.set(-1.65 * k, 0, 0.1); P.body.rotation.x = 0.2 * k; break;
        case 'ROUNDHOUSE': o.rotation.y = j.yaw + u * Math.PI * 2; P.leg_r.rotation.set(-1.2 * k, 0, 1.2 * k); P.body.rotation.z = -0.3 * k; break;
        case 'UPPERCUT': P.arm_r.rotation.set(-0.3 - 2.7 * u, 0, -0.1); P.body.rotation.x = -0.35 * k; o.position.y = 0.45 * k; break;
        case 'DROP KICK': P.leg_l.rotation.x = P.leg_r.rotation.x = -1.4 * k; P.body.rotation.x = -0.6 * k; o.position.y = 0.6 * k; break;
        case 'FURY': o.rotation.y = j.yaw + u * Math.PI * 4; P.arm_l.rotation.set(-0.3, 0, 1.5 * k); P.arm_r.rotation.set(-0.3, 0, -1.5 * k); o.position.y = 0.3 * k; break;
      }
    }
    if (j.rollT > 0) { // somersault: tuck and spin forward once
      const k = 1 - j.rollT / S.juno.roll.time;
      P.pose.rotation.set(k * Math.PI * 2, 0, 0); P.pose.position.y = Math.sin(k * Math.PI) * 0.35 + 0.35;
      P.arm_l.rotation.set(-2.4, 0, 0.3); P.arm_r.rotation.set(-2.4, 0, -0.3); P.leg_l.rotation.x = P.leg_r.rotation.x = -1.6;
    }
    P.pose.visible = j.rollT > 0 || !(j.iframes > 0 && Math.floor(now * 16) % 2 === 0);
    for (const m of o.userData.materials) m.emissive.setRGB(this.hurtFlash > 0.5 ? 0.6 : 0, 0, 0); // red when hit
    if (r.phase === 'dead') { P.pose.rotation.x = -Math.PI / 2 * 0.95; P.pose.position.y = 0.12; P.pose.visible = true; }
    else if (j.rollT <= 0) { P.pose.rotation.x = 0; P.pose.position.y = r.phase === 'won' ? Math.abs(Math.sin(now * 6)) * 0.2 : Math.abs(Math.cos(this.stride)) * 0.04 * amp; }
    if (r.phase === 'won') { P.arm_l.rotation.set(-2.9, 0, 0.3); P.arm_r.rotation.set(-2.9, 0, -0.3); }

    this.swarm.draw(r.enemies, alpha, now);

    // coins
    let n = 0, cans = 0;
    for (const c of r.coins) {
      if (c.heal) { // soda can: stands up and bobs
        if (cans >= 40) continue;
        this.tmp.position.set(lerp(c.px, c.x, alpha), lerp(c.py, c.y, alpha) + 0.22 + Math.sin(now * 4 + cans) * 0.06, lerp(c.pz, c.z, alpha));
        this.tmp.rotation.set(0, now * 2, 0); this.tmp.scale.setScalar(1);
        this.tmp.updateMatrix(); this.cans.setMatrixAt(cans++, this.tmp.matrix);
        continue;
      }
      if (n >= 400) break;
      this.tmp.position.set(lerp(c.px, c.x, alpha), lerp(c.py, c.y, alpha) + 0.16, lerp(c.pz, c.z, alpha));
      this.tmp.rotation.set(Math.PI / 2, 0, now * 5 + n);
      const sc = 0.8 + Math.min(1.2, c.value * 0.25);
      this.tmp.scale.setScalar(sc);
      this.tmp.updateMatrix(); this.coins.setMatrixAt(n++, this.tmp.matrix);
    }
    this.coins.count = n; this.coins.instanceMatrix.needsUpdate = true;
    this.cans.count = cans; this.cans.instanceMatrix.needsUpdate = true;

    // wrenches in the air (thrown by Crows and by Juno)
    n = 0;
    for (const w of [...r.shots, ...r.tosses]) {
      if (n >= 64) break;
      this.tmp.position.set(lerp(w.px, w.x, alpha), w.y !== undefined ? lerp(w.py, w.y, alpha) : 1.0, lerp(w.pz, w.z, alpha));
      this.tmp.rotation.set(0, now * 12, now * 14); this.tmp.scale.setScalar(1);
      this.tmp.updateMatrix(); this.wrenches.setMatrixAt(n++, this.tmp.matrix);
    }
    this.wrenches.count = n; this.wrenches.instanceMatrix.needsUpdate = true;

    // orbiting pipes
    const pipes = Math.min(4, r.lv('pipes'));
    this.pipes.forEach((p, i) => {
      p.visible = i < pipes;
      if (!p.visible) return;
      const a = j.pipeAngle + (i / pipes) * Math.PI * 2;
      p.position.set(jx + Math.sin(a) * 1.9, 1.0, jz + Math.cos(a) * 1.9);
      p.rotation.set(0, a + Math.PI / 2, 0);
    });

    // rings
    this.stompT = Math.max(0, this.stompT - dt);
    const sk = 1 - this.stompT / 0.35;
    this.stompRing.scale.setScalar(0.3 + (this.stompR || 2) * sk);
    this.stompRing.material.opacity = this.stompT > 0 ? 0.9 * (1 - sk) : 0;
    const boss = r.enemies.find((e) => e.kind === 'boss' && e.windup > 0 && !e.dead);
    if (boss) {
      const R = S.enemies.boss.smashRadius, k = 1 - boss.windup / S.enemies.boss.smashWindup;
      this.warnRing.position.set(boss.x, 0.03, boss.z); this.warnRing.scale.setScalar(R); this.warnRing.material.opacity = 0.9;
      this.warnFill.position.set(boss.x, 0.02, boss.z); this.warnFill.scale.setScalar(R * k); this.warnFill.material.opacity = 0.35;
    } else { this.warnRing.material.opacity = 0; this.warnFill.material.opacity = 0; }

    for (const sp of this.sparks) {
      const u = sp.userData;
      if (u.life <= 0) continue;
      u.life -= dt; u.vy -= 12 * dt;
      sp.position.x += u.vx * dt; sp.position.y += u.vy * dt; sp.position.z += u.vz * dt;
      sp.scale.setScalar(Math.max(0.1, u.life / 0.3));
      if (u.life <= 0) sp.visible = false;
    }

    // camera: low and angled, behind and above Juno, looking ahead across the roof
    const C = S.camera, cam = this.camera, A = S.arena, portrait = cam.aspect < 1;
    const h = portrait ? C.height : C.landscapeHeight, back = portrait ? C.back : C.landscapeBack;
    const fov = portrait ? C.fov : C.landscapeFov;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const f = 1 - Math.exp(-C.damping * dt);
    this.camX += (Math.max(-A.width / 2 + 3, Math.min(A.width / 2 - 3, jx)) - this.camX) * f;
    this.camZ += (Math.max(-A.depth / 2 + C.edgeMargin, Math.min(A.depth / 2 - 2, jz)) - this.camZ) * f;
    this.shake = Math.max(0, this.shake - dt * 1.5);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 4);
    const sh = this.shake * this.shake * 3;
    cam.position.set(this.camX * 0.85 + (Math.random() - 0.5) * sh, h + (Math.random() - 0.5) * sh, this.camZ + back);
    cam.lookAt(this.camX, 0.6, this.camZ - C.ahead);
    this.sun.position.set(this.camX - 6, 14, this.camZ + 4);
    this.sun.target.position.set(this.camX, 0, this.camZ - 3);
    this.renderer.render(this.scene, cam);
  }

  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, behind: v.z > 1 };
  }
}
