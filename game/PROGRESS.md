# Progress

## Done
- Stage 1, Design: GDD.md for the fighting game (first called "Tank Roof Scrap", renamed "Soluna Rooftop" at the player's request). Player approved and chose the comic look.
- Stage 2, Greybox: playable in the browser with keyboard and touch. Three.js + Vite, no engine.
  - `src/config.js`: every tunable number. Debug panel (` key or ?debug) has sliders for all of them.
  - `src/view/registry.js`: the only place that decides looks (id -> builder). Placeholders face +Z, people have named parts with their own hinges.
  - `src/game/`: gameplay only (states, combo queue, hit-stop, knockback, invulnerability, enemy turn-taking, waves, collisions). Knows nothing about looks.
  - Fixed 120 Hz gameplay steps with interpolated drawing (smooth at 60/120/144 Hz).
  - Comic look in code: toon materials with three hard light bands, black inside-out outline shells.
  - Tests: `npm test` builds, then checks keyboard, combo, debug panel, restart, a good bot (full round), a bad bot (holds into walls and props), phone touch, and frame smoothness.

## Decided
- Player said "surprise me", then asked for a fighting game, then picked the comic look.
- Juno vs three waves of Tin Crows on a rooftop; boss Grudge in wave 3. One attack button, three-hit combo.
- All three characters are people on one humanoid skeleton; Grudge is a bigger humanoid; crow_elite reuses the crow model in orange.
- The game lives in `game/` inside the existing repository (its root was not empty).
- Phone held upright: steeper camera showing ~8.5 m of width that follows Juno (whole width made fighters too small).
- Props sit flush against the walls; if a fighter is ever squeezed inside something, it is put back where it was last step.
- Grudge's smash uses a Text to Motion clip (two-fist overhead slam); library 'slash' is a one-arm swing and is only the fallback.
- Texture plan: shrink fighters to 1024 and props to 512 on load (about 50 MB instead of about 640 MB).
- From the playbook notes, for later stages: 2K textures, Select All animations and "stay in place" on export, recentre clips on the hips, front_kick_01 may really be a side kick, measure when each attack really lands, count the outline in the triangle budget.

- Endless waves (player asked): wave rosters grow from config numbers, Grudge every 5th wave, reinforcements climb in (max 5 on the roof), enemies +8 % health / +5 % damage per wave, best wave kept in the browser. No win screen any more.
- More weapons unlock as waves are cleared (player asked): pipe 1, hammer 2, wrench 4, shovel 6, axe 9; five pads in front of the rack. The five weapons are now one Tripo 'parts' model (`weapons.glb`), replacing the pipe and hammer entries, so assets.json has 7 entries. TRIPO.md regenerated.

- Dodge roll and wave modifiers (player asked): roll on K / Shift / ROLL button, 0.28 s of i-frames, a "DODGE!" pop when it saves Juno, roll-cancel out of an attack's follow-through and roll-into-jab. Six wave modifiers in config (Fast Crows, Tough Crows, Payday, Glass Jaw, Fists Only, Swarm) with a chip under the wave label; `?mod=<name>` forces one. A rolling fighter gives way completely in collisions (otherwise a roll squashed pinned Crows into walls, 0.27 m overlap).
- Enemies now climb in only where nobody stands within 1 m (`waves.spawnClear`), at the clearest of the five spawn points; otherwise they wait in the wave's queue. Before, a Crow could appear on top of Juno or a pinned Crow at the back wall (up to 0.34 m overlap); Swarm made it common.
- Tests now drive the Chrome already installed on this PC via `playwright-core` when the full `playwright` package is missing (`npm install --no-save playwright-core`); no browser is downloaded. Output path fixed for Windows; empty inline favicon stops a 404 in real Chrome.

## Known / open
- New Juno state `roll` needs a Text to Motion clip (added to assets.json; TRIPO.md not regenerated yet).
- Modifiers are random from wave 2 (boss waves plain, no repeats, 25 % plain). Tune plainChance and each modifier's `from` after playing.
- New Juno states swing/backswing/overhead need animations: slash, plus two Text to Motion clips (listed in assets.json).
- The good bot never needs to block, and loses only 8 health in a full round: the game may be too easy for a careful player. Tune enemy speed, attackGap or damage after the player tries it.
- Draw calls are high (~170 at the busiest moment, half of it the shadow pass) because every placeholder part is its own mesh plus outline. Models in stage 5 will lower this.

- After stage 3, player asked for: combo animations, coins dropped by defeated enemies, weapons and a weapons spot, and textures. Done in the greybox:
  - Combo finisher (all three hits land): slow motion, COMBO! burst, +2 coins; comic words on every hit.
  - Coins drop and are collected; tool rack on the back wall with pipe (6) and hammer (12) pads; weapons hang on Juno's hand_r attach point and break after 15 / 10 hits.
  - Canvas textures painted in code for roof, parapet, building, skyline, crates, tank, rack and pads.
- Stage 3, Asset list: assets.json with 8 Tripo entries: juno, crow (+ crow_elite texture), grudge, crate, water_tank, weapon_rack, pipe, hammer. Lamp posts, coins, pads, roof, parapet and sky are built in code. Waiting for feedback.

- Stage 4: TRIPO.md has the table of all the models and the export settings. Waiting for the player to make them in Tripo Studio and put the GLBs in public/assets/.

## Next
- Stage 5, Swap: load each GLB in place of its placeholder (when the player says they are in).
