# Tank Roof Scrap

**Roof Rumble**: a small 3D browser brawler (*Tank Roof Scrap*, `brawler.html`) and a first-person shooter (*Rooftop Shootout*, `fps.html`) behind a start menu (`index.html`). Three.js + Vite, no game engine. Runs as an iPhone Home Screen app or a native app: see IPHONE.md.

```bash
npm install
npm run dev        # play at the address it prints (add --host to try it on a phone on the same Wi-Fi)
npm test           # build, then run the browser checks and both bots (needs Playwright + Chromium)
npm run test:fps   # the same for the shooter
npm run test:app   # menu, Home Screen files, offline play, iPhone layouts
npm run ios        # build and copy into the Xcode project (then npm run ios:open, on a Mac)
```

Controls: WASD / arrows to move, J or Space to attack (press again during an attack to chain jab, cross, kick), R to restart, ` for the debug panel. On a phone: drag on the left side to move, HIT to attack.

Bots: open the game with `?bot=good` or `?bot=bad` (add `&speed=4` to run faster); the report is in `window.__botReport`.

Shooter: open `/fps.html` from the dev server (or pick it on the menu). Mouse aims (click to lock), WASD moves, click shoots, R reloads, E buys a gun on a pad at the rack.
