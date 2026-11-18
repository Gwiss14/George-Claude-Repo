// Turns the shared settings into the shooter's settings. Imported first by the FPS page only,
// so the brawler (index.html) is untouched.

import { CONFIG } from '../config.js';
import { WEAPON_PADS } from '../game/level.js';

CONFIG.fps = {
  eyeHeight: 1.55,
  fov: 75,
  moveMul: 1.1,          // Juno walks a little faster than in the brawler
  lookSpeed: 0.0026,     // radians per pixel of mouse or finger movement
  turnKeys: 2.4,         // radians per second with the left/right arrow keys
  tapTime: 0.3,          // s: a touch on the aiming side shorter than this, that barely moves, is a shot
  tapSlop: 14,           // px it may move and still count as a tap
  comboEvery: 5,         // hits in a row without missing for a COMBO
  staggerEvery: 0.5,     // s: a Crow flinches at most this often, so fast guns do not stun-lock
  headshotTop: 0.18,     // the top 18 % of a fighter's height counts as the head
  hitRadiusAdd: 0.08,    // targets are a little fatter than their collision circle
  throwSpeed: 9,         // m/s of a thrown wrench
  throwGravity: 12,
};

// Guns. The pistol is always in hand and never runs out; the rack sells the rest.
// damage per pellet · rate in shots/s · spread in radians · ammo = spare rounds that come with it
CONFIG.guns = {
  pistol:   { damage: 10, pellets: 1, rate: 4,   mag: 10,  reload: 1.0, spread: 0.01,  range: 40, push: 0.3, headMul: 2,   moveMul: 1 },
  smg:      { damage: 6,  pellets: 1, rate: 11,  mag: 30,  reload: 1.4, spread: 0.045, range: 30, push: 0.15, headMul: 1.5, moveMul: 1,    ammo: 120 },
  shotgun:  { damage: 7,  pellets: 8, rate: 1.3, mag: 6,   reload: 1.8, spread: 0.09,  range: 14, push: 0.25, headMul: 1.5, moveMul: 0.95, ammo: 30, knockdownPellets: 5 },
  rifle:    { damage: 45, pellets: 1, rate: 1.6, mag: 5,   reload: 1.6, spread: 0.002, range: 60, push: 0.8, headMul: 2.5, moveMul: 0.95, ammo: 25, pierce: 3 },
  launcher: { damage: 60, pellets: 1, rate: 0.9, mag: 4,   reload: 2.0, spread: 0.01,  range: 40, push: 2.5, headMul: 1,   moveMul: 0.9,  ammo: 12, blast: 2.2 },
  minigun:  { damage: 7,  pellets: 1, rate: 20,  mag: 200, reload: 3.0, spread: 0.06,  range: 35, push: 0.1, headMul: 1.5, moveMul: 0.7,  ammo: 400 },
};

// What the rack sells, when, and for how much (replaces the melee weapons on this page).
CONFIG.weapons = {
  smg:      { unlockWave: 1, cost: 8 },
  shotgun:  { unlockWave: 2, cost: 12 },
  rifle:    { unlockWave: 4, cost: 15 },
  launcher: { unlockWave: 6, cost: 22 },
  minigun:  { unlockWave: 9, cost: 30 },
  padRadius: 0.45,
};
['smg', 'shotgun', 'rifle', 'launcher', 'minigun'].forEach((w, i) => { WEAPON_PADS[i].weapon = w; });

// Orange elites mostly stay back and throw wrenches; every third attack is a jab.
CONFIG.attacks.eliteThrow = { length: 0.8, lands: 0.55, ends: 0.6, damage: 8, reach: 7, push: 0.6, knockdown: false, ranged: true };
CONFIG.enemies.crow_elite.attacks = ['eliteThrow', 'eliteJab'];
CONFIG.enemies.crow_elite.smashEvery = 3;
CONFIG.juno.speed = 4.5;
