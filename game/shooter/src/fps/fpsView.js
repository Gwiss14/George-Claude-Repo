// First-person drawing on top of the shared View: the camera sits in Juno's eyes, her own body is
// hidden, and the gun in her hand is drawn in front of the camera.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { View } from '../view/view.js';
import { build } from '../view/registry.js';
import { POWER_STATION, POWER_PADS, UPGRADE_BENCH, UPGRADE_PAD } from './setup.js';
import { Zombies } from './zombies.js';

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

export class FpsView extends View {
  constructor(container, game) {
    super(container, game);
    const cam = this.camera;
    cam.near = 0.03;
    cam.rotation.order = 'YXZ';
    this.scene.add(cam);

    // The gun in hand lives in its own little scene, drawn after the world with the depth cleared,
    // so it keeps its outline and never sinks into a wall.
    this.vmScene = new THREE.Scene();
    this.vmCamera = new THREE.PerspectiveCamera(60, 1, 0.01, 10);
    this.vmScene.add(new THREE.HemisphereLight(0xb9a6ff, 0x4a3a40, 1.1));
    const key = new THREE.DirectionalLight(0xffe2c0, 2.2); key.position.set(-1, 2, 1.5); this.vmScene.add(key);
    this.hand = new THREE.Group();
    this.vmScene.add(this.hand);
    this.guns = {};
    this.shownGun = null;
    this.kick = 0; this.bob = 0; this.flashTime = 0; this.hurtTilt = 0;
    const flash = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff0a0 }));
    flash.visible = false;
    this.muzzleFlash = flash;
    const light = new THREE.PointLight(0xffd27a, 0, 4); this.muzzleLight = light; this.vmScene.add(light);
    light.position.set(0.2, -0.15, -0.6);

    // weapons on the pads lie flat and turn, instead of standing up
    for (const p of this.padWeapons) {
      const w = p.holder.children[0];
      w.rotation.set(0, 0, 0);
      const len = new THREE.Box3().setFromObject(w).getSize(new THREE.Vector3()).z;
      w.position.set(0, 0, -len / 2);
      p.holder.position.y = 1.0;
    }

    this.buildPowerStation();
    this.zombies = new Zombies();

    this.tracers = [];
    this.thrown = new Map();
    this.booms = [];
    game.on((ev) => this.onFpsEvent(ev));
  }

  // the power-up station: a comic vending machine against the south wall, four glowing pads in front
  buildPowerStation() {
    const P = POWER_STATION, toon = (c, e = 0) => new THREE.MeshToonMaterial({ color: c, emissive: e });
    const ink = new THREE.MeshBasicMaterial({ color: 0x0b0b10, side: THREE.BackSide });
    const box = (w, h, d, mat, x, y, z, parent) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true;
      const o = new THREE.Mesh(m.geometry, ink); o.scale.setScalar(1.04); m.add(o);
      parent.add(m); return m;
    };
    const g = new THREE.Group(); g.position.set(P.x, 0, P.z); this.scene.add(g);
    box(P.hx * 2, P.height, P.hz * 2 + 0.2, toon(0x8e5bd6), 0, P.height / 2, 0.1, g); // the cabinet
    // sign
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const x = c.getContext('2d'); x.fillStyle = '#ffd23f'; x.fillRect(0, 0, 512, 96);
    x.font = 'bold 64px Bangers, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 6; x.strokeStyle = '#0b0b10'; x.strokeText('POWER-UPS', 256, 52); x.fillStyle = '#ff4a4a'; x.fillText('POWER-UPS', 256, 52);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(P.hx * 2 - 0.2, 0.42), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
    sign.position.set(0, P.height - 0.3, -0.16); sign.rotation.y = Math.PI; g.add(sign);
    this.powerPads = [];
    for (const pad of POWER_PADS) {
      const col = CONFIG.powerups[pad.power].color;
      // a glass window on the cabinet showing the item, and a pad on the floor
      box(0.6, 0.7, 0.05, toon(col, new THREE.Color(col).multiplyScalar(0.35)), pad.x - P.x, 0.95, -0.17, g);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 }));
      disc.position.set(pad.x, 0.02, pad.z); this.scene.add(disc);
      const gem = new THREE.Mesh(pad.power === 'health' ? new THREE.BoxGeometry(0.28, 0.28, 0.28) : new THREE.OctahedronGeometry(0.2),
        new THREE.MeshToonMaterial({ color: col, emissive: new THREE.Color(col).multiplyScalar(0.5) }));
      gem.position.set(pad.x, 1.0, pad.z); this.scene.add(gem);
      this.powerPads.push({ pad, disc, gem });
    }
    // the upgrade bench: a grey workbench with a big spanner, and its own pad
    const B = UPGRADE_BENCH, bench = new THREE.Group(); bench.position.set(B.x, 0, B.z); this.scene.add(bench);
    box(B.hx * 2, 0.9, B.hz * 2, toon(0x6b6f7a), 0, 0.45, 0, bench);
    box(0.7, 0.08, 0.12, toon(0xc9cdd6), 0, 0.95, 0, bench).rotation.y = 0.5;
    const bc = document.createElement('canvas'); bc.width = 256; bc.height = 64;
    const bx = bc.getContext('2d'); bx.fillStyle = '#c79bff'; bx.fillRect(0, 0, 256, 64);
    bx.font = 'bold 44px Bangers, Impact, sans-serif'; bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.fillStyle = '#0b0b10'; bx.fillText('UPGRADE', 128, 34);
    const bs = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc) }));
    bs.position.set(0, 1.35, 0); bs.rotation.y = Math.PI; bench.add(bs);
    const post = box(0.06, 0.45, 0.06, toon(0x6b6f7a), 0, 1.1, 0, bench);
    const benchDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0xc79bff, transparent: true, opacity: 0.85 }));
    benchDisc.position.set(UPGRADE_PAD.x, 0.02, UPGRADE_PAD.z); this.scene.add(benchDisc);
    this.benchDisc = benchDisc;
    // dropped power-ups: one shape per kind, cloned as they drop
    this.dropProtos = {};
    for (const [k, P] of Object.entries(CONFIG.powerups)) {
      this.dropProtos[k] = new THREE.Mesh(k === 'health' ? new THREE.BoxGeometry(0.3, 0.3, 0.3) : new THREE.OctahedronGeometry(0.22),
        new THREE.MeshToonMaterial({ color: P.color, emissive: new THREE.Color(P.color).multiplyScalar(0.6) }));
    }
    this.drops = new Map();
  }

  gunModel(id) {
    if (!this.guns[id]) {
      const g = build(id);
      g.traverse((o) => { o.castShadow = false; });
      g.rotation.y = Math.PI; // the camera looks down -Z
      g.scale.setScalar(0.6); // in-hand size: keeps the outline thin this close to the eye
      this.guns[id] = g;
    }
    return this.guns[id];
  }

  onFpsEvent(ev) {
    if (ev.type === 'powerBuy') { this.burst(ev.x, 1.0, ev.z, 12, CONFIG.powerups[ev.power]?.color ?? 0xffd23f); this.sfx.chime(); } // ammo has no power-up colour
    if (ev.type === 'powerFail') this.sfx.nope();
    if (ev.type === 'upgrade') { this.burst(ev.x, 1.0, ev.z, 14, 0xc79bff); this.sfx.chime(); }
    if (ev.type === 'pickup') { this.burst(ev.x, 0.6, ev.z, 10, CONFIG.powerups[ev.power].color); this.sfx.coin(); }
    if (ev.type === 'reset') { for (const o of this.drops?.values() || []) this.scene.remove(o); this.drops?.clear(); }
    if (ev.type === 'reset') { for (const o of this.thrown.values()) this.scene.remove(o); this.thrown.clear(); }
    if (ev.type === 'shot') {
      this.kick = Math.min(1, this.kick + (ev.gun === 'shotgun' || ev.gun === 'launcher' ? 1 : ev.gun === 'rifle' ? 0.8 : 0.35));
      this.flashTime = 0.045;
      this.sfx.shot(ev.gun);
      // the muzzle sits in the gun's own scene, which shares the camera's view: carry it into the world
      const muzzle = new THREE.Vector3();
      (this.guns[ev.gun]?.userData.parts.muzzle ?? this.hand).getWorldPosition(muzzle);
      this.camera.updateMatrixWorld();
      muzzle.applyMatrix4(this.camera.matrixWorld);
      for (const end of ev.ends) {
        if (ev.gun === 'launcher') continue;
        const geo = new THREE.BufferGeometry().setFromPoints([muzzle, new THREE.Vector3(end.x, end.y, end.z)]);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xfff3b0, transparent: true }));
        this.scene.add(line);
        this.tracers.push({ line, life: 0.06 });
        this.burst(end.x, end.y, end.z, 2, 0xdcd2c0);
      }
    } else if (ev.type === 'boom') {
      const ring = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.8 }));
      ring.position.set(ev.x, Math.max(0.3, ev.y), ev.z);
      this.scene.add(ring);
      this.booms.push({ ring, life: 0.35, radius: ev.radius });
      this.burst(ev.x, Math.max(0.4, ev.y), ev.z, 16, 0xffd23f);
      this.shake = Math.max(this.shake, 0.3);
      this.sfx.boom();
    } else if (ev.type === 'hit' && ev.targetTeam === 'player') {
      this.hurtTilt = 1;
    } else if (ev.type === 'reload') {
      this.sfx.reload();
    } else if (ev.type === 'throw') {
      this.sfx.whoosh(false);
    } else if (ev.type === 'thud') {
      this.burst(ev.x, ev.y, ev.z, 4, 0x9aa5b1);
    }
  }

  // hide Juno's own body: we are looking out of her eyes
  sync() {
    super.sync();
    const v = this.fighters.get(this.game.juno.uid);
    if (v) v.obj.visible = false;
  }

  render(alpha, dt, now) {
    const g = this.game;
    // thrown wrenches
    const seen = new Set();
    for (const p of g.projectiles) {
      seen.add(p.id);
      let o = this.thrown.get(p.id);
      if (!o) { o = build('wrench'); o.scale.setScalar(0.6); this.scene.add(o); this.thrown.set(p.id, o); }
      o.position.set(lerp(p.px, p.x, alpha), lerp(p.py, p.y, alpha), lerp(p.pz, p.z, alpha));
      o.rotation.x = now * 14; o.rotation.y = 0.6;
    }
    for (const [id, o] of this.thrown) if (!seen.has(id)) { this.scene.remove(o); this.thrown.delete(id); }

    for (const t of this.tracers) { t.life -= dt; t.line.material.opacity = Math.max(0, t.life / 0.06); if (t.life <= 0) { this.scene.remove(t.line); t.line.geometry.dispose(); } }
    this.tracers = this.tracers.filter((t) => t.life > 0);
    for (const b of this.booms) {
      b.life -= dt;
      const k = 1 - b.life / 0.35;
      b.ring.scale.setScalar(0.3 + b.radius * k);
      b.ring.material.opacity = 0.8 * (1 - k);
      if (b.life <= 0) this.scene.remove(b.ring);
    }
    this.booms = this.booms.filter((b) => b.life > 0);
    // power-up pads: items spin and bob; a pad you can't afford fades
    for (const p of this.powerPads) {
      const can = g.juno.coins >= CONFIG.powerups[p.pad.power].cost;
      p.gem.rotation.y = now * 1.8; p.gem.position.y = 1.0 + Math.sin(now * 2.4 + p.pad.x) * 0.08;
      p.disc.material.opacity = can ? 0.9 : 0.3;
      p.gem.scale.setScalar(can ? 1 : 0.75);
    }
    const u = g.nextUpgrade();
    this.benchDisc.material.opacity = u && g.juno.coins >= u.cost ? 0.9 : 0.3;
    // power-ups dropped by enemies: spin, bob, and blink before they vanish
    const seenDrops = new Set();
    for (const p of g.pickups) {
      seenDrops.add(p.id);
      let o = this.drops.get(p.id);
      if (!o) { o = this.dropProtos[p.power].clone(); this.scene.add(o); this.drops.set(p.id, o); this.burst(p.x, 0.8, p.z, 8, CONFIG.powerups[p.power].color); }
      o.position.set(p.x, 0.55 + Math.sin(now * 3 + p.id) * 0.1, p.z);
      o.rotation.y = now * 2.5;
      o.visible = p.age < CONFIG.powerDrops.life - 3 || Math.floor(now * 8) % 2 === 0;
    }
    for (const [id, o] of this.drops) if (!seenDrops.has(id)) { this.scene.remove(o); this.drops.delete(id); }
    // enemies wear zombie bodies once the models have loaded (the placeholder body is hidden)
    this.sync();
    if (this.zombies.ready) {
      for (const f of g.fighters) {
        if (f.team !== 'enemy') continue;
        const v = this.fighters.get(f.uid);
        if (!v) continue;
        if (v.zombie === undefined) {
          v.zombie = this.zombies.make(f.kind);
          if (v.zombie) { v.obj.add(v.zombie.holder); for (const m of [...v.obj.userData.materials, v.obj.userData.outlineMaterial]) m.visible = false; } // hide the placeholder body
        }
        if (v.zombie) this.zombies.pose(v.zombie, f, dt * g.timeWarp, v.vis.flash > 0 ? 0.45 : 0);
      }
    }
    super.render(alpha, dt, now);
    const r = this.renderer;
    this.vmCamera.aspect = this.camera.aspect; this.vmCamera.updateProjectionMatrix();
    r.autoClear = false;
    r.clearDepth();
    r.render(this.vmScene, this.vmCamera);
    r.autoClear = true;
  }

  updateCamera(jx, jz, dt) {
    const C = CONFIG.fps, cam = this.camera, j = this.game.juno, gun = this.game.gun;
    const wantFov = j.aiming ? C.scopeFov : C.fov; // the rifle scope zooms in
    if (cam.fov !== wantFov) { cam.fov = wantFov; cam.updateProjectionMatrix(); }
    let eye = C.eyeHeight, roll = 0;
    if (j.state === 'knocked_down' || j.state === 'defeated') {
      const down = j.state === 'defeated' ? 1 : Math.min(1, j.stateTime / 0.25) * (1 - Math.max(0, (j.stateTime / CONFIG.juno.downTime - 0.75) / 0.25));
      eye = lerp(eye, 0.35, down); roll = 0.6 * down;
    }
    this.bob += dt * j.speedNow * 1.7;
    const moving = Math.min(1, j.speedNow / 4);
    eye += Math.sin(this.bob * 2) * 0.03 * moving;
    this.hurtTilt = Math.max(0, this.hurtTilt - dt * 4);
    this.shake = Math.max(0, this.shake - dt * 1.2);
    const sh = this.shake * this.shake * 0.4;
    this.kick = Math.max(0, this.kick - dt * 8);
    cam.position.set(jx + (Math.random() - 0.5) * sh, eye + (Math.random() - 0.5) * sh, jz);
    cam.rotation.set(j.pitch + this.kick * 0.03, j.yaw + Math.PI, roll + this.hurtTilt * 0.08);

    // gun in hand
    if (this.shownGun !== gun.id) {
      this.hand.clear();
      this.hand.add(this.gunModel(gun.id));
      this.hand.add(this.muzzleFlash);
      this.shownGun = gun.id;
    }
    const reload = gun.reloading > 0 ? Math.sin(Math.min(1, 1 - gun.reloading / this.game.gunDef.reload) * Math.PI) : 0;
    // keep the gun on screen on narrow (phone) screens: place it from the visible width at its depth
    const halfW = Math.tan((this.vmCamera.fov * Math.PI) / 360) * cam.aspect * 0.36;
    const side = Math.min(0.17, halfW * 0.72);
    this.hand.scale.setScalar(Math.min(1, cam.aspect * 1.4)); // smaller on a phone held upright
    this.hand.position.set(side + Math.cos(this.bob) * 0.01 * moving, -0.16 + Math.abs(Math.sin(this.bob)) * 0.012 * moving - reload * 0.1, -0.36 + this.kick * 0.05);
    this.hand.rotation.set(reload * 0.9 + this.kick * 0.15, 0, 0);
    this.hand.visible = j.state !== 'defeated' && j.state !== 'knocked_down' && !j.aiming; // no gun in view through the scope
    const tip = this.guns[gun.id].userData.parts.muzzle;
    this.flashTime -= dt;
    this.muzzleFlash.visible = this.flashTime > 0;
    if (this.muzzleFlash.visible) {
      tip.updateWorldMatrix(true, false);
      this.muzzleFlash.position.copy(this.hand.worldToLocal(tip.getWorldPosition(new THREE.Vector3())));
      this.muzzleFlash.rotation.z = Math.random() * 3;
    }
    this.muzzleLight.intensity = this.flashTime > 0 ? 3 : 0;
  }
}
