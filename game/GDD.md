# Tank Roof Scrap — Game Design (one page)

You are **Juno**, a bike courier who boxes. The **Tin Crows** gang has taken over the rooftop where she parks. Clear three waves of them, the last led by their boss **Grudge**.

## Core loop

Walk up to an enemy → press attack to throw a jab, keep pressing to chain cross and kick → back off when an enemy winds up → finish the wave → get a little health back → next wave.

One level (one rooftop), one loop. The only thing the player does besides moving is **attack**: one button, three-hit combo. No jump, no block, no dodge button; you dodge by walking away.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | WASD or arrow keys | Drag on the left half of the screen (floating thumb-stick) |
| Attack | J or Space | Big button, bottom right |
| Restart | R, or the Restart button | Restart button |
| Debug panel | ` (backquote) | Add `?debug` to the address |

## Win and lose

- **Win:** all three waves are knocked out. Juno cheers.
- **Lose:** Juno's health (100) reaches zero. She stays down.
- Waves: **1** two Crows · **2** three Crows, one of them an elite (orange) · **3** Grudge and two Crows.
- Clearing a wave gives back 25 health. Restart resets everything to wave 1.

## Camera

Fixed angle, never rotates. It stands on the south side of the roof, about 11 m back and 8 m up, looking north and down at about 35°, and slides sideways a little to keep Juno in view. On a phone held upright it pulls back until the roof's width fits. It sees fighters from every side as they turn, and their **front** most often.

## Everything on screen

Sizes are width × height × depth in metres. Everything is built facing +Z (toward the camera).

| id | What it is | Count | Size (m) | Faces | Body |
|---|---|---|---|---|---|
| `juno` | Player, courier boxer | 1 | 0.6 × 1.7 × 0.6 | Nearest enemy while attacking, else the way she moves | Person (bones) |
| `crow` | Gang scrapper, lean | up to 3 at once | 0.6 × 1.7 × 0.6 | Juno | Person (bones) |
| `crow` (elite) | Same shape, orange outfit, tougher | 1 | same | Juno | Person (bones) |
| `grudge` | Boss, a much bigger person | 1 | 0.9 × 2.2 × 0.9 | Juno | Person (bones) |
| `crate` | Wooden crate, solid | 4 | 1.0 × 1.0 × 1.0 | Random quarter turn | Prop |
| `water_tank` | Round tank on legs, solid | 1 | 2.0 × 2.5 × 2.0 | +Z | Prop |
| `lamp_post` | Roof lamp, solid, lights the scene | 2 | 0.3 × 3.5 × 0.3 | +Z | Prop |
| `roof` | The ground: flat rooftop | 1 | 16 × 0.5 × 10 | — | Ground |
| `parapet` | Low wall around the roof | 1 | 16 × 0.6 × 10 ring, 0.3 thick | — | Level edge |
| `sky` | Sunset sky with a far skyline | 1 | — | — | Sky |

Layout: the roof is 16 m wide (X) and 10 m deep (Z). The water tank stands in the back-left corner, lamp posts at the back-left and back-right, crates in two pairs near the left and right walls, leaving the middle open. Juno starts in the centre. Enemies climb in over the back wall.

## Characters and their states

All three are people on the same skeleton. Fighters are solid to each other and to props, and nobody can leave the roof.

**Juno** — health 100, moves 4.5 m/s.

| State | Animation | Switches when |
|---|---|---|
| idle | idle | Not moving |
| run | run | Moving |
| jab / cross / kick | see attacks | Attack pressed; a press during an attack queues the next in the chain |
| hurt | hit_to_body_01 | Hit by a jab; 0.3 s |
| knocked_down | defeat_02, then reversed to stand | Hit by Grudge's smash; 1.0 s down, then cannot be hit for 0.6 s |
| defeated | defeat_02, held | Health zero |
| win | cheer | Wave 3 cleared |

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
| Grudge | smash | slash | 22 | 1.20 s | 0.62 | 0.76 | 2.0 m | Push 2.0 m, knocks Juno down |

Fight feel: a landed hit freezes both fighters for 0.07 s. A fighter that was just hit cannot be hit again for 0.25 s. The combo resets 0.5 s after Juno's last attack. Enemies take turns: only one may attack at a time (two in wave 3), with at least 0.8 s between enemy attacks; the rest circle. Grudge uses the smash every third attack.

No machines, breakable parts or swappable parts in this game, so there are no parts lists or attach points.
