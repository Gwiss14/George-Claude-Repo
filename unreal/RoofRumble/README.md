# Roof Rumble for Unreal Engine (5.4 or newer)

A C++ port of the web game in `game/` (`game/src/survivor/`). It uses no imported assets: everything is built from the engine's basic shapes when the game starts, so the project is only text files.

> **Status: written on Linux without Unreal.** The game logic (`RRSim.cpp`) was compiled with g++ and played headless through full runs. The Unreal parts (arena, HUD, game mode) have **never been compiled**. Expect one round of compile fixes on your PC.

## What's in it

| File | What it does |
|---|---|
| `RRConfig.h` | Every tuning number, copied from `game/src/survivor/config.js` |
| `RRSim.h/.cpp` | The whole game rules (Juno, Crows, Grudge, coins, cards, roll). Plain C++, knows nothing about drawing. |
| `RRArena.h/.cpp` | Builds the roof, lights, fog and camera, reads touch/keyboard, runs the sim at 60 steps a second and draws it with instanced meshes |
| `RRHUD.h/.cpp` | All screens drawn on the canvas: title, HUD, ROLL button, level-up cards, pause, results, shop |
| `RRSaveGame.h/.cpp` | Banked coins, best time, shop levels |
| `RRGameMode.h/.cpp` | Spawns the arena and sets the HUD |

The game starts on the engine's empty `Entry` map, so there is no level to open.

## Run it on Windows

1. Install **Visual Studio 2022** with the **"Game development with C++"** workload (and the Windows SDK it offers).
2. Pull this repository and open `unreal/RoofRumble/`.
3. Right-click `RoofRumble.uproject` → **Generate Visual Studio project files** (if that option is missing, pick your engine with **Switch Unreal Engine version** first).
4. Double-click `RoofRumble.uproject`. Answer **Yes** when it asks to build the missing modules. If the build fails, open `RoofRumble.sln`, build **Development Editor / Win64**, and read the errors (or hand them to Claude Code, below).
5. Press **Play** in the editor. The mouse acts as a finger: hold and drag to move, click ROLL. Keyboard: WASD/arrows to move, Space/Shift/K to roll, Esc to pause.
6. Phone layout: in the Play menu choose **New Editor Window**, and set the window to a portrait size in Editor Preferences → Level Editor → Play (e.g. 390 × 844).

Phones: iOS needs a Mac with Xcode and an Apple developer account. Android needs Android Studio, the SDK and NDK set up in Project Settings → Platforms → Android. Both are set to portrait already.

## Finish it with Claude Code and Unreal MCP

1. If your engine has the **Model Context Protocol** plugin, turn it on in Edit → Plugins, restart, then run this in the editor console: `ModelContextProtocol.GenerateClientConfig ClaudeCode`.
2. Open Claude Code in `unreal/RoofRumble/` and paste:

```
This is a C++ port of the web game in ../../game/src/survivor (Roof Rumble). It was written
without a compiler. Build the RoofRumble editor target, fix every compile and link error
without changing the game rules in RRSim.cpp, then press Play and check: the roof and
neighbourhood show, Juno moves with WASD and mouse drag, Crows spawn and get punched,
coins fly to Juno, a level-up shows 3 cards, ROLL works, Grudge arrives at 1:30 and the
shop purchase survives a restart. Compare the look against the web version and tune
colours, camera and sizes in RRArena.cpp. Commit each fix.
```

## Not ported yet

- Sounds and haptics
- The comic font (the HUD uses the engine font)
- Pause when the app goes to the background
- Outlines and toon shading (it uses flat engine materials with fog)
