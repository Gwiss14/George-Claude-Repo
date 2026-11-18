# Roof Rumble — design (one page)

The App Store game. One thumb, phone held upright, 5-minute runs. Juno holds the roof against swarms of Tin Crows; she fights on her own, the player steers her, picks upgrades and survives. It replaced the two earlier modes as the front of the app (they stay under "Classic modes") after the player said the games "absolutely suck" and asked to "think like an App Store game dev".

## Why this shape

- **One thumb, no buttons:** drag anywhere to move; attacks are automatic. Learnable in seconds, playable one-handed on a bus.
- **Short runs with a goal:** survive 5:00, with an instant "PLAY AGAIN".
- **A decision every 20–40 seconds:** each level-up offers 1 of 3 upgrade cards. That choice is what makes each run different.
- **Something kept after every run:** banked coins buy permanent upgrades, so even a loss moves you forward.
- **Swarms:** 20–60 Crows on screen. They are drawn as instanced parts: about 150 draw calls at the busiest moment, so older iPhones stay smooth.

## Core loop

Move → Juno punches the nearest Crow, and her weapons fire on their own → knocked-out Crows burst into coins → coins fill the XP bar → level up: pick 1 of 3 cards → more and tougher Crows → Grudge at 1:30, 3:00 and 4:00 → survive to 5:00 → coins banked → shop → play again.

## Controls

| | Touch | Keyboard |
|---|---|---|
| Move | Touch and drag anywhere (a floating stick follows the thumb) | WASD / arrows |
| Fight | automatic | automatic |
| Pick an upgrade | tap a card | click |
| Pause | ‖ (also pauses when the app goes to the background) | Esc |

## Win and lose

Win at 5:00. Lose at 0 health (the shop's **Revive** gets you up once per run). The results screen shows time, KOs, level and coins earned, and whether it's a new best.

## Juno

100 health, 5.2 m/s. She punches every 0.42 s in a jab, cross, kick cycle (10 / 12 / 18 damage), and each punch hits every Crow within 1.9 m in a 140° arc in front of her. Kicks push Crows back hard and freeze the roof for a split second. After a hit, she can't be hurt again for 0.75 s. Every run starts with Wrench Toss level 1, so something is always hitting even while she's running away.

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
| Haymaker | punches +25 % damage per level |
| Quick Hands | punches 12 % faster per level |
| Long Arms | +0.3 m reach and a wider swing per level |
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

The camera looks steeply down from 15 m up and 5.5 m behind, following Juno, and never shows past the north edge. Around the roof you see other rooftops and the street far below. Juno stands on a bright yellow ring. Everything is in the comic style: toon shading, black outlines, painted textures.

Feedback on every action:
- **On hits:** white flashes, sparks, comic KO words, screen shake and haptics.
- **Warnings:** a red circle before Grudge's smash.
- **When Juno is hurt:** she flashes red and the damage number pops up.

## Objects

These are the same people and props as the asset list (`assets.json`): Juno, the Crow model in three colours plus the big brute, Grudge, crate, water tank and lamp post. New, built in code: soda cans, wrench projectiles, the stomp ring and the boss warning ring.

## Tuning and tests

Every number is in `src/survivor/config.js`, and the debug panel (`` ` ``) has sliders for all of them. `npm run test:survivor` plays it on an iPhone-sized screen:

- **Tap-through:** title → PLAY → drag → automatic KOs → level-up card → pause → give up → results → shop purchase kept after a reload.
- **Two bot runs:** they check that nothing goes into a wall, nothing gets stuck in open space, the draw calls stay low, the first boss is reached, and level 8 is reached.

The bot is a simple player. Its runs last 1:30–3:00 with no shop upgrades, which is a fair first-run length for the genre. Real playtesting should decide the final curve.
