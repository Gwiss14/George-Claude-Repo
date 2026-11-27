# Roof Rumble — design (one page)

The App Store game. Phone held upright, 5-minute runs. Juno holds the roof against swarms of Tin Crows. The player steers her, fights by hand with PUNCH (J) and KICK (K) strung into combos, picks upgrades and survives. It replaced the two earlier games (a third-person brawler and a first-person shooter) after the player said they "absolutely suck", asked to "think like an App Store game dev", and then chose to keep only this one. Those games are in git history.

## Why this shape

- **Two thumbs, three buttons:** drag anywhere to move; PUNCH, KICK and ROLL on the right. The player asked to fight by hand (J punch, K kick) with combos, replacing the automatic punches.
- **Short runs with a goal:** survive 5:00, with an instant "PLAY AGAIN".
- **A decision every 20–40 seconds:** each level-up offers 1 of 3 upgrade cards. That choice is what makes each run different.
- **Something kept after every run:** banked coins buy permanent upgrades, so even a loss moves you forward.
- **Swarms:** 20–60 Crows on screen. They are drawn as instanced parts: about 150 draw calls at the busiest moment, so older iPhones stay smooth.

## Core loop

Move → punch and kick the Crows, chaining combos, while her weapons fire on their own → knocked-out Crows burst into coins → coins fill the XP bar → level up: pick 1 of 3 cards → more and tougher Crows → Grudge at 1:30, 3:00 and 4:00 → survive to 5:00 → coins banked → shop → play again.

## Controls

| | Touch | Keyboard |
|---|---|---|
| Move | Touch and drag anywhere (a floating stick follows the thumb) | WASD / arrows |
| Punch | PUNCH button | J |
| Kick | KICK button | K |
| Roll (dodge) | ROLL button, above PUNCH | Space, Shift or L |
| Pick an upgrade | tap a card | click |
| Pause | ‖ (also pauses when the app goes to the background) | Esc |

## Win and lose

Win at 5:00. Lose at 0 health (the shop's **Revive** gets you up once per run). The results screen shows time, KOs, level and coins earned, and whether it's a new best.

## Juno

100 health, 5.2 m/s. After a hit, she can't be hurt again for 0.75 s. Every run starts with Wrench Toss level 1, so something is always hitting even while she's running away.

**Fighting (player asked: "punch: j kick: k"):** each press turns her toward the nearest Crow in range and hits every Crow in an arc in front of her. Up to two presses during a move are kept and come out in order as each move ends. A finisher steps her in toward a Crow just out of reach. She moves at 70 % speed while swinging.

| Move | Damage | Reach | Arc | Takes |
|---|---|---|---|---|
| Punch (J) | 11 | 1.8 m | 120° | 0.26 s, alternating fists |
| Kick (K) | 17, pushes hard, short freeze | 2.2 m | 150° | 0.42 s |

**Combos:** presses within 0.6 s of each other build a string (shown under the timer as P / K). When the string ends in one of these, that press becomes a finisher:

| Combo | Finisher |
|---|---|
| P P P · TRIPLE JAB | both fists, x2 damage |
| P P K · ROUNDHOUSE | spinning kick, hits all around, x1.8 |
| K K P · UPPERCUT | one huge hit up front, x3.4, big knockback |
| K P K · DROP KICK | she flies forward feet first, x2.4 |
| P K P K · FURY | double spin shockwave all around, x2.6, +2 coins |

Finishers that land shake the screen, freeze the roof briefly and (except TRIPLE JAB) add coins. A hit counter ("12 HITS") shows while hits keep landing.

**Roll:** the player asked for a roll button. ROLL sends Juno about 3–4 m in a somersault the way the thumb points (or straight ahead when standing still):
- **Timing:** 12 m/s easing off over 0.32 s, then a 1.4 s cooldown. The button empties and refills as a ring, and its label fades until the roll is back.
- **Safe while rolling:** for 0.4 s nothing can hurt her: Crows, thrown wrenches, or Grudge's smash.
- **Through the crowd:** she slips through Crows instead of being blocked. A roll cancels the current move and the combo string.

## Crows

All Crows have contact damage: touching Juno hurts her, then that Crow waits 0.7 s before it can again.

| Crow | Arrives | Health | Speed | Hits for | Notes |
|---|---|---|---|---|---|
| grunt (blue) | 0:00 | 20 | 2.2 | 6 | the swarm |
| runner (purple) | 0:25 | 12 | 4.0 | 6 | arrives in pairs |
| thrower (orange) | 0:55 | 26 | 2.0 | 10 | keeps 5–6.5 m away and throws wrenches |
| brute (maroon, big) | 1:40 | 95 | 1.6 | 13 | heavy, hard to push, often drops a soda can |
| Grudge (boss) | 1:30 · 3:00 · 4:00 | 450+ | 1.9 | 20 smash | red warning circle fills for 1.15 s, then he slams it |

- **Spawning:** spawns start at 0.7 per second, and about one more per second is added every minute (up to 6.5 per second).
- **Getting tougher:** Crow health grows about 1 % per second of the run.
- **Where they come from:** they climb in over the edges, at least 8 m from Juno.
- **Healing:** about 3.5 % of KOs drop a soda can that heals 15.

## Level-up cards (each up to level 5)

| Card | What it does |
|---|---|
| Haymaker | punches and kicks +25 % damage per level |
| Quick Hands | punches and kicks 12 % faster per level |
| Long Arms | +0.3 m reach and wider swings per level |
| Orbit Pipes | 1–4 pipes spin around Juno and hit what they touch |
| Wrench Toss | auto-throws wrenches at nearby Crows (more, faster; they go through two Crows from level 4) |
| Shockwave | a stomp every few seconds that hurts and knocks back everything nearby |
| Sneakers | +10 % speed per level |
| Coin Magnet | pulls coins from further away |
| Iron Skin | +20 max health and heal 20 |
| Second Wind | heal 4 every few KOs |

XP needed: 5 for level 2, then 4 more for each level after that.

## Shop (kept forever)

Might (+8 % damage per level) · Vitality (+15 health per level) · Swift (+5 % speed per level) · Greed (+15 % coins per level) · Revive (once per run). Prices go up with each level.

## Camera and look

The camera is low and angled (player asked to "make this 3D" and chose a lower angled view): 6.8 m up and 8.5 m behind Juno, looking 3.5 m ahead of her, so the roof, the parapet and the city skyline beyond read in depth. It follows Juno and leans a little toward the middle of the roof. Juno stands on a bright yellow ring. Everything is in the comic style: toon shading, black outlines, painted textures.

Feedback on every action:
- **On hits:** white flashes, sparks, comic KO words, screen shake and haptics.
- **Warnings:** a red circle before Grudge's smash.
- **When Juno is hurt:** she flashes red and the damage number pops up.

## Objects

From the asset list (`assets.json`): Juno, the Crow model in four colours (grunt, runner, thrower, and the bigger brute), Grudge, crate, water tank, and the pipe and wrench. Built in code: the roof, wall, skyline and neighbouring rooftops, lamp posts, coins, soda cans, the stomp ring and the boss warning ring.

## Tuning and tests

Every number is in `src/survivor/config.js`, and the debug panel (`` ` ``) has sliders for all of them. `npm run test:survivor` plays it on an iPhone-sized screen:

- **Tap-through:** title → PLAY → drag → ROLL → PUNCH and KICK buttons → J J K makes a ROUNDHOUSE and K K J an UPPERCUT → KOs from pressing J/K → level-up card → pause → give up → results → shop purchase kept after a reload.
- **Two bot runs:** the bot fights with the combo strings. They check that it lands at least four different combos, that nothing goes into a wall, nothing gets stuck in open space, the draw calls stay low, the first boss is reached, and level 8 is reached.

The bot is a simple player. Its runs last 1:30–3:00 with no shop upgrades, which is a fair first-run length for the genre. Real playtesting should decide the final curve.
