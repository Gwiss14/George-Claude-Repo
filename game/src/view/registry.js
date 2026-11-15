// The one place that decides how every object looks.
// Each id maps to a builder that returns a THREE.Object3D with its feet (or base) at the origin, facing +Z.
// Stage 5 will swap these builders for loaded 3D models without touching gameplay code.
//
// Comic look: flat toon materials with a few hard light bands, and a black outline made from a
// slightly larger inside-out copy of each mesh. Every object gets its OWN materials, so flashing
// or fading one fighter never changes another.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import {
  roofTexture, brickTexture, facadeTexture, skylineTexture, crateTexture, fragileTexture,
  tankTexture, pegboardTexture, padTexture, repeated,
} from './textures.js';

let gradientMap = null;
function toonGradient() {
  if (!gradientMap) {
    const data = new Uint8Array([70, 160, 255]);
    gradientMap = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
    gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}

class Kit {
  constructor() {
    this.materials = [];
    this.outline = new THREE.MeshBasicMaterial({ color: 0x0b0b10, side: THREE.BackSide });
  }
  toon(color, extra = {}) {
    const m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...extra });
    this.materials.push(m);
    return m;
  }
  // A mesh plus its outline shell. The shell is the same geometry scaled so the outline is
  // CONFIG.look.outline metres thick on every side.
  mesh(geo, mat, { outline = true, shadow = true } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadow;
    m.receiveShadow = true;
    if (outline) {
      geo.computeBoundingBox();
      const s = new THREE.Vector3();
      geo.boundingBox.getSize(s);
      const t = CONFIG.look.outline;
      const shell = new THREE.Mesh(geo, this.outline);
      shell.scale.set(1 + (2 * t) / Math.max(s.x, 1e-3), 1 + (2 * t) / Math.max(s.y, 1e-3), 1 + (2 * t) / Math.max(s.z, 1e-3));
      shell.name = 'outline';
      shell.userData.isOutline = true;
      m.add(shell);
    }
    return m;
  }
  finish(root, kind, parts = {}) {
    root.userData = { look: 'placeholder', kind, parts, materials: this.materials, outlineMaterial: this.outline };
    return root;
  }
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 10);

// ---- people --------------------------------------------------------------------
// Named parts, each turning around its own hinge:
//   pose (whole body, hinge at the feet)  body (hinge at the hips)  head
//   arm_l / arm_r (hinge at the shoulder)  leg_l / leg_r (hinge at the hip)
// The character's left is +X when it faces +Z.
function buildPerson({ height, width, skin, top, bottom, accent, visor }) {
  const k = new Kit();
  const h = height, w = width;
  const root = new THREE.Group();
  const pose = new THREE.Group(); pose.name = 'pose'; root.add(pose);

  const hipY = 0.47 * h;
  const legW = w * 0.3, legL = hipY;
  const mBottom = k.toon(bottom), mTop = k.toon(top), mSkin = k.toon(skin), mAccent = k.toon(accent);

  const legs = {};
  for (const side of ['l', 'r']) {
    const leg = new THREE.Group();
    leg.name = `leg_${side}`;
    leg.position.set((side === 'l' ? 1 : -1) * w * 0.2, hipY, 0);
    const m = k.mesh(box(legW, legL, legW * 1.1), mBottom);
    m.position.y = -legL / 2;
    leg.add(m);
    const shoe = k.mesh(box(legW * 1.05, 0.08 * h / 1.7, legW * 1.6), mAccent);
    shoe.position.set(0, -legL + 0.04 * h / 1.7, legW * 0.25);
    leg.add(shoe);
    pose.add(leg);
    legs[side] = leg;
  }

  const body = new THREE.Group(); body.name = 'body'; body.position.y = hipY; pose.add(body);
  const torsoR = w * 0.3, torsoH = 0.34 * h;
  const torso = k.mesh(capsule(torsoR, torsoH - 2 * torsoR), mTop);
  torso.position.y = torsoH / 2;
  body.add(torso);

  const head = new THREE.Group(); head.name = 'head';
  const headR = 0.075 * h, headH = 0.19 * h;
  head.position.y = torsoH + headH / 2 - 0.005 * h;
  body.add(head);
  head.add(k.mesh(capsule(headR, headH - 2 * headR), mSkin));
  const v = k.mesh(box(headR * 1.5, headR * 0.45, headR * 0.5), k.toon(visor)); // shows which way it faces
  v.position.set(0, headR * 0.25, headR * 0.85);
  head.add(v);

  const arms = {};
  const armL = 0.36 * h, armW = w * 0.2;
  for (const side of ['l', 'r']) {
    const arm = new THREE.Group();
    arm.name = `arm_${side}`;
    arm.position.set((side === 'l' ? 1 : -1) * (torsoR + armW * 0.55), torsoH * 0.88, 0);
    const m = k.mesh(box(armW, armL, armW), mTop);
    m.position.y = -armL / 2;
    arm.add(m);
    const fist = k.mesh(box(armW * 1.3, armW * 1.3, armW * 1.3), mSkin);
    fist.position.y = -armL;
    arm.add(fist);
    if (side === 'r') {
      // Attach point for a held weapon: at the fist. A weapon's +Z (its length, grip at its origin)
      // points along the arm, away from the shoulder.
      const hand = new THREE.Group();
      hand.name = 'hand_r';
      hand.position.y = -armL;
      hand.rotation.x = Math.PI / 2;
      arm.add(hand);
      arms.hand = hand;
    }
    body.add(arm);
    arms[side] = arm;
  }

  // State ring on the floor (debug-friendly colour coding of the current state).
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
  const ring = new THREE.Mesh(cyl(w * 0.75, w * 0.75, 0.02, 24), ringMat);
  ring.name = 'state_ring';
  ring.position.y = 0.012;
  root.add(ring);

  return k.finish(root, 'person', {
    pose, body, head, arm_l: arms.l, arm_r: arms.r, leg_l: legs.l, leg_r: legs.r, state_ring: ring, hand_r: arms.hand,
  });
}

// ---- props -----------------------------------------------------------------------
function buildCrate() {
  const k = new Kit();
  const root = new THREE.Group();
  const c = k.mesh(box(1, 1, 1), k.toon(0xffffff, { map: crateTexture() })); c.position.y = 0.5; root.add(c);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), new THREE.MeshBasicMaterial({ map: fragileTexture(), transparent: true, depthWrite: false }));
  label.position.set(0, 0.5, 0.505); root.add(label); // stencil on the +Z face
  return k.finish(root, 'prop');
}

function buildWaterTank() {
  const k = new Kit();
  const root = new THREE.Group();
  const metal = k.toon(0x6f8fa6), dark = k.toon(0x3d4f5e);
  for (const [x, z] of [[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]]) {
    const leg = k.mesh(box(0.14, 0.9, 0.14), dark); leg.position.set(x, 0.45, z); root.add(leg);
  }
  const tank = k.mesh(cyl(1.0, 1.0, 1.25, 24), k.toon(0xffffff, { map: repeated(tankTexture(), 2, 1) })); tank.position.y = 0.9 + 0.625; root.add(tank);
  const cap = k.mesh(cyl(0.25, 1.0, 0.35, 24), dark); cap.position.y = 2.15 + 0.175; root.add(cap);
  const band = k.mesh(cyl(1.02, 1.02, 0.1, 24), dark, { outline: false }); band.position.y = 1.5; root.add(band);
  const hatch = k.mesh(box(0.4, 0.5, 0.05), dark, { outline: false }); hatch.position.set(0, 1.5, 1.0); root.add(hatch);
  return k.finish(root, 'prop');
}

function buildLampPost() {
  const k = new Kit();
  const root = new THREE.Group();
  const pole = k.toon(0x2c2f38);
  const p = k.mesh(cyl(0.06, 0.08, 3.3, 10), pole); p.position.y = 1.65; root.add(p);
  const head = k.mesh(box(0.3, 0.2, 0.3), pole); head.position.y = 3.4; root.add(head);
  const bulb = k.mesh(box(0.22, 0.06, 0.22), k.toon(0xfff0b0, { emissive: 0xffd27a, emissiveIntensity: 1 }), { outline: false });
  bulb.position.y = 3.28; root.add(bulb);
  const light = new THREE.PointLight(0xffc77a, 6, 9, 1.6);
  light.position.y = 3.1; root.add(light);
  return k.finish(root, 'prop');
}

function buildRoof() {
  const k = new Kit();
  const A = CONFIG.arena;
  const root = new THREE.Group();
  const slab = k.mesh(box(A.width, 0.5, A.depth), k.toon(0x8d8a86), { outline: false });
  slab.position.y = -0.25; root.add(slab);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(A.width, A.depth), k.toon(0xffffff, { map: roofTexture(A.width, A.depth) }));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.002; top.receiveShadow = true; root.add(top);
  // building below the roof, so the edge reads as a rooftop
  const wall = k.mesh(box(A.width, 12, A.depth), k.toon(0xffffff, { map: repeated(facadeTexture(), A.width / 4, 4) }), { outline: false });
  wall.position.y = -6.5; root.add(wall);
  return k.finish(root, 'ground');
}

function buildParapet() {
  const k = new Kit();
  const A = CONFIG.arena, t = A.wallThickness, h = A.wallHeight;
  const root = new THREE.Group();
  const cap = k.toon(0xc9bca8);
  const parts = [
    [A.width, t, 0, -A.depth / 2 + t / 2], [A.width, t, 0, A.depth / 2 - t / 2],
    [t, A.depth, -A.width / 2 + t / 2, 0], [t, A.depth, A.width / 2 - t / 2, 0],
  ];
  for (const [w, d, x, z] of parts) {
    const len = Math.max(w, d);
    const m = k.mesh(box(w, h - 0.08, d), k.toon(0xffffff, { map: repeated(brickTexture(), len / 2, 1) }));
    m.position.set(x, (h - 0.08) / 2, z); root.add(m);
    const c = k.mesh(box(w + 0.06, 0.08, d + 0.06), cap); c.position.set(x, h - 0.04, z); root.add(c);
  }
  return k.finish(root, 'edge');
}

function buildSky() {
  const root = new THREE.Group();
  const geo = new THREE.SphereGeometry(120, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2b2a5e) }, mid: { value: new THREE.Color(0xe0627a) }, low: { value: new THREE.Color(0xffc26b) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP;
      void main(){ float y = vP.y; vec3 c = y > 0.12 ? mix(mid, top, smoothstep(0.12, 0.6, y)) : mix(low, mid, smoothstep(-0.1, 0.12, y));
      c = floor(c * 10.0) / 10.0; gl_FragColor = vec4(c, 1.); }`,
  });
  root.add(new THREE.Mesh(geo, mat));
  // far skyline: flat dark blocks in a ring (one draw call)
  const blocks = new THREE.InstancedMesh(box(1, 1, 1), new THREE.MeshBasicMaterial({ map: repeated(skylineTexture(), 1, 2), fog: false }), 70);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 + rnd() * 0.05, r = 55 + rnd() * 25;
    const hgt = 6 + rnd() * 22;
    p.set(Math.cos(a) * r, hgt / 2 - 14, Math.sin(a) * r);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    s.set(4 + rnd() * 6, hgt, 4 + rnd() * 6);
    blocks.setMatrixAt(i, m.compose(p, q, s));
  }
  root.add(blocks);
  root.userData = { look: 'placeholder', kind: 'sky' };
  return root;
}

// The weapons spot: a pegboard rack, 1.8 m wide, 2 m tall, 0.5 m deep, open side facing +Z.
function buildWeaponRack() {
  const k = new Kit();
  const root = new THREE.Group();
  const frame = k.toon(0x3a3f4a);
  const back = k.mesh(box(1.8, 1.9, 0.08), k.toon(0xffffff, { map: pegboardTexture() }));
  back.position.set(0, 1.0, -0.2); root.add(back);
  for (const x of [-0.88, 0.88]) {
    const post = k.mesh(box(0.08, 2.0, 0.45), frame); post.position.set(x, 1.0, 0); root.add(post);
  }
  const shelf = k.mesh(box(1.8, 0.08, 0.45), frame); shelf.position.set(0, 0.45, 0); root.add(shelf);
  const roofBar = k.mesh(box(1.9, 0.1, 0.5), frame); roofBar.position.set(0, 2.0, 0); root.add(roofBar);
  for (const x of [-0.45, 0.45]) {
    const peg = k.mesh(box(0.05, 0.05, 0.25), frame); peg.position.set(x, 1.45, -0.05); root.add(peg);
  }
  return k.finish(root, 'prop');
}

function buildWeaponPad() {
  const root = new THREE.Group();
  const d = CONFIG.weapons.padRadius * 2;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(d, d), new THREE.MeshBasicMaterial({ map: padTexture(), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.006;
  root.add(m);
  root.userData = { look: 'placeholder', kind: 'marking' };
  return root;
}

// Coin: 0.3 m across, standing on its edge facing +Z (the view spins it).
function buildCoin() {
  const k = new Kit();
  const root = new THREE.Group();
  const c = k.mesh(cyl(0.15, 0.15, 0.04, 20), k.toon(0xffc93c, { emissive: 0x6b4a00, emissiveIntensity: 0.5 }), { shadow: false });
  c.rotation.x = Math.PI / 2; c.position.y = 0.17; root.add(c);
  const mark = k.mesh(box(0.06, 0.14, 0.05), k.toon(0xe0a020), { outline: false, shadow: false });
  mark.position.y = 0.17; root.add(mark);
  return k.finish(root, 'prop');
}

// Weapons: grip at the origin, length along +Z.
function buildPipe() {
  const k = new Kit();
  const root = new THREE.Group();
  const steel = k.toon(0x9aa5b1), tape = k.toon(0x1d1f26);
  const p = k.mesh(cyl(0.035, 0.035, 0.95, 10), steel); p.rotation.x = Math.PI / 2; p.position.z = 0.42; root.add(p);
  const grip = k.mesh(cyl(0.045, 0.045, 0.22, 10), tape); grip.rotation.x = Math.PI / 2; grip.position.z = 0.02; root.add(grip);
  const elbow = k.mesh(box(0.11, 0.11, 0.11), steel); elbow.position.z = 0.9; root.add(elbow);
  return k.finish(root, 'prop');
}

function buildHammer() {
  const k = new Kit();
  const root = new THREE.Group();
  const wood = k.toon(0xb57a3c), iron = k.toon(0x4a4f5c);
  const h = k.mesh(cyl(0.035, 0.04, 0.95, 10), wood); h.rotation.x = Math.PI / 2; h.position.z = 0.4; root.add(h);
  const head = k.mesh(box(0.34, 0.18, 0.18), iron); head.position.z = 0.95; root.add(head);
  const band = k.mesh(box(0.2, 0.2, 0.05), k.toon(0xe0b040), { outline: false }); band.position.z = 0.84; root.add(band);
  return k.finish(root, 'prop');
}

function buildWrench() {
  const k = new Kit();
  const root = new THREE.Group();
  const steel = k.toon(0xc4ccd6), red = k.toon(0xc0392b);
  const h = k.mesh(box(0.06, 0.03, 0.62), steel); h.position.z = 0.31; root.add(h);
  const grip = k.mesh(box(0.08, 0.05, 0.22), red); grip.position.z = 0.08; root.add(grip);
  const jaw = k.mesh(box(0.2, 0.05, 0.1), steel); jaw.position.z = 0.65; root.add(jaw);
  for (const x of [-0.07, 0.07]) { const t = k.mesh(box(0.05, 0.05, 0.08), steel); t.position.set(x, 0, 0.72); root.add(t); }
  return k.finish(root, 'prop');
}

function buildShovel() {
  const k = new Kit();
  const root = new THREE.Group();
  const wood = k.toon(0xc8955a), blade = k.toon(0x5d8a5a);
  const h = k.mesh(cyl(0.03, 0.03, 0.9, 10), wood); h.rotation.x = Math.PI / 2; h.position.z = 0.4; root.add(h);
  const t = k.mesh(box(0.16, 0.05, 0.04), k.toon(0x2c2f38)); t.position.z = -0.04; root.add(t);
  const b = k.mesh(box(0.26, 0.03, 0.32), blade); b.position.z = 1.0; root.add(b);
  return k.finish(root, 'prop');
}

function buildAxe() {
  const k = new Kit();
  const root = new THREE.Group();
  const wood = k.toon(0x8a5a2b), red = k.toon(0xd8342c), steel = k.toon(0xd9dee4);
  const h = k.mesh(cyl(0.035, 0.04, 0.92, 10), wood); h.rotation.x = Math.PI / 2; h.position.z = 0.42; root.add(h);
  const head = k.mesh(box(0.12, 0.08, 0.16), red); head.position.z = 0.86; root.add(head);
  const edge = k.mesh(box(0.2, 0.05, 0.22), steel); edge.position.set(0.15, 0, 0.86); root.add(edge);
  const spike = k.mesh(box(0.1, 0.05, 0.06), red); spike.position.set(-0.1, 0, 0.86); root.add(spike);
  return k.finish(root, 'prop');
}

const PEOPLE = {
  juno:       { height: CONFIG.juno.height, width: 0.6, skin: 0xe8b48a, top: 0x2fb6a8, bottom: 0x27324a, accent: 0xf2d14b, visor: 0x111111 },
  crow:       { height: CONFIG.enemies.crow.height, width: 0.6, skin: 0xc9a27e, top: 0x3d4a6b, bottom: 0x23262e, accent: 0x9aa3b5, visor: 0xd7e0f0 },
  crow_elite: { height: CONFIG.enemies.crow_elite.height, width: 0.6, skin: 0xc9a27e, top: 0xe2782a, bottom: 0x23262e, accent: 0x9aa3b5, visor: 0xd7e0f0 },
  grudge:     { height: CONFIG.enemies.grudge.height, width: 0.9, skin: 0xb98c6a, top: 0x7a2e3a, bottom: 0x1f2028, accent: 0x5a5f6b, visor: 0xf0c040 },
};

export const REGISTRY = {
  juno: () => buildPerson(PEOPLE.juno),
  crow: () => buildPerson(PEOPLE.crow),
  crow_elite: () => buildPerson(PEOPLE.crow_elite),
  grudge: () => buildPerson(PEOPLE.grudge),
  crate: buildCrate,
  water_tank: buildWaterTank,
  lamp_post: buildLampPost,
  roof: buildRoof,
  parapet: buildParapet,
  sky: buildSky,
  weapon_rack: buildWeaponRack,
  weapon_pad: buildWeaponPad,
  coin: buildCoin,
  pipe: buildPipe,
  hammer: buildHammer,
  wrench: buildWrench,
  shovel: buildShovel,
  axe: buildAxe,
};

// Swappable parts hang on named attach points and are scaled to fit the slot.
export const SLOTS = {
  hand_r: { length: { pipe: 1.0, hammer: 1.1, wrench: 0.75, shovel: 1.15, axe: 1.0 } },
};

export function attach(owner, slot, id) {
  const point = owner.userData.parts?.[slot];
  if (!point) return null;
  point.clear();
  if (!id) return null;
  const part = build(id);
  const size = new THREE.Box3().setFromObject(part).getSize(new THREE.Vector3());
  const want = SLOTS[slot].length[id] ?? Math.max(size.x, size.y, size.z);
  part.scale.setScalar(want / Math.max(size.x, size.y, size.z));
  point.add(part);
  return part;
}

export function build(id) {
  const make = REGISTRY[id];
  if (!make) throw new Error(`No builder for id "${id}"`);
  const obj = make();
  obj.name = id;
  return obj;
}
