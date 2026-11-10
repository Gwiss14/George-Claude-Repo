# boot-hud: a sci-fi HUD above the prompt

A mod that animates the band above the prompt while Claude works. Chosen look: "Boot-up HUD".

## What it draws

```
▐▓▓▓▓▓▒▒░░░░░░░░░░░░▌ SCAN 0x3F2A
TOOL  E#i7 → Edit  T+00:42
SYS   ◉ ◉ ◎ ○ ○   6 calls
```

| State | Drawing |
| --- | --- |
| First second after submit | `BOOT ▸ LINK ▸ READY`, one word lighting per frame |
| Running | Scan row (bouncing block with a trail, hex counter), tool row (latest tool name decoding over one second, elapsed clock), system row (five lights, call count) |
| Turn complete | `■ COMPLETE · T+00:42 · 6 calls`, cleared after 6 seconds |
| Idle, or a survey holds the band | Nothing; the engine draws its own |

- Fewer than 3 rows available: the tool row alone.
- Narrow band: the bar shrinks (8 to 20 cells) so the scan row fits `bodyColumns`.
- MCP tools show the part after the last `__`, cut to 18 characters.

## How it works

- `prompt.submit` resets state and starts a 250 ms timer that writes the frame number.
- `tool.call` records the tool name, the count and the frame it fired on.
- `turn.complete` (main loop only) stops the timer and sets the finish line.
- `ui.render` on `AbovePrompt` draws from one atom, `boot-hud.hud` (shape `hud-1`).
- Every row is a pure function of the frame number; scramble glyphs and the hex
  counter come from an integer hash, not `Math.random`, so tests assert exact text.

## Limits

`boot-hud`, `work-bar`, `crab-crew`, `progress-tracker` and `turn-band` each answer the
band themselves, so only one shows at a time. Install one band mod at a time.

## Tests

`plugins/boot-hud/tests/boot-hud.test.tsx`, run with `claude plugin test plugins/boot-hud`:
boot line, scan position, mid-decode and decoded tool row, lights, finish line and
self-clearing, determinism, narrow and short bands, nothing before the first prompt.
