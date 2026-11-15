// Every number you might want to tune lives here.
// Gameplay reads these live, so the debug panel (` key) changes them while you play.
// Values marked (restart) only take effect after pressing Restart.

export const CONFIG = {
  sim: {
    hz: 120,          // gameplay steps per second (rendering is interpolated between steps)
    timeScale: 1,     // 1 = real time; bots run faster
  },

  arena: {            // (restart)
    width: 16,        // X, metres
    depth: 10,        // Z, metres
    wallThickness: 0.3,
    wallHeight: 0.6,
  },

  camera: {
    fov: 45,
    height: 8,        // metres above the roof
    back: 11,         // metres south of the target
    follow: 0.5,      // how much the camera slides sideways with Juno (0..1)
    damping: 6,       // higher = snappier follow
    fitWidth: 17,     // metres of roof width that must fit on screen in landscape
    fitWidthPortrait: 8.5, // metres of width shown on a phone held upright (follows Juno sideways)
    portraitTilt: 1.5, // phone held upright: camera looks down more steeply (height x this)
    followZ: 0.25,    // how much the camera follows Juno forward and back
    lookAtZ: -0.5,
  },

  juno: {
    health: 100,
    speed: 4.5,
    radius: 0.3,
    height: 1.7,
    turnRate: 16,
    comboReset: 0.5,     // s after the last attack before the chain starts at jab again
    autoFaceRange: 3.0,  // attacks snap to face the nearest enemy within this range
    hurtTime: 0.3,
    downTime: 1.0,
    invulnAfterDown: 0.6,
    roll: {
      speed: 8.5,        // m/s at the start of the roll; it slows to 40 % by the end
      time: 0.38,        // s the roll lasts
      iframes: 0.28,     // s from the start of the roll where nothing can hit Juno
      cooldown: 0.3,     // s after a roll before the next one
      buffer: 0.15,      // a roll pressed this long before it is allowed still happens
    },
  },

  enemies: {
    crow:       { health: 30,  speed: 2.6, radius: 0.3,  height: 1.7, hurtTime: 0.3, downTime: 1.2, attacks: ['crowJab'] },
    crow_elite: { health: 45,  speed: 3.2, radius: 0.3,  height: 1.7, hurtTime: 0.3, downTime: 1.2, attacks: ['eliteJab'] },
    grudge:     { health: 140, speed: 2.0, radius: 0.45, height: 2.2, hurtTime: 0.3, downTime: 0,   attacks: ['grudgeJab', 'grudgeSmash'], smashEvery: 3 },
  },

  // length in seconds; lands / ends are fractions of that length
  attacks: {
    junoJab:     { length: 0.30, lands: 0.35, ends: 0.55, damage: 8,  reach: 1.3, push: 0.4, knockdown: false },
    junoCross:   { length: 0.36, lands: 0.45, ends: 0.65, damage: 12, reach: 1.4, push: 0.6, knockdown: false },
    junoKick:    { length: 0.50, lands: 0.45, ends: 0.65, damage: 20, reach: 1.7, push: 2.5, knockdown: true },
    crowJab:     { length: 0.70, lands: 0.60, ends: 0.75, damage: 8,  reach: 1.3, push: 0.4, knockdown: false },
    eliteJab:    { length: 0.70, lands: 0.60, ends: 0.75, damage: 10, reach: 1.3, push: 0.4, knockdown: false },
    grudgeJab:   { length: 0.70, lands: 0.60, ends: 0.75, damage: 10, reach: 1.6, push: 0.6, knockdown: false },
    grudgeSmash: { length: 1.20, lands: 0.62, ends: 0.76, damage: 22, reach: 2.0, push: 2.0, knockdown: true },
  },

  combat: {
    hitstop: 0.07,       // both fighters freeze this long on a hit
    invuln: 0.25,        // a fighter just hit cannot be hit again for this long
    coneDeg: 70,         // half-angle in front of the attacker where hits count
    pushDecay: 12,       // how fast knockback slows down
  },

  ai: {
    circleMin: 2.5,
    circleMax: 3.5,
    strafe: 0.55,        // circling speed as a share of walking speed
    attackGap: 0.8,      // s between any two enemy attacks starting
    maxAttackers: [1, 1, 2, 2, 2, 2, 2, 3], // by wave (the last number holds for every later wave)
    cooldownMin: 1.0,    // s an enemy waits after its own attack
    cooldownMax: 2.0,
    approachTimeout: 4,  // give up the turn if it cannot reach Juno in this long
    rangeShare: 0.8,     // attack when within this share of its reach
  },

  // Endless: every wave is built from these numbers. Enemies get tougher each wave.
  waves: {
    baseCrows: 2,        // Crows in wave 1
    crowsPerWave: 0.6,   // more Crows each wave (rounded down)
    maxEnemies: 9,       // most enemies in one wave
    eliteFrom: 2,        // first wave with an orange elite
    elitesPerWave: 0.34, // more elites each wave after that
    bossEvery: 5,        // Grudge leads every 5th wave
    maxAlive: 5,         // most enemies on the roof at once; the rest climb in as others fall
    reinforceDelay: 0.8, // s before the next one climbs in
    spawnClear: 1.0,     // m: an enemy only climbs in where nobody stands this close (else it waits)
    healthGrowth: 0.08,  // enemy health +8 % per wave
    damageGrowth: 0.05,  // enemy damage +5 % per wave
    attackGapShrink: 0.03, // the gap between enemy attacks gets this much shorter per wave
    minAttackGap: 0.45,
    healOnClear: 25,
    delay: 3.5,          // s between waves (time to grab coins or a weapon)
    entryZ: -2.6,        // where enemies walk to after climbing over the back wall
    modifierFrom: 2,     // first wave that can get a modifier
    plainChance: 0.25,   // share of waves (after that) that stay plain; boss waves are always plain
  },

  // Wave modifiers: one rule that changes a whole wave. Anything left out means "no change".
  //   enemySpeed / enemyHealth: multipliers for enemies of that wave
  //   toJuno / toEnemies: damage multipliers   coinMul: coins dropped by enemies
  //   extraEnemies: more Crows in the wave     fistsOnly: 1 = weapon put away and rack closed
  //   from: first wave this modifier can appear in (harsh ones wait until Juno has her footing)
  modifiers: {
    swift:  { label: 'Fast Crows',  from: 2, enemySpeed: 1.35 },
    tough:  { label: 'Tough Crows', from: 3, enemyHealth: 1.5, coinMul: 2 },
    payday: { label: 'Payday',      from: 2, coinMul: 2 },
    glass:  { label: 'Glass Jaw',   from: 4, toJuno: 1.5, toEnemies: 1.5 },
    fists:  { label: 'Fists Only',  from: 3, fistsOnly: 1, toEnemies: 1.25 },
    swarm:  { label: 'Swarm',       from: 3, extraEnemies: 3, enemyHealth: 0.6 },
  },

  coins: {
    drop: { crow: 3, crow_elite: 5, grudge: 10 }, // coins an enemy drops when defeated
    comboBonus: 2,       // extra coins for landing all three hits of a combo
    pickupRadius: 0.7,
    magnetRadius: 2.0,   // coins slide toward Juno inside this range
    magnetSpeed: 6,
    life: 15,            // s before a coin on the floor disappears (it blinks for the last 3 s)
  },

  combo: {
    slowmo: 0.12,        // s of game time in slow motion after a full combo lands
    slowmoSpeed: 0.3,    // game speed during that slow motion
  },

  // Weapons are bought at the rack (stand on a pad, press attack). They change the
  // combo into three swings and break after a number of landed hits.
  weapons: {
    pipe:   { unlockWave: 1, cost: 6,  durability: 15, damageMul: 1.5, reachAdd: 0.4, lengthMul: 1.0,  knockdownAll: 0 },
    hammer: { unlockWave: 2, cost: 12, durability: 10, damageMul: 2.2, reachAdd: 0.5, lengthMul: 1.35, knockdownAll: 1 },
    wrench: { unlockWave: 4, cost: 9,  durability: 25, damageMul: 1.3, reachAdd: 0.2, lengthMul: 0.8,  knockdownAll: 0 },
    shovel: { unlockWave: 6, cost: 15, durability: 14, damageMul: 1.8, reachAdd: 0.8, lengthMul: 1.1,  knockdownAll: 0 },
    axe:    { unlockWave: 9, cost: 24, durability: 12, damageMul: 3.0, reachAdd: 0.5, lengthMul: 1.25, knockdownAll: 1 },
    padRadius: 0.45,
  },

  look: {
    outline: 0.025,      // outline thickness, metres
    flashTime: 0.1,
    showStateRings: 1,   // 1 = coloured ring under each fighter shows its state
  },
};
