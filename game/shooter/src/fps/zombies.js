// Zombie bodies for the enemies (player asked: "use higgsfield to make the player models look like zombies").
// Two rigged, walking models were generated with Higgsfield (Meshy text-to-3D, Monster_Walk clip) and are
// packed into the page. Each enemy keeps its game logic and hit circle; only its look is swapped: the
// placeholder body is hidden and an animated zombie copy rides on the same object.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CONFIG } from '../config.js';
import zombieUrl from './models/zombie.glb?url';
import bruteUrl from './models/zombie_brute.glb?url';

// which model each enemy kind wears, and a colour tint to tell them apart
const LOOKS = {
  crow:       { model: 'zombie', tint: null },
  crow_elite: { model: 'zombie', tint: 0xffa060 }, // the wrench throwers: orange-tinged
  grudge:     { model: 'brute',  tint: null },
};

export class Zombies {
  constructor() {
    this.models = {};
    this.ready = false;
    const loader = new GLTFLoader();
    const load = (key, url) => new Promise((res) => loader.load(url, (g) => { this.models[key] = g; res(); }, undefined, (e) => { console.warn('zombie model failed', key, e); res(); }));
    this.loading = Promise.all([load('zombie', zombieUrl), load('brute', bruteUrl)]).then(() => { this.ready = !!(this.models.zombie && this.models.brute); });
  }

  // a fresh animated zombie for one enemy, sized to that enemy's height
  make(kind) {
    const look = LOOKS[kind], g = look && this.models[look.model];
    if (!g) return null;
    const body = cloneSkinned(g.scene);
    const materials = [];
    body.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.frustumCulled = false; // skinned meshes move outside their bind-pose bounds
      o.material = o.material.clone();
      if (look.tint) o.material.color.multiply(new THREE.Color(look.tint));
      if (!o.material.emissive) o.material.emissive = new THREE.Color(0);
      materials.push(o.material);
    });
    // stand on the floor at the enemy's height. Measure the mesh's own vertices: a box around the
    // whole object would count the skeleton, whose bones are in centimetres.
    const box = new THREE.Box3();
    body.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox); } });
    const size = box.getSize(new THREE.Vector3());
    const want = CONFIG.enemies[kind].height;
    const s = want / (size.y || 1);
    const holder = new THREE.Group(), pivot = new THREE.Group();
    body.scale.setScalar(s);
    body.position.set(-(box.min.x + size.x / 2) * s, -box.min.y * s, -(box.min.z + size.z / 2) * s);
    pivot.add(body); holder.add(pivot);
    const mixer = new THREE.AnimationMixer(body);
    const clip = g.animations[0];
    const walk = clip ? mixer.clipAction(clip) : null;
    if (walk) { walk.play(); walk.time = Math.random() * clip.duration; } // out of step with each other
    return { holder, pivot, mixer, walk, materials, fade: 1 };
  }

  // pose one zombie from its fighter's state, every frame
  pose(z, f, dt, flash) {
    const moving = Math.min(1.6, f.speedNow / 1.4);
    if (z.walk) z.walk.timeScale = f.state === 'defeated' || f.state === 'knocked_down' ? 0 : 0.35 + moving;
    z.mixer.update(dt);
    const P = z.pivot;
    P.rotation.set(0, 0, 0); P.position.set(0, 0, 0);
    if (f.state === 'knocked_down' || f.state === 'defeated') {
      const k = Math.min(1, f.stateTime / 0.3);
      P.rotation.x = -Math.PI / 2 * 0.95 * k; // falls flat on its back
      P.position.y = 0.15 * k;
    } else if (f.state === 'hurt') {
      P.rotation.x = -0.35 * Math.sin(Math.min(1, f.stateTime / 0.3) * Math.PI); // reels back
    } else if (f.state === 'attack') {
      const a = CONFIG.attacks[f.attack], u = Math.min(1, f.stateTime / a.length);
      P.rotation.x = u < a.lands ? -0.2 * (u / a.lands) : 0.45 * Math.sin(((u - a.lands) / (1 - a.lands)) * Math.PI); // rear back, lunge
    }
    for (const m of z.materials) m.emissive.setScalar(flash);
    const fade = f.state === 'defeated' ? Math.max(0, 1 - Math.max(0, f.stateTime - 1.2) / 0.7) : 1;
    if (fade !== z.fade) {
      z.fade = fade;
      for (const m of z.materials) { m.transparent = fade < 1; m.opacity = fade; m.depthWrite = fade >= 1; }
    }
  }
}
