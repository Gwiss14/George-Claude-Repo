// Roof Rumble (survivor): every number worth tuning. The debug panel (` key) edits these live.

export const S = {
  arena: { width: 18, depth: 28, wallThickness: 0.3, wallHeight: 0.6 }, // portrait-shaped roof

  run: { length: 300 }, // survive 5:00 to win

  juno: {
    hp: 100, speed: 5.2, radius: 0.35, iframes: 0.75,
    attackInterval: 0.42,  // s between punches (jab, cross, kick, repeat)
    reach: 1.9, arcDeg: 140, // punches hit every Crow in this arc in front of her
    starter: { wrench: 1 },  // every run starts with these upgrades
    damage: [10, 12, 18],
    push: [1.3, 1.3, 3.6],
  },

  // contact damage: a Crow touching Juno hurts her, then waits `contactCooldown` before it can again
  enemies: {
    grunt:   { hp: 20,  speed: 2.2, damage: 6,  radius: 0.32, scale: 1.0,  xp: 1,  mass: 1,  color: 0x3d4a6b },
    runner:  { hp: 12,  speed: 4.0, damage: 6,  radius: 0.28, scale: 0.85, xp: 1,  mass: 0.7, color: 0x8e5bd6 },
    thrower: { hp: 26,  speed: 2.0, damage: 10, radius: 0.32, scale: 1.0,  xp: 3,  mass: 1,  color: 0xe2782a, range: 6.5, throwEvery: 2.6 },
    brute:   { hp: 95,  speed: 1.6, damage: 13, radius: 0.5,  scale: 1.35, xp: 6,  mass: 3,  color: 0x7a2e3a },
    boss:    { hp: 450, speed: 1.9, damage: 20, radius: 0.7,  scale: 1.9,  xp: 40, mass: 20, color: 0x4b1d2a, smashEvery: 3.5, smashRadius: 2.7, smashWindup: 1.15 },
  },
  contactCooldown: 0.7,

  spawn: {
    perSecond: 0.7,       // at the start
    growth: 1 / 62,       // more per second, every second
    maxPerSecond: 6.5,
    maxAlive: 110,
    runnerPack: 2,        // runners climb in together
    minDistance: 8,       // never spawn closer than this to Juno
    from: { runner: 25, thrower: 55, brute: 100 }, // seconds into the run
    hpGrowth: 1 / 110,    // enemy health +1 % roughly every second
    bossAt: [90, 180, 240],
  },

  xp: { first: 5, perLevel: 4, magnet: 2.2, pickup: 0.6, magnetSpeed: 9 },
  heal: { chance: 0.035, amount: 15 }, // a knocked-out Crow sometimes drops a soda can

  feel: { hitstop: 0.035, shake: 0.12, bigShake: 0.3 },

  camera: { fov: 48, height: 15, back: 5.5, damping: 7, landscapeHeight: 12, landscapeBack: 6.5, edgeMargin: 5 },
};

// In-run upgrades: pick 1 of 3 on each level-up. Each goes to level 5.
export const UPGRADES = {
  haymaker:  { name: 'Haymaker',     text: (l) => `Punches hit ${25 * l}% harder` },
  quick:     { name: 'Quick Hands',  text: (l) => `Punch ${12 * l}% faster` },
  reach:     { name: 'Long Arms',    text: (l) => `+${(0.3 * l).toFixed(1)} m reach, wider swing` },
  pipes:     { name: 'Orbit Pipes',  text: (l) => `${Math.min(l, 4)} pipe${l > 1 ? 's' : ''} spin around you` },
  wrench:    { name: 'Wrench Toss',  text: (l) => `Throw ${1 + Math.floor((l - 1) / 2)} wrench${l > 2 ? 'es' : ''} every ${(1.7 - 0.2 * l).toFixed(1)} s` },
  stomp:     { name: 'Shockwave',    text: (l) => `Stomp every ${(3.4 - 0.3 * l).toFixed(1)} s, knocks Crows back` },
  sneakers:  { name: 'Sneakers',     text: (l) => `Run ${10 * l}% faster` },
  magnet:    { name: 'Coin Magnet',  text: (l) => `Pull coins from ${(2.2 * (1 + 0.45 * l)).toFixed(1)} m` },
  ironskin:  { name: 'Iron Skin',    text: () => '+20 max health and heal 20' },
  secondwind:{ name: 'Second Wind',  text: (l) => `Every ${10 - l} KOs heal 4` },
};

// Permanent upgrades bought with banked coins between runs.
export const SHOP = {
  might:    { name: 'Might',    text: (l) => `+${8 * l}% damage`,        costs: [30, 60, 110, 180, 280] },
  vitality: { name: 'Vitality', text: (l) => `+${15 * l} max health`,    costs: [30, 60, 110, 180, 280] },
  swift:    { name: 'Swift',    text: (l) => `+${5 * l}% speed`,         costs: [40, 90, 160] },
  greed:    { name: 'Greed',    text: (l) => `+${15 * l}% coins`,        costs: [40, 90, 160] },
  revive:   { name: 'Revive',   text: () => 'Get back up once per run',   costs: [250] },
};
