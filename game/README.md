# Roof Rumble

A one-thumb rooftop survivor for phones. Drag to move, Juno fights on her own, pick upgrade cards, and hold the roof against swarms of Tin Crows for five minutes. Three.js + Vite, no game engine. Design: GDD.md. iPhone app (Home Screen or Xcode): IPHONE.md.

```bash
npm install
npm run dev        # play at the address it prints (add --host to try it on a phone on the same Wi-Fi)
npm test           # build, then play it on an iPhone-sized screen with bots, and check the app shell
npm run ios        # build and copy into the Xcode project (then npm run ios:open, on a Mac)
```

Controls: touch and drag anywhere (or WASD / arrows) to move; ROLL (or Space / Shift / K) to dodge-roll; tap a card to pick an upgrade; ‖ or Esc to pause; ` for the debug panel. Bots: open with `?bot=1&speed=4`; the report is in `window.__botReport`.
