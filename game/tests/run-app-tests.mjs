// Checks the iPhone app shell: Home Screen files, install hint, offline play, and layouts.
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

// ---- 1. title on an iPhone held upright: install hint, no sideways scroll -------------------
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE);
  await page.waitForFunction(() => window.__run);
  await page.waitForTimeout(500);
  const t = await page.evaluate(() => ({
    title: document.title,
    installHint: !document.getElementById('install').hidden,
    sideScroll: document.documentElement.scrollWidth > window.innerWidth,
    otherGames: document.querySelectorAll('a[href$=".html"]').length,
  }));
  await page.screenshot({ path: OUT + 'app-title-iphone.png' });
  results.title = { ...t, errors: realErrors(errors) };
  if (t.title !== 'Roof Rumble') fail(`title: ${t.title}`);
  if (!t.installHint) fail('Add to Home Screen hint not shown in iPhone Safari');
  if (t.sideScroll) fail('title scrolls sideways on an iPhone');
  if (t.otherGames) fail('the title still links to other games');
  if (results.title.errors.length) fail(`title errors: ${results.title.errors}`);
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

// ---- 3. offline: after one visit, the game loads and plays with no network -------------------
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(800);
  await page.reload(); // now controlled by the service worker
  await page.evaluate(() => navigator.serviceWorker.ready);
  await ctx.setOffline(true);
  try {
    await page.goto(BASE + '?bot=1&speed=4', { timeout: 10000 });
    await page.waitForFunction(() => window.__run && window.__run.time > 3, null, { timeout: 20000 });
    results.offline = 'loads and plays offline';
  } catch (e) { results.offline = `FAILED: ${String(e).split('\n')[0]}`; fail(`offline: ${results.offline}`); }
  await ctx.close();
}

// ---- 4. an iPhone held sideways: HUD and level-up cards fit -------------------------------
{
  const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + '?bot=1&speed=1');
  await page.waitForFunction(() => window.__run && window.__run.time > 2);
  await page.screenshot({ path: OUT + 'app-landscape.png' });
  const inside = (id) => page.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }, id);
  const layout = { pause: await inside('pause-btn'), timer: await inside('timer'), hp: await inside('hp') };
  results.landscape = { ...layout, errors: realErrors(errors) };
  for (const [k, v] of Object.entries(layout)) if (!v) fail(`landscape: ${k} is off screen`);
  if (results.landscape.errors.length) fail(`landscape errors: ${results.landscape.errors}`);
  await ctx.close();
}

await browser.close();
await server.httpServer.close();
console.log(JSON.stringify(results, null, 2));
console.log(failed ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
