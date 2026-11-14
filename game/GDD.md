# Lamplight Meadow — Game Design (one page)

You are **Wick**, a young lamplighter on a small floating meadow at dusk. Light all eight lanterns before night falls. Sleepy fog-creatures called **Snuffs** crawl around putting them back out.

## Core loop

Run to an unlit lantern → it lights when you touch it → Snuffs crawl to lit lanterns and put them out → run back and relight, or get ahead of them → all 8 lit at the same moment wins.

One level, one loop. No jumping, no fighting. The only thing the player does is **run**.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Run | WASD or arrow keys | Drag anywhere on screen (a floating thumb-stick appears under the finger) |
| Restart | R, or the Restart button | Restart button |
| Debug panel | ` (backquote) | Add `?debug` to the address |

## Win and lose

- **Win:** all 8 lanterns are lit at once. The beacon in the middle flares up and Wick cheers.
- **Lose:** the 90-second dusk timer runs out. The sky goes dark and Wick slumps.
- After either, a Restart button resets the whole round.

## Camera

Fixed-angle follow camera, never rotates. It looks down at about 55° from 14 m away and glides after Wick. Held upright on a phone it pulls back so the meadow's width still fits. Wick mostly runs away from or across the camera, so the camera sees his **back and top** most.

## Rules in numbers (all tunable later)

- Wick runs 6 m/s. A lantern lights when Wick comes within 1.2 m of it.
- 3 Snuffs. Wander at 1.4 m/s; when a lantern is lit, the nearest free Snuff heads for it at 2.0 m/s. Two Snuffs never target the same lantern.
- A Snuff needs 1.5 s next to a lantern to put it out, then dozes for 4 s before looking for another.
- Bumping into a Snuff knocks Wick down: pushed back 2 m, 1.2 s on the ground, then 1 s where he cannot be knocked down again. Snuffs are never harmed.
- Wick, Snuffs, rocks, trees, lanterns and the beacon are solid. Nobody can leave the meadow.

## Everything on screen

Sizes are width × height × depth in metres. Every object is built facing +Z; "faces" says where +Z points in the level.

| id | What it is | Count | Size (m) | Faces | Body |
|---|---|---|---|---|---|
| `wick` | Player, the lamplighter | 1 | 0.6 × 1.4 × 0.6 | The way he runs | Person (bones) |
| `snuff` | Fog-creature, a fat grub with a domed back | 3 | 0.7 × 0.6 × 0.9 | The way it crawls | Not a person: one piece, moved in code |
| `lantern` | Lantern on a post | 8 | 0.4 × 1.8 × 0.4 | Toward the beacon | Prop |
| `beacon` | Big stone lamp tower in the centre | 1 | 1.6 × 4.0 × 1.6 | Toward the camera (+Z) | Prop |
| `rock` | Boulder, blocks the way | 6 | 1.5 × 1.0 × 1.2 | Random turn | Prop |
| `tree` | Round-topped tree, blocks the way (trunk only) | 5 | 2.4 × 3.5 × 2.4 | Random turn | Prop |
| `meadow` | The ground: a flat round island | 1 | 32 across, 1 thick | — | Ground |
| `rim` | Low stone edge around the meadow | 1 | 32 across, 0.4 high | — | Level edge |
| `sky` | Dusk sky that darkens with the timer | 1 | — | — | Sky |

Layout: the beacon sits in the centre. The 8 lanterns stand in a rough ring 10–13 m out, unevenly spaced. Rocks and trees are scattered between the beacon and the ring so there is no straight line across. Wick starts 3 m in front of the beacon. Snuffs start at three points on the rim.

## Animated characters

**Wick — a person, animated with bones.**

| State | Looks like | Switches when |
|---|---|---|
| idle | Standing, breathing | Not moving |
| run | Running | Moving |
| knocked_down | Falls over, lies, gets up | Touches a Snuff; back to idle/run after 1.2 s |
| win | Cheering | All 8 lanterns lit |
| lose | Slumps to the ground | Timer hits zero |

**Snuff — not a person, so no bones.** One blob-shaped body animated entirely in code (squash, stretch, bob, tilt).

| State | Looks like | Switches when |
|---|---|---|
| wander | Slow inch-worm squash and stretch | Default; no lit lantern free to target |
| seek | Faster squash, leans forward | A lit lantern is free; ends on arrival |
| snuffing | Rears up and puffs for 1.5 s | Reached its lantern; the lantern goes out at the end |
| doze | Flattened, slow breathing, 4 s | After snuffing; then back to wander |

**Lantern** (in code): `unlit` (dark), `lit` (glowing, small flicker), `fading` (flickers hard while a Snuff is snuffing it).

No attacks, no breakable machines and no swappable parts in this game, so there are no damage tables, parts lists or attach points.
