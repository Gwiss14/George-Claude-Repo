# Soluna Rooftop

A small 3D browser brawler. Three.js + Vite, no game engine.

```bash
npm install
npm run dev        # play at the address it prints (add --host to try it on a phone on the same Wi-Fi)
npm test           # build, then run the browser checks and both bots (needs Playwright + Chromium)
```

Controls: WASD / arrows to move, J or Space to attack (press again during an attack to chain jab, cross, kick), R to restart, ` for the debug panel. On a phone: drag on the left side to move, HIT to attack.

Bots: open the game with `?bot=good` or `?bot=bad` (add `&speed=4` to run faster); the report is in `window.__botReport`.
