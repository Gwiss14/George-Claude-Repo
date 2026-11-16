# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This repo is a Claude Code plugin marketplace (`george-claude-repo`, published from GitHub `Gwiss14/George-Claude-Repo`) plus a few unrelated projects that live alongside it. It is mostly used from Claude Code on a phone.

| Path | What it is |
|---|---|
| `plugins/<name>/` | The mods (Claude Code plugins). Each one is listed in `.claude-plugin/marketplace.json`. |
| `.claude/skills/daily-brief/` | A read-only morning brief built from Gmail, Calendar, and Todoist; rendered with `brief/template.html`. |
| `.claude/skills/hallmark/` | A design skill copied from `Gwiss14/hallmark`. Change it upstream, not here. |
| `game/` | Soluna Rooftop, a Three.js + Vite browser game. **It has its own rules:** `game/CLAUDE.md` → `game/AGENTS.md` (a staged workflow), and `game/PROGRESS.md` is its running log. Read both before touching the game. |
| `docs/superpowers/specs/` | Design specs for mods (for example, boot-hud). |

## Mods (`plugins/`)

Each mod follows the same pattern:

- `.claude-plugin/plugin.json`: name, version, description, `"types": "./types/index.d.ts"`
- `hooks/hooks.json`: `{ "modules": ["./register.tsx"] }`
- `hooks/register.tsx`: exports `register: Register`, which subscribes with `on('<event>', ($, e, next) => …)` and must call `next(e)` to pass the event on. The events used here are `prompt.submit`, `tool.call`, `turn.complete` (check `e.agentId === undefined` for the main loop), and `ui.render` filtered by `component` (for example, `AbovePrompt`).
- State is kept in `atom({ plugin, key }, initial, { shape: '<tag>-N' })` and accessed with `read`/`update`. **Bump the `shape` tag whenever the stored type changes**, so values saved by an older version are ignored.
- `types/index.d.ts`: the state types, plus a `declare module 'claude-code' { interface PluginState { … } }` entry for the plugin.
- Timers come from `$.clock.every/after`, not `setTimeout`. Keep output deterministic (boot-hud uses an integer hash instead of `Math.random`) so tests can check exact text.

**Band conflict:** `turn-band`, `progress-tracker`, `crab-crew`, `work-bar`, and `boot-hud` all draw the `AbovePrompt` line, so only one should be installed at a time. A new band mod joins this group; say so in the README. `.claude/settings.json` turns on `boot-hud` for sessions opened in this repo.

When you add or rename a mod, update `.claude-plugin/marketplace.json`, the README's Mods table, and the README's Install block. To pick up changes, users start a new session.

### Testing mods

```bash
claude plugin test plugins/work-bar     # runs every *.test.ts(x) under that folder; exits 1 on failure
claude plugin test plugins/boot-hud
```

Tests import from `claude-code/testing` (`test`, `expect`, `mock.clock(on)`). They drive events with `$.prompt.submit` / `$.tool.call`, then `$.ui.mount({ plugin, component, props, surface })` and check the rendered `Text`. Check both the `terminal` and `desktop` surfaces. Only `work-bar` and `boot-hud` have tests so far.

## Game (`game/`)

```bash
cd game
npm install
npm run dev                                   # Vite with --host, so it can be played on a phone over Wi-Fi
npm test                                      # vite build + tests/run-tests.mjs (Playwright, screenshots in tests/out/)
node scripts/build-artifact.mjs out.html      # whole game as one self-contained HTML file
```

`npm test` needs Playwright. If only `playwright-core` is installed (`npm install --no-save playwright-core`), it drives the Chrome already on the machine. The layout is strict: `src/config.js` holds every tunable number, `src/view/registry.js` is the only place that decides how things look (id → builder), and `src/game/` is gameplay only, with no knowledge of how anything looks. Bots: `?bot=good|bad&speed=4`; the debug panel opens with the backtick key or `?debug`.
