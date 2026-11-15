# Soluna Rooftop — Game Design (one page)

You are **Juno**, a bike courier who boxes. The **Tin Crows** gang has taken over the rooftop where she parks, and they keep coming. Survive as many waves as you can; their boss **Grudge** leads every fifth wave.

## Core loop

Walk up to an enemy → press attack to throw a jab, keep pressing to chain cross and kick → roll out of the way when an enemy winds up → defeated enemies burst into coins → grab them → between waves, spend coins at the weapon rack → finish the wave → get a little health back → new weapons unlock → next, harder wave, forever.

One level (one rooftop), one loop. Besides moving, the player does two things: **attack** (one button, three-hit combo; the same button buys a weapon while standing on a pad at the rack) and **roll**. No jump, no block.

**Roll:** a quick forward roll the way the stick points (straight ahead if it is centred): about 2 m in 0.38 s, fast at first and slowing down. For the first 0.28 s nothing can hit Juno; an enemy attack that would have landed then pops "DODGE!" and is used up. 0.3 s after a roll ends Juno can roll again. A roll pressed during an attack waits until the hit is over and then cuts off the follow-through; an attack pressed during a roll comes out as a jab the moment the roll ends; a roll pressed up to 0.15 s too early still happens. Rolling resets the combo. A rolling Juno gives way to other fighters (she bounces off them, she never squashes them into a wall).

**Wave modifiers:** from wave 2, a wave can get one rule that changes it. Its name shows in the wave banner and in a chip under the wave label for the whole wave, and it ends when the wave is cleared.

| Modifier | What changes |
|---|---|
| Fast Crows | Enemies move 35 % faster |
| Tough Crows | Enemies have 50 % more health and drop twice the coins |
| Payday | Enemies drop twice the coins |
| Glass Jaw | Every hit does 50 % more damage, both ways |
| Fists Only | Juno's weapon is put away and comes back (same wear) when the wave is cleared; the rack is closed; her punches do 25 % more damage |
| Swarm | 3 more Crows, every enemy has 40 % less health |

Waves 1 and every boss wave are plain. From wave 2, about a quarter of waves stay plain and the rest get a random modifier, never the same one twice in a row; Fast Crows and Payday can come from wave 2, Tough Crows, Fists Only and Swarm from wave 3, Glass Jaw from wave 4 (all in `config.js`). Add `?mod=swift` (or any name above in code form: swift, tough, payday, glass, fists, swarm) to the address to force one on every wave, or `?mod=none` to turn them off.

**Combo finisher:** when all three hits of one chain land (none miss), the third hit triggers a finisher: a short slow motion (0.12 s of game time at 30 % speed), a big "COMBO!" comic burst, a camera jolt, a sound, and 2 bonus coins. Every landed hit of the chain pops a comic word (BAP! WHAM! KA-POW!, or CLANG! KLONK! KRASH! with a weapon).

**Coins:** a Crow drops 3, an elite 5, Grudge 10. They burst out, bounce, slide toward Juno when she is within 2 m, and are picked up within 0.7 m. A coin left on the floor blinks after 12 s and disappears at 15 s. Coins are kept between waves and reset on restart.

**Weapons spot:** a tool rack against the back wall with five pads in front of it, each with its weapon turning above it. A pad stays dim and empty until its weapon unlocks; more weapons unlock as waves are cleared. Stand on a lit pad and press attack to buy. A weapon replaces the current one and breaks after a number of landed hits; then Juno is back to fists.

| Weapon | On sale from | Cost | Breaks after | Damage | Reach | Speed | Extra |
|---|---|---|---|---|---|---|---|
| pipe | wave 1 | 6 coins | 15 hits | ×1.5 | +0.4 m | same | third swing knocks Crows down |
| hammer | wave 2 | 12 coins | 10 hits | ×2.2 | +0.5 m | 35 % slower | every swing knocks Crows down |
| wrench | wave 4 | 9 coins | 25 hits | ×1.3 | +0.2 m | 20 % faster | lasts longest |
| shovel | wave 6 | 15 coins | 14 hits | ×1.8 | +0.8 m | 10 % slower | longest reach |
| axe | wave 9 | 24 coins | 12 hits | ×3.0 | +0.5 m | 25 % slower | every swing knocks Crows down |

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | WASD or arrow keys | Drag on the left half of the screen (floating thumb-stick) |
| Attack (or buy, on a pad) | J or Space | Big button, bottom right |
| Roll | K or Shift | ROLL button, left of the attack button |
| Restart | R, or the Restart button | Restart button |
| Debug panel | ` (backquote) | Add `?debug` to the address |

## Win and lose

Waves never end; the score is how far you get.

- **Lose:** Juno's health (100) reaches zero. She stays down; the end screen shows the wave reached and your best wave (kept in the browser).
- **Waves** are built from config numbers: wave 1 has 2 Crows, about 0.6 more each wave, up to 9. Orange elites start in wave 2 and grow by about one every three waves. **Grudge** leads every 5th wave. At most 5 enemies are on the roof at once; the rest climb in over the back wall as others fall.
- **Getting harder:** each wave, enemy health +8 %, enemy damage +5 %, and the gap between enemy attacks shrinks by 0.03 s (from 0.8 s down to 0.45 s). Up to 2 enemies may attack at once from wave 3, and 3 from wave 8.
- Clearing a wave gives back 25 health, and there are 3.5 s before the next wave to pick up coins or buy a weapon. After a boss wave Juno cheers for a second. Restart resets everything to wave 1.

## Camera

Fixed angle, never rotates. It stands on the south side of the roof, about 11 m back and 8 m up, looking north and down at about 35°, and slides sideways a little to keep Juno in view. On a phone held upright it looks down more steeply, shows about 8.5 m of the roof's width and follows Juno sideways (fitting the whole 16 m width made fighters too small). It sees fighters from every side as they turn, and their **front** most often.

## Everything on screen

Sizes are width × height × depth in metres. Everything is built facing +Z (toward the camera).

| id | What it is | Count | Size (m) | Faces | Body |
|---|---|---|---|---|---|
| `juno` | Player, courier boxer | 1 | 0.6 × 1.7 × 0.6 | Nearest enemy while attacking, else the way she moves | Person (bones) |
| `crow` | Gang scrapper, lean | up to 3 at once | 0.6 × 1.7 × 0.6 | Juno | Person (bones) |
| `crow_elite` | Same shape as `crow`, orange outfit, tougher (shares the crow model, recoloured) | 1 | same | Juno | Person (bones) |
| `grudge` | Boss, a much bigger person | 1 | 0.9 × 2.2 × 0.9 | Juno | Person (bones) |
| `crate` | Wooden crate, solid | 4 | 1.0 × 1.0 × 1.0 | Random quarter turn | Prop |
| `water_tank` | Round tank on legs, solid | 1 | 2.0 × 2.5 × 2.0 | +Z | Prop |
| `lamp_post` | Roof lamp, solid, lights the scene | 2 | 0.3 × 3.5 × 0.3 | +Z | Prop |
| `weapon_rack` | The weapons spot: a pegboard tool rack | 1 | 1.8 × 2.0 × 0.5 | +Z (toward the camera), against the back wall | Prop |
| `weapon_pad` | Hazard-striped floor ring in front of the rack, one per weapon (built in code) | 5 | 0.9 across | — | Floor marking |
| `weapons` | One model with five parts: `pipe`, `hammer`, `wrench`, `shovel`, `axe` | 1 of each on display, 1 in hand | pipe 1.0 · hammer 1.1 · wrench 0.75 · shovel 1.15 · axe 1.0 m long | each part's length along +Z, grip at its origin | Parts (held) |
| `coin` | Gold coin (built in code) | many | 0.3 × 0.3 × 0.04 | stands on edge, spins | Pickup |
| `roof` | The ground: flat rooftop | 1 | 16 × 0.5 × 10 | — | Ground |
| `parapet` | Low wall around the roof | 1 | 16 × 0.6 × 10 ring, 0.3 thick | — | Level edge |
| `sky` | Sunset sky with a far skyline | 1 | — | — | Sky |

Layout: the roof is 16 m wide (X) and 10 m deep (Z). The water tank stands in the back-left corner, lamp posts against the back wall at the left and right, the weapon rack against the back wall right of centre with its two pads in front of it, crates in two pairs against the left and right walls, leaving the middle open. Props touch the wall, so there are no gaps narrower than a fighter to get wedged in. Juno starts in the centre. Enemies climb in over the back wall.

## Characters and their states

All three are people on the same skeleton. Fighters are solid to each other and to props, and nobody can leave the roof.

**Juno** — health 100, moves 4.5 m/s.

| State | Animation | Switches when |
|---|---|---|
| idle | idle | Not moving |
| run | run | Moving |
| jab / cross / kick | see attacks | Attack pressed; a press during an attack queues the next in the chain |
| swing / backswing / overhead | slash · backswing (Text to Motion) · overhead (Text to Motion) | Same chain while holding a weapon |
| roll | roll (Text to Motion) | Roll pressed; 0.38 s, cannot be hit for the first 0.28 s; then idle, or a jab if attack was pressed during it |
| hurt | hit_to_body_01 | Hit by a jab; 0.3 s |
| knocked_down | defeat_02, then reversed to stand | Hit by Grudge's smash; 1.0 s down, then cannot be hit for 0.6 s |
| defeated | defeat_02, held | Health zero |
| win | cheer | A boss wave cleared; 1 s, then idle |

**Crow** — health 30 (elite 45), moves 2.6 m/s. **Grudge** — health 140, moves 2.0 m/s, cannot be knocked down.

| State | Animation | Switches when |
|---|---|---|
| enter | walk | Spawns; walks in from the back wall |
| circle | walk | Not its turn: keeps 2.5–3.5 m from Juno, drifting sideways |
| approach | walk (Crow elite: run) | Its turn: closes to attack range |
| windup → attack | see attacks | In range and its turn |
| hurt | hit_to_body_01 (kick: hit_to_head) | Hit; 0.3 s, pushed back |
| knocked_down | defeat_02, then reversed to stand | Crow hit by Juno's kick; 1.2 s |
| defeated | defeat_02, held, then fades | Health zero |

## Attacks

"Lands" and "ends" are fractions of the attack's time in the game. The library clips are much slower, so each is trimmed and sped up to the length shown.

| Who | Attack | Animation | Damage | Length | Lands | Ends | Reach | Effect |
|---|---|---|---|---|---|---|---|---|
| Juno | jab | box_01 | 8 | 0.30 s | 0.35 | 0.55 | 1.3 m | Push 0.4 m |
| Juno | cross | box_02 | 12 | 0.36 s | 0.45 | 0.65 | 1.4 m | Push 0.6 m |
| Juno | kick | front_kick_01 | 20 | 0.50 s | 0.45 | 0.65 | 1.7 m | Push 2.5 m, knocks Crows down |
| Crow | jab | box_01 | 8 (elite 10) | 0.70 s | 0.60 | 0.75 | 1.3 m | Push 0.4 m |
| Grudge | jab | box_01 | 10 | 0.70 s | 0.60 | 0.75 | 1.6 m | Push 0.6 m |
| Grudge | smash | smash (Text to Motion; fallback slash) | 22 | 1.20 s | 0.62 | 0.76 | 2.0 m | Push 2.0 m, knocks Juno down |

Fight feel: a landed hit freezes both fighters for 0.07 s. A fighter that was just hit cannot be hit again for 0.25 s. The combo resets 0.5 s after Juno's last attack. Enemies take turns: only one may attack at a time (two in wave 3), with at least 0.8 s between enemy attacks; the rest circle. Grudge uses the smash every third attack.

Weapon attacks reuse Juno's chain timing (same lands / ends fractions) with the weapon's multipliers applied; the third swing (overhead) counts as the kick for knockdowns and for the combo finisher.

## Held weapons: one slot

There are no machines or breakable parts. Weapons are the only swappable parts, and only Juno holds them.

| Slot | Attach point (from the centre of the feet) | How a part sits on it |
|---|---|---|
| `hand_r` | Centre of the right fist. With arms hanging: 0.25 m to her right, 0.70 m up. In the T-pose: about 0.85 m to her right, 1.3 m up. | The weapon's grip sits on the point and its length (+Z of the weapon) points along the arm, away from the shoulder. Each weapon is scaled so its length fits the slot: pipe 1.0, hammer 1.1, wrench 0.75, shovel 1.15, axe 1.0 m. |
