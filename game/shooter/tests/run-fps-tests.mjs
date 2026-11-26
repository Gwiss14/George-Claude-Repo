// Checks the shooter page (index.html) in the pre-installed Chromium.
//   node tests/run-fps-tests.mjs      (after `npm run build`; `npm test` does both)
import { preview } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const server = await preview({ preview: { port: 4327, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
const BASE = 'http://127.0.0.1:4327/index.html';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = {};
let failed = false;
const fail = (m) => { failed = true; console.log('FAIL', m); };
const watch = (page, name) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return () => { const real = errors.filter((e) => !/fonts\.(googleapis|gstatic)|net::ERR/.test(e)); if (real.length) fail(`${name}: console errors:\n  ${real.join('\n  ')}`); return real.length; };
};
const wrap = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };
const simWait = (page, sec) => page.evaluate((sec) => new Promise((res) => { const g = window.__game, t0 = g.time; const f = () => (g.time - t0 >= sec ? res() : requestAnimationFrame(f)); f(); }), sec);
const st = (page) => page.evaluate(() => { const g = window.__game, j = g.juno; return { x: j.x, z: j.z, yaw: j.yaw, pitch: j.pitch, state: j.state, gun: g.gun.id, mag: g.gun.mag, reloading: g.gun.reloading, coins: j.coins, wave: g.waveIndex }; });

// ---- 1. desktop: move, look by dragging, shoot, reload, buy -------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = watch(page, 'desktop');
  await page.goto(BASE);
  await page.waitForFunction(() => window.__game && window.__view);
  await page.evaluate(() => { const g = window.__game; g.waveTimer = 999; g.waveActive = false; g.fighters = [g.juno];
    window.__ev = []; g.on((e) => window.__ev.push(e.type)); });
  const s0 = await st(page);
  await page.keyboard.down('KeyW'); await simWait(page, 0.4); await page.keyboard.up('KeyW');
  const s1 = await st(page);
  await page.mouse.move(640, 360); await page.mouse.down(); await page.mouse.move(740, 330, { steps: 5 }); await page.mouse.up();
  await simWait(page, 0.1);
  const s2 = await st(page);
  const shots = await page.evaluate(() => window.__ev.filter((e) => e === 'shot').length);
  await page.keyboard.press('KeyR'); await simWait(page, 0.05);
  const s3 = await st(page);
  // walk onto the SMG pad with coins and press E
  await page.evaluate(() => { const g = window.__game; g.juno.coins = 20; g.juno.x = 3.65; g.juno.z = -3.6; });
  await simWait(page, 0.05);
  await page.keyboard.press('KeyE'); await simWait(page, 0.1);
  const s4 = await st(page);
  await page.evaluate(() => { const g = window.__game; g.waveTimer = 0; g.juno.x = 0; g.juno.z = 1; });
  await page.evaluate(() => { window.__input.state.yaw = Math.PI; window.__input.state.pitch = -0.05; });
  await simWait(page, 2.5);
  await page.screenshot({ path: OUT + 'fps-desktop.png' });
  results.desktop = {
    walkedForward: +(s0.z - s1.z).toFixed(2), turnedRight: +wrap(s1.yaw - s2.yaw).toFixed(2), lookedUp: +(s2.pitch - s1.pitch).toFixed(2),
    shotsFromClick: shots, magAfterClick: s2.mag, reloadingAfterR: s3.reloading > 0, gunAfterBuy: s4.gun, coinsAfterBuy: s4.coins, consoleErrors: errs(),
  };
  if (!(s0.z - s1.z > 0.8)) fail('W did not walk forward (north)');
  if (!(wrap(s1.yaw - s2.yaw) > 0.05)) fail('dragging right did not turn right');
  if (!(shots >= 1)) fail('clicking did not shoot');
  if (!(s3.reloading > 0)) fail('R did not reload');
  if (s4.gun !== 'smg' || s4.coins !== 12) fail(`E on the SMG pad did not buy it (${s4.gun}, ${s4.coins} coins)`);
  await page.close();
}

// ---- 2 & 3. bots ---------------------------------------------------------------------------
async function runBot(mode, waves) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = watch(page, `fps bot ${mode}`);
  await page.goto(`${BASE}?bot=${mode}&speed=6&waves=${waves}`);
  await page.waitForFunction(() => window.__botReport, null, { timeout: 15000 });
  await page.waitForFunction(() => window.__botReport.done, null, { timeout: 300000, polling: 500 });
  const r = await page.evaluate(() => window.__botReport);
  await page.screenshot({ path: OUT + `fps-bot-${mode}.png` });
  r.consoleErrors = errs();
  await page.close();
  return r;
}
results.goodBot = await runBot('good', 7);
results.badBot = await runBot('bad', 0);
for (const [n, r] of [['good bot', results.goodBot], ['bad bot', results.badBot]]) {
  if (r.maxWallPenetration > 0.01) fail(`${n}: ${r.maxWallPenetration} m into a wall or prop`);
  if (r.maxFighterOverlap > 0.05) fail(`${n}: fighters overlapped ${r.maxFighterOverlap} m`);
  if (r.enemyStuck) fail(`${n}: enemies stuck ${r.enemyStuck} times`);
  if (r.maxEnemiesAttackingAtOnce > 3) fail(`${n}: ${r.maxEnemiesAttackingAtOnce} enemies attacked at once`);
}
const G = results.goodBot;
if (!(G.wavesCleared >= 7)) fail(`good bot cleared only ${G.wavesCleared} waves`);
if (!(G.bossWavesCleared >= 1)) fail('good bot did not clear the boss wave');
if (!(G.weaponsBought.length >= 1)) fail('good bot bought no gun');
if (!(G.headshots >= 1)) fail('no headshots');
if (!(G.combos >= 1)) fail('no hit streak combos');
if (!(G.throwsSeen >= 1)) fail('elites never threw a wrench');
if (results.badBot.result !== 'lost') fail(`bad bot should lose (${results.badBot.result})`);

// ---- 4. phone held upright: move, aim, fire --------------------------------------------
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errs = watch(page, 'phone');
  await page.goto(BASE);
  await page.waitForFunction(() => window.__game);
  await page.evaluate(() => { const g = window.__game; g.waveTimer = 999; g.waveActive = false; g.fighters = [g.juno];
    window.__shots = 0; g.on((e) => { if (e.type === 'shot') window.__shots++; }); });
  const cdp = await ctx.newCDPSession(page);
  const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const s0 = await st(page);
  await t('touchStart', [{ x: 90, y: 620, id: 1 }]);
  for (let i = 1; i <= 6; i++) { await t('touchMove', [{ x: 90, y: 620 - i * 9, id: 1 }]); await page.waitForTimeout(16); }
  await simWait(page, 0.5);
  await t('touchEnd', []);
  const s1 = await st(page);
  await t('touchStart', [{ x: 280, y: 500, id: 2 }]);
  for (let i = 1; i <= 6; i++) { await t('touchMove', [{ x: 280 + i * 8, y: 500, id: 2 }]); await page.waitForTimeout(16); }
  await t('touchEnd', []);
  await simWait(page, 0.05);
  const s2 = await st(page);
  const fire = await page.locator('#attack-btn').boundingBox();
  await t('touchStart', [{ x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 3 }]);
  await simWait(page, 0.6);
  await t('touchEnd', []);
  const shots = await page.evaluate(() => window.__shots);
  // quick tap on the aiming side shoots (this software-rendered browser delivers touches slowly, so allow a longer tap)
  await page.evaluate(() => { window.__config.fps.tapTime = 3; });
  await simWait(page, 0.4);
  let before = await page.evaluate(() => window.__shots);
  // tap on open sky, clear of the RELOAD button
  await t('touchStart', [{ x: 260, y: 300, id: 4 }]); await page.waitForTimeout(60); await t('touchEnd', []);
  await simWait(page, 0.1);
  const tapShots = (await page.evaluate(() => window.__shots)) - before;
  // aim with one finger, then put a second finger down: it shoots while held
  await simWait(page, 0.4);
  before = await page.evaluate(() => window.__shots);
  await t('touchStart', [{ x: 260, y: 320, id: 5 }]);
  await t('touchMove', [{ x: 280, y: 320, id: 5 }]);
  await t('touchStart', [{ x: 280, y: 320, id: 5 }, { x: 330, y: 250, id: 6 }]);
  await simWait(page, 0.8);
  await t('touchEnd', []);
  const secondFingerShots = (await page.evaluate(() => window.__shots)) - before;
  // a quick tap on the move side shoots too
  await simWait(page, 0.4);
  before = await page.evaluate(() => window.__shots);
  await t('touchStart', [{ x: 100, y: 300, id: 8 }]); await page.waitForTimeout(60); await t('touchEnd', []);
  await simWait(page, 0.1);
  const leftTapShots = (await page.evaluate(() => window.__shots)) - before;
  // a drag that aims does not shoot
  await simWait(page, 0.4);
  before = await page.evaluate(() => window.__shots);
  await t('touchStart', [{ x: 260, y: 320, id: 7 }]);
  for (let i = 1; i <= 6; i++) { await t('touchMove', [{ x: 260 + i * 10, y: 320, id: 7 }]); await page.waitForTimeout(16); }
  await t('touchEnd', []);
  await simWait(page, 0.1);
  const dragShots = (await page.evaluate(() => window.__shots)) - before;
  await page.evaluate(() => { window.__game.waveTimer = 0; });
  await simWait(page, 2.5);
  await page.screenshot({ path: OUT + 'fps-phone.png' });
  results.phone = { moved: +(s0.z - s1.z).toFixed(2), turned: +wrap(s1.yaw - s2.yaw).toFixed(2), shotsWhileHoldingFire: shots, tapShots, leftTapShots, secondFingerShots, dragShots, consoleErrors: errs() };
  if (!(s0.z - s1.z > 0.5)) fail('left-side drag did not move forward');
  if (!(wrap(s1.yaw - s2.yaw) > 0.05)) fail('right-side drag did not turn right');
  if (!(shots >= 2)) fail('holding FIRE did not keep shooting');
  if (tapShots !== 1) fail(`a quick tap fired ${tapShots} shots (want 1)`);
  if (!(secondFingerShots >= 2)) fail(`a second finger while aiming fired ${secondFingerShots} shots`);
  if (dragShots !== 0) fail(`an aiming drag fired ${dragShots} shots`);
  if (leftTapShots !== 1) fail(`a quick tap on the move side fired ${leftTapShots} shots (want 1)`);
  await ctx.close();
}

await browser.close();
await server.httpServer.close();
console.log(JSON.stringify(results, null, 2));
console.log(failed ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
