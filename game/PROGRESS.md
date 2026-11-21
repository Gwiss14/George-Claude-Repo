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

- Endless waves (player asked): wave rosters grow from config numbers, Grudge every 5th wave, reinforcements climb in (max 5 on the roof), enemies +8 % health / +5 % damage per wave, best wave kept in the browser. No win screen any more.
- More weapons unlock as waves are cleared (player asked): pipe 1, hammer 2, wrench 4, shovel 6, axe 9; five pads in front of the rack. The five weapons are now one Tripo 'parts' model (`weapons.glb`), replacing the pipe and hammer entries, so assets.json has 7 entries. TRIPO.md regenerated.

- Shooter mode (player asked in a comment on the game page: "Make this a FPS"; chose a shooter with guns, on a separate new page): `fps.html` + `src/fps/`, design in FPS.md. First-person camera, mouse/touch aim, pistol plus five rack guns (smg, shotgun, rifle, splat launcher, minigun), headshots, hit streak combos, elites throw wrenches. Reuses the brawler's waves, enemies, coins and rack by extending Game and View. `npm run test:fps` checks controls, a good bot (7 waves incl. a boss wave) and a bad bot.
- The live brawler page (claude.ai artifact) was republished from elsewhere as "Soluna Rooftop" with a roll/dodge and wave modifiers. That source is not in this repository; it was left untouched.

- iPhone app (player asked "Dedicate this for an iPhone app"; chose both a Home Screen web app and a native Xcode project, with both games in one app): start menu `index.html` (brawler moved to `brawler.html`), Home Screen manifest, icons and offline service worker, a Capacitor `ios/` project with haptics, full screen and no status bar. Instructions in IPHONE.md. `npm run test:app` checks the menu, Home Screen files, offline play and iPhone portrait/landscape.

- PIVOT (player: "These games absolutely suck", then "Think like an App Store game dev"): Roof Rumble is now a one-thumb portrait survivor (ROOF-RUMBLE.md, `index.html`, `src/survivor/`). Auto-attacking Juno, swarms of Crows drawn as instanced parts, level-up cards, Grudge bosses, 5-minute runs, permanent shop. The brawler and the shooter moved under "Classic modes" (`modes.html`). `npm run test:survivor`.

- Player chose to keep only Roof Rumble ("Keep the rooftop brawl game. Stop the other game." → picked Roof Rumble). The brawler (Tank Roof Scrap) and the shooter (Rooftop Shootout) were removed from the app and the repository (still in git history). GDD.md is now the Roof Rumble design; assets.json lists only what Roof Rumble shows.

- ROLL button (player asked): a dodge-roll with a short safe window and a cooldown ring on the button. It passes through Crows and dodges Grudge's smash. The bot uses it when boxed in or when a smash is coming, and the tests check direction, safety and cooldown.

## Known / open
- Survivor difficulty is tuned against a simple bot (first runs 1:30–3:00 with no shop upgrades). Needs real playtesting on a phone.
- The Home Screen web app needs a public https address; no host chosen yet (must ask the player before creating any public page or account).
- The native app was generated on Linux and has not been built in Xcode yet (needs the player's Mac).
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
