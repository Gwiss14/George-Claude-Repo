// Draws the game state. Reads gameplay, never changes it.
// Positions are interpolated between fixed gameplay steps, so motion is smooth at 60, 120 or 144 Hz.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { PROPS, WEAPON_PADS } from '../game/level.js';
import { stateLabel } from '../game/game.js';
import { build, attach } from './registry.js';
import { posePlaceholder } from './placeholderPose.js';
import { Sfx } from './sfx.js';

const wrap = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };

export class View {
  constructor(container, game) {
    this.game = game;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x8a4f6e, 40, 110);
    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 300);
    this.camX = 0; this.camZ = 0;

    // one main light that casts shadows, a little fill so shadows are not pitch black
    const sun = new THREE.DirectionalLight(0xffe2c0, 2.4);
    sun.position.set(-6, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: 1, far: 40 });
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0xb9a6ff, 0x4a3a40, 0.9));

    this.scene.add(build('sky'));
    this.scene.add(build('roof'));
    this.scene.add(build('parapet'));
    this.props = [];
    for (const p of PROPS) {
      const o = build(p.id);
      o.position.set(p.x, 0, p.z);
      o.rotation.y = p.yaw;
      this.scene.add(o);
      this.props.push({ obj: o, def: p });
    }

    // the weapons spot: pads on the floor, each weapon turning slowly above its pad
    this.padWeapons = [];
    for (const p of WEAPON_PADS) {
      const pad = build('weapon_pad'); pad.position.set(p.x, 0, p.z); this.scene.add(pad);
      const w = build(p.weapon);
      const holder = new THREE.Group();
      holder.position.set(p.x, 1.25, p.z);
      w.rotation.x = -Math.PI / 2; // stand it up, grip at the bottom
      w.position.y = -0.5;          // and spin it around its middle
      holder.add(w);
      this.scene.add(holder);
      this.padWeapons.push({ holder, pad, weapon: p.weapon });
    }
    this.coins = new Map(); // coin id -> obj

    this.fighters = new Map(); // uid -> { obj, vis }
    this.sparks = this.makeSparks();
    this.shake = 0;
    this.sfx = new Sfx();
    this.debugShapes = false;
    this.debugGroup = new THREE.Group();
    this.scene.add(this.debugGroup);

    game.on((ev) => this.onEvent(ev));
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  onEvent(ev) {
    if (ev.type === 'reset') {
      for (const { obj } of this.fighters.values()) this.scene.remove(obj);
      this.fighters.clear();
      for (const o of this.coins.values()) this.scene.remove(o);
      this.coins.clear();
    } else if (ev.type === 'combo') {
      this.burst(ev.x, 1.3, ev.z, 18, 0xffffff);
      this.shake = Math.max(this.shake, 0.25);
      this.sfx.combo();
    } else if (ev.type === 'coin') {
      this.sfx.coin();
    } else if (ev.type === 'buy') {
      this.sfx.chime(false);
    } else if (ev.type === 'buyFail') {
      this.sfx.nope();
    } else if (ev.type === 'weaponBreak') {
      const j = this.game.juno;
      this.burst(j.x, 1.2, j.z, 10, 0x9aa5b1);
      this.sfx.snap();
    } else if (ev.type === 'hit') {
      const v = this.fighters.get(ev.target);
      if (v) v.vis.flash = CONFIG.look.flashTime;
      const big = ev.attack === 'junoKick' || ev.attack === 'grudgeSmash';
      this.burst(ev.x, 1.15, ev.z, big ? 12 : 7, ev.targetTeam === 'player' ? 0xff5050 : 0xffe14d);
      this.shake = Math.max(this.shake, big ? 0.18 : 0.07);
      this.sfx.hit(big);
    } else if (ev.type === 'roll') {
      this.sfx.roll();
    } else if (ev.type === 'dodged') {
      this.burst(ev.x, 0.6, ev.z, 6, 0x7fe0ff);
      this.sfx.dodged();
    } else if (ev.type === 'attackStart') {
      this.sfx.whoosh(ev.team === 'player');
    } else if (ev.type === 'wave' || ev.type === 'won') {
      this.sfx.chime(ev.type === 'won');
    } else if (ev.type === 'lost') {
      this.sfx.lose();
    }
  }

  makeSparks() {
    const geo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
    const list = [];
    for (let i = 0; i < 36; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffe14d }));
      m.visible = false;
      m.userData = { vx: 0, vy: 0, vz: 0, life: 0 };
      this.scene.add(m);
      list.push(m);
    }
    return list;
  }

  burst(x, y, z, n, color) {
    let used = 0;
    for (const s of this.sparks) {
      if (s.userData.life > 0) continue;
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3;
      Object.assign(s.userData, { vx: Math.cos(a) * sp, vy: 1 + Math.random() * 3, vz: Math.sin(a) * sp, life: 0.25 });
      s.material.color.setHex(color);
      s.position.set(x, y, z);
      s.visible = true;
      if (++used >= n) break;
    }
  }

  sync() {
    const seen = new Set();
    for (const f of this.game.fighters) {
      seen.add(f.uid);
      if (!this.fighters.has(f.uid)) {
        const obj = build(f.kind);
        this.scene.add(obj);
        this.fighters.set(f.uid, { obj, vis: { stride: 0, flash: 0, fade: 1, fading: false } });
      }
    }
    for (const [uid, v] of this.fighters) {
      if (!seen.has(uid)) { this.scene.remove(v.obj); this.fighters.delete(uid); }
    }
  }

  render(alpha, dt, now) {
    this.sync();
    let jx = 0, jz = 0;
    for (const f of this.game.fighters) {
      const { obj, vis } = this.fighters.get(f.uid);
      const x = f.px + (f.x - f.px) * alpha, z = f.pz + (f.z - f.pz) * alpha;
      const yaw = f.pyaw + wrap(f.yaw - f.pyaw) * alpha;
      obj.position.set(x, 0, z);
      obj.rotation.y = yaw;
      if (f.team === 'player') { jx = x; jz = z; }
      if (vis.weapon !== f.weapon) { attach(obj, 'hand_r', f.weapon); vis.weapon = f.weapon; }
      const label = stateLabel(f);
      posePlaceholder(obj, f, label, vis, dt, now);

      // hit flash: brighten the fighter's own colours briefly
      vis.flash = Math.max(0, vis.flash - dt);
      const fl = vis.flash > 0 ? 0.55 : 0;
      for (const m of obj.userData.materials) m.emissive.setScalar(fl);

      // defeated enemies fade out
      const fade = f.team === 'enemy' && f.state === 'defeated' ? Math.max(0, 1 - Math.max(0, f.stateTime - 1.2) / 0.7) : 1;
      if (fade !== vis.fade) {
        vis.fade = fade;
        for (const m of [...obj.userData.materials, obj.userData.outlineMaterial]) {
          m.transparent = fade < 1; m.opacity = fade; m.depthWrite = fade >= 1;
        }
      }
    }

    // coins
    const seen = new Set();
    for (const c of this.game.coins) {
      seen.add(c.id);
      let o = this.coins.get(c.id);
      if (!o) { o = build('coin'); this.scene.add(o); this.coins.set(c.id, o); }
      o.position.set(c.px + (c.x - c.px) * alpha, c.py + (c.y - c.py) * alpha, c.pz + (c.z - c.pz) * alpha);
      o.rotation.y = now * 4 + c.id;
      const left = CONFIG.coins.life - c.age;
      o.visible = left > 3 || Math.floor(now * 8) % 2 === 0;
    }
    for (const [id, o] of this.coins) if (!seen.has(id)) { this.scene.remove(o); this.coins.delete(id); }
    for (const p of this.padWeapons) {
      // locked pads are dim and empty until their wave is cleared
      const open = this.game.unlocked(p.weapon);
      p.holder.visible = open;
      p.holder.rotation.y = now * 1.2;
      p.pad.children[0].material.opacity = open ? 1 : 0.3;
    }

    for (const s of this.sparks) {
      const u = s.userData;
      if (u.life <= 0) continue;
      u.life -= dt;
      u.vy -= 12 * dt;
      s.position.x += u.vx * dt; s.position.y += u.vy * dt; s.position.z += u.vz * dt;
      s.scale.setScalar(Math.max(0.1, u.life / 0.25));
      if (u.life <= 0) s.visible = false;
    }

    this.updateCamera(jx, jz, dt);
    if (this.debugShapes) this.drawDebugShapes();
    this.renderer.render(this.scene, this.camera);
  }

  updateCamera(jx, jz, dt) {
    const C = CONFIG.camera, cam = this.camera;
    if (cam.fov !== C.fov) { cam.fov = C.fov; cam.updateProjectionMatrix(); }
    const portrait = cam.aspect < 1;
    const fit = portrait ? C.fitWidthPortrait : C.fitWidth;
    const half = Math.atan(Math.tan((C.fov * Math.PI) / 360) * cam.aspect);
    const base = Math.hypot(C.height * (portrait ? C.portraitTilt : 1), C.back);
    const need = fit / 2 / Math.tan(half);
    const k = Math.max(1, need / base);
    const follow = portrait ? 1 : C.follow;
    const A = CONFIG.arena;
    const tx = Math.max(-A.width / 2 + fit / 2, Math.min(A.width / 2 - fit / 2, jx * follow)) || 0;
    const tz = jz * C.followZ;
    const s = 1 - Math.exp(-C.damping * dt);
    this.camX += (tx - this.camX) * s;
    this.camZ += (tz - this.camZ) * s;
    this.shake = Math.max(0, this.shake - dt * 1.2);
    const sh = this.shake * this.shake * 4;
    const ox = (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh;
    const hgt = C.height * (portrait ? C.portraitTilt : 1);
    cam.position.set(this.camX + ox, hgt * k + oy, C.lookAtZ + this.camZ + C.back * k);
    cam.lookAt(this.camX, 0.6, C.lookAtZ + this.camZ);
  }

  // Screen position (CSS pixels) of a point in the world, for comic text pop-ups.
  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, behind: v.z > 1 };
  }

  // Debug: collision circles (what gameplay uses) and bounding boxes (what is drawn).
  setDebugShapes(on) {
    this.debugShapes = on;
    this.debugGroup.visible = on;
    if (!on) this.debugGroup.clear();
  }

  drawDebugShapes() {
    this.debugGroup.clear();
    const ringGeo = (r) => {
      const pts = [];
      for (let i = 0; i <= 32; i++) { const a = (i / 32) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0.03, Math.sin(a) * r)); }
      return new THREE.BufferGeometry().setFromPoints(pts);
    };
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff88 });
    for (const f of this.game.fighters) {
      const v = this.fighters.get(f.uid);
      if (!v) continue;
      const l = new THREE.Line(ringGeo(f.radius), lineMat); l.position.set(v.obj.position.x, 0, v.obj.position.z);
      this.debugGroup.add(l);
      this.debugGroup.add(new THREE.Box3Helper(new THREE.Box3().setFromObject(v.obj, true), 0xffff00));
    }
    for (const s of this.game.solids) {
      if (s.type === 'circle') {
        const l = new THREE.Line(ringGeo(s.r), lineMat); l.position.set(s.x, 0, s.z); this.debugGroup.add(l);
      } else {
        const b = new THREE.Box3(new THREE.Vector3(s.x - s.hx, 0, s.z - s.hz), new THREE.Vector3(s.x + s.hx, 0.05, s.z + s.hz));
        this.debugGroup.add(new THREE.Box3Helper(b, 0x00ff88));
      }
    }
  }

  // Measured size (metres) of each fighter's body as drawn: no outline shells, no floor ring.
  measure(uid) {
    const v = this.fighters.get(uid);
    if (!v) return null;
    const box = new THREE.Box3(), tmp = new THREE.Box3();
    v.obj.updateMatrixWorld(true);
    v.obj.userData.parts.pose.traverse((o) => {
      if (!o.isMesh || o.userData.isOutline) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.union(tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
    });
    return box.getSize(new THREE.Vector3());
  }
}
