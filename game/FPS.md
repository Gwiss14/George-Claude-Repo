# Rooftop Shootout — the shooter mode (one page)

The same rooftop, waves, Tin Crows, coins and weapon rack as *Tank Roof Scrap* (see GDD.md), seen through Juno's eyes and played with guns. It lives in `fps.html` / `src/fps/` and reuses the brawler's gameplay code, so both modes stay in step. The player asked for it on the game page ("Make this a FPS") and chose a shooter with guns, published as a separate page.

## Core loop

Aim and shoot the Crows climbing over the back wall → back away from the ones rushing you and sidestep the wrenches the elites throw → defeated Crows burst into coins → between waves, walk onto a pad at the tool rack and buy a gun → new guns unlock as waves are cleared → endless, harder waves.

## Controls

| Action | Keyboard and mouse | Touch |
|---|---|---|
| Aim | Mouse (click to lock it, Esc to free it; dragging also aims) · left/right arrows turn | Drag on the right half |
| Move | WASD / up and down arrows, relative to where you look | Drag on the left half (thumb-stick) |
| Shoot | Click or Space (hold for automatic fire) | Tap anywhere (a quick touch that doesn't drag) · or, while one finger aims or moves, put another finger down (hold to keep firing) · or hold FIRE |
| Reload | R (also automatic when the magazine is empty) | RELOAD (shown when it helps) |
| Buy | E on a pad | BUY (shown on a pad) |
| Debug panel | ` | add `?debug` |

## Win and lose

Waves never end. Lose when Juno's health reaches zero; the end screen shows the wave reached and the best wave. Waves grow exactly as in the brawler (GDD.md), Grudge every 5th wave.

## Camera

First person at 1.55 m eye height, 75° field of view, with walk bob, recoil kick, a small tilt when hit and a fall to the floor when knocked down. Juno's body is hidden. The gun in hand is drawn in its own pass after the world, so it never sinks into a wall.

## Guns

The pistol is always in hand and never runs out. A bought gun comes with its spare ammo; when it is empty, Juno goes back to the pistol.

| Gun | On sale from | Cost | Damage | Shots/s | Magazine | Spare ammo | Notes |
|---|---|---|---|---|---|---|---|
| pistol | start | — | 10 | 4 | 10 | ∞ | headshot ×2 |
| smg | wave 1 | 8 | 6 | 11 | 30 | 120 | wide spread |
| shotgun | wave 2 | 12 | 8 × 7 | 1.3 | 6 | 30 | 5+ pellets on one Crow knock it down |
| rifle | wave 4 | 15 | 45 | 1.6 | 5 | 25 | goes through up to 3 Crows, headshot ×2.5 |
| splat launcher | wave 6 | 22 | 60 blast | 0.9 | 4 | 12 | 2.2 m blast that knocks Crows down |
| minigun | wave 9 | 30 | 7 | 20 | 200 | 400 | walk at 70 % speed |

- **Headshot:** the top 18 % of a Crow counts as the head.
- **Combo:** 5 hits in a row without a miss pays out a COMBO, with a short slow motion and 2 bonus coins.
- **Flinching:** a Crow flinches at most every 0.5 s, so fast guns cannot stun-lock it.

## Enemies

- **Crows and Grudge** rush in and punch as in the brawler, taking turns.
- **Orange elites** mostly stay back and **throw a wrench**: an arcing throw at 9 m/s, aimed a little ahead of Juno, for 8 damage. Every third attack is a jab instead. A thrown wrench stops on props and the floor.

## New states and the animations they need

- **elite: throw.** Windup then release at 55 % of 0.8 s. Animation: `throw: a man winds back his right arm and throws a small object overhand, then returns to a ready stance` (Text to Motion).
- **Juno:** no new body animations (her body is never seen). The guns are new held props: they need models, listed below.

## Objects added

| id | What it is | Size (m) | Faces |
|---|---|---|---|
| `pistol`, `smg`, `shotgun`, `rifle`, `launcher`, `minigun` | Guns, built in code for now | 0.2 – 0.85 long | barrel along +Z, grip at the origin |

For Tripo, the five rack guns can be one model with parts, like the melee weapons (`weapons` in assets.json); the pistol is small and can stay built in code.
