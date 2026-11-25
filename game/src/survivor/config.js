// Roof Rumble (survivor): every number worth tuning. The debug panel (` key) edits these live.

export const S = {
  arena: { width: 18, depth: 28, wallThickness: 0.3, wallHeight: 0.6 }, // portrait-shaped roof

  run: { length: 300 }, // survive 5:00 to win

  juno: {
    hp: 100, speed: 5.2, radius: 0.35, iframes: 0.75,
    // J = punch, K = kick. Each hits every Crow within reach in the arc in front of her.
    // time: how long the move takes; hitAt: when in it the hit lands. Quick Hands shortens both.
    attacks: {
      punch: { damage: 11, push: 0.6, reach: 1.8, arcDeg: 120, time: 0.26, hitAt: 0.08 },
      kick:  { damage: 17, push: 1.4, reach: 2.2, arcDeg: 150, time: 0.42, hitAt: 0.16 },
    },
    comboWindow: 0.6,  // s after a move ends that the next press still continues the string
    attackMove: 0.7,   // move speed while swinging (x normal)
    lunge: 1.4,        // a press steps her up to this far toward a Crow just out of reach
    aimAssist: 1.6,    // a press turns her toward the nearest Crow within reach + this
    starter: { wrench: 1 },  // every run starts with these upgrades
    // ROLL button: a quick dodge-roll. Juno cannot be hurt and slips through the crowd while rolling.
    roll: { speed: 12, time: 0.32, cooldown: 1.4, iframes: 0.4 },
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

  // low, angled view: behind and above Juno, looking ahead across the roof and the city
  camera: { fov: 52, height: 6.8, back: 8.5, ahead: 3.5, damping: 7, landscapeFov: 46, landscapeHeight: 5.6, landscapeBack: 8, edgeMargin: 4 },
};

// Combos: the last presses (J = punch, K = kick) ending in one of these strings make its finisher.
// The finisher hits with damage x `damage`, its own push, extra reach and arc, and freezes the roof briefly.
export const COMBOS = [
  { keys: 'JKJK', name: 'FURY',       damage: 2.6, push: 5,   reach: 1.6, arcDeg: 360, hitstop: 0.08, coins: 2 }, // shockwave all around
  { keys: 'JJJ',  name: 'TRIPLE JAB', damage: 2.0, push: 3,   reach: 0.2, arcDeg: 120, hitstop: 0.04, coins: 0 },
  { keys: 'JJK',  name: 'ROUNDHOUSE', damage: 1.8, push: 4.5, reach: 0.5, arcDeg: 360, hitstop: 0.05, coins: 1 }, // spinning kick
  { keys: 'KKJ',  name: 'UPPERCUT',   damage: 3.4, push: 6,   reach: 0.3, arcDeg: 80,  hitstop: 0.07, coins: 1 }, // one huge hit up front
  { keys: 'KJK',  name: 'DROP KICK',  damage: 2.4, push: 7,   reach: 1.0, arcDeg: 100, hitstop: 0.06, coins: 1 }, // flies forward
];

// In-run upgrades: pick 1 of 3 on each level-up. Each goes to level 5.
export const UPGRADES = {
  haymaker:  { name: 'Haymaker',     text: (l) => `Punches and kicks hit ${25 * l}% harder` },
  quick:     { name: 'Quick Hands',  text: (l) => `Punch and kick ${12 * l}% faster` },
  reach:     { name: 'Long Arms',    text: (l) => `+${(0.3 * l).toFixed(1)} m reach, wider swings` },
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
