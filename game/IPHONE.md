# Roof Rumble on iPhone

Both games, *Tank Roof Scrap* (brawler) and *Rooftop Shootout* (shooter), are one app called **Roof Rumble**, with a start menu. There are two ways to get it on an iPhone.

| | Home Screen web app | App Store / native app |
|---|---|---|
| Needs | the game on a public web address | a Mac with Xcode, and for the App Store an Apple Developer account ($99/year) |
| Install | Safari → Share → Add to Home Screen | built and installed from Xcode, or downloaded from the App Store |
| Full screen, own icon, offline | yes | yes |
| Vibration on hits | no (iPhone Safari has no vibration for web pages) | yes (Haptics) |
| Updates | automatic on the next launch with a connection | rebuild in Xcode / new App Store version |

## 1. Home Screen web app

What is already set up:

- **App identity:** the name *Roof Rumble*, app icons and a dusk theme colour (`public/manifest.webmanifest`, `public/icons/`).
- **Full screen:** it opens without Safari's bars, and the game draws under the notch and home bar while the controls stay clear of them.
- **Offline:** it works offline after one visit, because the build writes `sw.js` with every file the app needs.
- **Install hint:** the menu shows "Share → Add to Home Screen" in Safari, and hides it once installed.

To install, once the game is on a public `https://` address:

1. Open the address in **Safari** on the iPhone (Add to Home Screen only exists in Safari).
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open *Roof Rumble* from the Home Screen.

If there's no sound, check the ring/silent switch: iPhone mutes web game sound while it's on silent.

To put it on a free public address, run `npm run build`, then upload the `dist/` folder to any static host (GitHub Pages, Netlify, Cloudflare Pages).

## 2. Native app with Xcode (Capacitor)

The Xcode project is in `ios/`. It wraps the built game (`dist/`) in a native iOS app with the same icon, a launch screen, no status bar, and the Haptics plugin for vibration.

### Run it on your own iPhone (free)

You need a Mac with **Xcode 16 or newer** (from the Mac App Store) and **Node.js 20 or newer**.

```bash
git clone -b claude/3d-browser-game-5uq3ry https://github.com/Gwiss14/George-Claude-Repo.git
cd George-Claude-Repo/game
npm install
npm run ios          # builds the game and copies it into the Xcode project
npm run ios:open     # opens Xcode
```

Then, in Xcode:

1. Click **App** in the left sidebar, then the **App** target, then **Signing & Capabilities**.
2. Under **Team**, pick your Apple ID (Xcode → Settings → Accounts to add one). A free Apple ID works for your own phone.
3. If Xcode says the bundle identifier is taken, change **Bundle Identifier** to something unique such as `com.yourname.roofrumble`, and use the same value as `appId` in `capacitor.config.json`.
4. Plug in the iPhone and pick it at the top of the window. On the phone, turn on **Settings → Privacy & Security → Developer Mode** when asked, and restart it.
5. Press **Run** (▶). The first time, the phone may ask you to trust the developer: **Settings → General → VPN & Device Management**.

With a free Apple ID the app stops opening after 7 days; press Run again to renew it. With a paid developer account it lasts a year.

After any change to the game, run `npm run ios` again, then press Run in Xcode.

### Put it on the App Store

1. Join the **Apple Developer Program** ($99/year) at developer.apple.com.
2. In **App Store Connect**, create a new app with the same bundle identifier.
3. In Xcode, choose **Any iOS Device** at the top, then **Product → Archive**. When it finishes, click **Distribute App → App Store Connect**.
4. Try it on your phone first through **TestFlight**, then submit it for review from App Store Connect.

For the App Store listing:

- **Screenshots:** take them from the app on your phone (side button + volume up).
- **Privacy:** "Data Not Collected". The game only keeps your best wave on the phone.
- **Age rating:** the games have cartoon fist fights and cartoon guns, so answer "Cartoon or Fantasy Violence" in the questionnaire.
- **Review risk:** Apple sometimes rejects apps that are "just a website". This is a full game that runs offline, with native haptics, which usually passes. If it is rejected, the reviewer's note will say what they want.

## Files

| Path | What it is |
|---|---|
| `index.html`, `src/menu/` | the start menu |
| `brawler.html`, `fps.html` | the two games |
| `src/app/app.js` | offline, vibration and "am I an app" helpers shared by all pages |
| `public/manifest.webmanifest`, `public/icons/` | Home Screen name and icons |
| `vite.config.js` | also writes `sw.js`, the offline file list |
| `capacitor.config.json`, `ios/` | the native iPhone project |
| `scripts/make-icons.mjs` | draws the icon and launch screen (`npm run icons`) |
| `tests/run-app-tests.mjs` | checks the menu, Home Screen files, offline play and iPhone layouts (`npm run test:app`) |
