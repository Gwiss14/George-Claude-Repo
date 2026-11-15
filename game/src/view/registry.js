// The one place that decides how every object looks.
// Each id maps to a builder that returns a THREE.Object3D with its feet (or base) at the origin, facing +Z.
// Stage 5 will swap these builders for loaded 3D models without touching gameplay code.
//
// Comic look: flat toon materials with a few hard light bands, and a black outline made from a
// slightly larger inside-out copy of each mesh. Every object gets its OWN materials, so flashing
// or fading one fighter never changes another.

import * as THREE from 'three';
import { CONFIG } from '../config.js';

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
    pose, body, head, arm_l: arms.l, arm_r: arms.r, leg_l: legs.l, leg_r: legs.r, state_ring: ring,
  });
}

// ---- props -----------------------------------------------------------------------
function buildCrate() {
  const k = new Kit();
  const root = new THREE.Group();
  const wood = k.toon(0xb57a3c), dark = k.toon(0x7a4d22);
  const c = k.mesh(box(1, 1, 1), wood); c.position.y = 0.5; root.add(c);
  for (const y of [0.12, 0.88]) {
    const plank = k.mesh(box(1.02, 0.12, 1.02), dark, { outline: false });
    plank.position.y = y; root.add(plank);
  }
  const mark = k.mesh(box(0.35, 0.35, 0.03), k.toon(0xe8d6a0), { outline: false }); // stencil on the +Z face
  mark.position.set(0, 0.5, 0.51); root.add(mark);
  return k.finish(root, 'prop');
}

function buildWaterTank() {
  const k = new Kit();
  const root = new THREE.Group();
  const metal = k.toon(0x6f8fa6), dark = k.toon(0x3d4f5e);
  for (const [x, z] of [[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]]) {
    const leg = k.mesh(box(0.14, 0.9, 0.14), dark); leg.position.set(x, 0.45, z); root.add(leg);
  }
  const tank = k.mesh(cyl(1.0, 1.0, 1.25, 24), metal); tank.position.y = 0.9 + 0.625; root.add(tank);
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
  const seam = k.toon(0x6e6b68);
  for (let x = -A.width / 2 + 2; x < A.width / 2; x += 2) {
    const s = k.mesh(box(0.05, 0.01, A.depth), seam, { outline: false, shadow: false }); s.position.set(x, 0.005, 0); root.add(s);
  }
  for (let z = -A.depth / 2 + 2; z < A.depth / 2; z += 2) {
    const s = k.mesh(box(A.width, 0.01, 0.05), seam, { outline: false, shadow: false }); s.position.set(0, 0.005, z); root.add(s);
  }
  // building below the roof, so the edge reads as a rooftop
  const wall = k.mesh(box(A.width, 12, A.depth), k.toon(0x5b5068), { outline: false });
  wall.position.y = -6.5; root.add(wall);
  return k.finish(root, 'ground');
}

function buildParapet() {
  const k = new Kit();
  const A = CONFIG.arena, t = A.wallThickness, h = A.wallHeight;
  const root = new THREE.Group();
  const mat = k.toon(0xa49a8c);
  const parts = [
    [A.width, t, 0, -A.depth / 2 + t / 2], [A.width, t, 0, A.depth / 2 - t / 2],
    [t, A.depth, -A.width / 2 + t / 2, 0], [t, A.depth, A.width / 2 - t / 2, 0],
  ];
  for (const [w, d, x, z] of parts) {
    const m = k.mesh(box(w, h, d), mat); m.position.set(x, h / 2, z); root.add(m);
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
  const blocks = new THREE.InstancedMesh(box(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x241c3a, fog: false }), 70);
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
};

export function build(id) {
  const make = REGISTRY[id];
  if (!make) throw new Error(`No builder for id "${id}"`);
  const obj = make();
  obj.name = id;
  return obj;
}
