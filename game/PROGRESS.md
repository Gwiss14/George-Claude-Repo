# Progress

## Done
- Stage 1, Design: GDD.md for "Tank Roof Scrap" (fighting game). Player approved and chose the comic look.
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

## Known / open
- The good bot never needs to block, and loses only 8 health in a full round: the game may be too easy for a careful player. Tune enemy speed, attackGap or damage after the player tries it.
- Draw calls are high (~170 at the busiest moment, half of it the shadow pass) because every placeholder part is its own mesh plus outline. Models in stage 5 will lower this.

- Stage 3, Asset list: assets.json with 6 Tripo entries (juno and grudge are heroes; crow has a texture prompt for crow_elite). Roof, parapet and sky stay built in code. Waiting for feedback.

## Next
- Stage 4: one table of every entry, then the player makes them in Tripo Studio.
