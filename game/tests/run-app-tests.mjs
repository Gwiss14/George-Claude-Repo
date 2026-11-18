// Checks the app shell: menu, Home Screen files, offline play, and iPhone layouts.
//   node tests/run-app-tests.mjs      (after `npm run build`; `npm run test:app` does both)
import { preview } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const server = await preview({ preview: { port: 4337, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
const BASE = 'http://127.0.0.1:4337/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = {};
let failed = false;
const fail = (m) => { failed = true; console.log('FAIL', m); };
const realErrors = (list) => list.filter((e) => !/fonts\.(googleapis|gstatic)|net::ERR/.test(e));

// ---- 1. menu on an iPhone held upright: layout, install hint, best waves, links ------
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + 'modes.html');
  await page.evaluate(() => { localStorage.setItem('trs-best-wave', '7'); localStorage.setItem('trs-best-wave-fps', '4'); });
  await page.reload();
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => ({
    title: document.title,
    best: [document.getElementById('best-brawler').textContent, document.getElementById('best-fps').textContent],
    installHint: !document.getElementById('install').hidden,
    sideScroll: document.documentElement.scrollWidth > window.innerWidth,
    links: [...document.querySelectorAll('.mode')].map((a) => a.getAttribute('href')),
  }));
  await page.screenshot({ path: OUT + 'app-menu-iphone.png' });
  await page.tap('#go-fps');
  await page.waitForFunction(() => window.__game, null, { timeout: 10000 });
  const fpsLoaded = await page.evaluate(() => document.title);
  await page.tap('#menu-btn');
  await page.waitForSelector('#go-brawler');
  await page.tap('#go-brawler');
  await page.waitForFunction(() => window.__game, null, { timeout: 10000 });
  const brawlerLoaded = await page.evaluate(() => document.title);
  results.menu = { ...m, fpsLoaded, brawlerLoaded, errors: realErrors(errors) };
  if (m.best.join() !== 'Best: wave 7,Best: wave 4') fail(`best waves on the menu: ${m.best}`);
  if (!m.installHint) fail('Add to Home Screen hint not shown in iPhone Safari');
  if (m.sideScroll) fail('menu scrolls sideways on an iPhone');
  if (fpsLoaded !== 'Rooftop Shootout' || brawlerLoaded !== 'Tank Roof Scrap') fail(`menu links: ${fpsLoaded} / ${brawlerLoaded}`);
  if (results.menu.errors.length) fail(`menu errors: ${results.menu.errors}`);
  await ctx.close();
}

// ---- 2. Home Screen files: manifest, icons, iPhone meta tags -----------------------------
{
  const page = await browser.newPage();
  await page.goto(BASE);
  const r = await page.evaluate(async () => {
    const man = await (await fetch('./manifest.webmanifest')).json();
    const icons = await Promise.all([...man.icons.map((i) => i.src), 'icons/icon-180.png'].map(async (src) => {
      const res = await fetch(src); const b = await createImageBitmap(await res.blob()); return `${src} ${b.width}x${b.height}`;
    }));
    const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.content;
    return {
      name: man.name, display: man.display, start: man.start_url, icons,
      appleCapable: meta('apple-mobile-web-app-capable'), statusBar: meta('apple-mobile-web-app-status-bar-style'),
      appleTitle: meta('apple-mobile-web-app-title'), touchIcon: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
      viewportCover: /viewport-fit=cover/.test(document.querySelector('meta[name=viewport]').content),
    };
  });
  results.homeScreen = r;
  if (r.name !== 'Roof Rumble' || r.appleCapable !== 'yes' || !r.touchIcon || !r.viewportCover) fail(`Home Screen setup: ${JSON.stringify(r)}`);
  if (!r.icons.includes('icons/icon-180.png 180x180') || !r.icons.includes('icons/icon-512.png 512x512')) fail(`icons: ${r.icons}`);
  await page.close();
}

// ---- 3. offline: after one visit, the menu and both games load with no network ------------
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(800);
  await page.reload(); // now controlled by the service worker
  await page.evaluate(() => navigator.serviceWorker.ready);
  await ctx.setOffline(true);
  const offline = {};
  for (const [name, path, ready] of [['game', '', () => !!window.__run], ['classic menu', 'modes.html', () => !!document.getElementById('go-fps')], ['brawler', 'brawler.html', () => !!window.__game], ['shooter', 'fps.html', () => !!window.__game]]) {
    try {
      await page.goto(BASE + path, { timeout: 10000 });
      await page.waitForFunction(ready, null, { timeout: 10000 });
      offline[name] = 'loads offline';
    } catch (e) { offline[name] = `FAILED: ${String(e).split('\n')[0]}`; }
  }
  results.offline = offline;
  for (const [k, v] of Object.entries(offline)) if (v !== 'loads offline') fail(`offline ${k}: ${v}`);
  await ctx.close();
}

// ---- 4. both games on an iPhone held sideways -------------------------------------------
{
  const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const layout = {};
  for (const [name, path] of [['brawler', 'brawler.html'], ['shooter', 'fps.html'], ['survivor', '?bot=1&speed=1']]) {
    await page.goto(BASE + path);
    await page.waitForFunction(() => window.__game || window.__run);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: OUT + `app-${name}-landscape.png` });
    layout[name] = await page.evaluate(() => {
      const box = (id) => { const r = document.getElementById(id)?.getBoundingClientRect(); return r && r.width ? r : null; };
      const inside = (r) => r && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
      if (window.__run) return { pause: inside(box('pause-btn')), timer: inside(box('timer')), hp: inside(box('hp')) };
      return { fire: inside(box('attack-btn')), restart: inside(box('restart-btn')), menu: inside(box('menu-btn')), hp: inside(box('hp')) };
    });
  }
  results.landscape = { ...layout, errors: realErrors(errors) };
  for (const [g, l] of Object.entries(layout)) for (const [k, v] of Object.entries(l)) if (!v) fail(`${g} landscape: ${k} is off screen`);
  if (results.landscape.errors.length) fail(`landscape errors: ${results.landscape.errors}`);
  await ctx.close();
}

await browser.close();
await server.httpServer.close();
console.log(JSON.stringify(results, null, 2));
console.log(failed ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
