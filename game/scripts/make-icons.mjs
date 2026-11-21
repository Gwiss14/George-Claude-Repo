// Draws the app icon and launch screen as SVG and saves them as PNGs at every size needed:
//   public/icons/ (Home Screen web app) and, if present, the Xcode project's asset catalog.
//   node scripts/make-icons.mjs
import { createRequire } from 'node:module';
import { mkdirSync, existsSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

// A comic starburst with "RR" over a dusk sky and skyline, inside crosshair ticks.
function iconSvg({ safe = 1 } = {}) {
  const pts = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 250 : 340;
    pts.push(`${512 + Math.cos(a) * r * safe},${500 + Math.sin(a) * r * safe}`);
  }
  let blocks = '';
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let x = 0; x < 1024;) {
    const w = 70 + rnd() * 90, h = 120 + rnd() * 200;
    blocks += `<rect x="${x}" y="${1024 - h}" width="${w - 8}" height="${h}" fill="#241c3a"/>`;
    for (let wy = 1024 - h + 24; wy < 1010; wy += 40) for (let wx = x + 14; wx < x + w - 26; wx += 30) if (rnd() < 0.4) blocks += `<rect x="${wx}" y="${wy}" width="14" height="16" fill="#ffcf6b"/>`;
    x += w;
  }
  const s = safe;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b2a5e"/><stop offset="0.55" stop-color="#e0627a"/><stop offset="1" stop-color="#ffc26b"/></linearGradient></defs>
    <rect width="1024" height="1024" fill="url(#g)"/>
    ${blocks}
    <polygon points="${pts.join(' ')}" fill="#0b0b10" stroke="#0b0b10" stroke-width="${22 * s}" stroke-linejoin="round" transform="translate(18 18)"/>
    <polygon points="${pts.join(' ')}" fill="#ffd23f" stroke="#0b0b10" stroke-width="${22 * s}" stroke-linejoin="round"/>
    <g stroke="#0b0b10" stroke-width="${26 * s}" stroke-linecap="round">
      <line x1="512" y1="${500 - 420 * s}" x2="512" y2="${500 - 360 * s}"/><line x1="512" y1="${500 + 360 * s}" x2="512" y2="${500 + 420 * s}"/>
      <line x1="${512 - 420 * s}" y1="500" x2="${512 - 360 * s}" y2="500"/><line x1="${512 + 360 * s}" y1="500" x2="${512 + 420 * s}" y2="500"/>
    </g>
    <text x="512" y="${500 + 92 * s}" text-anchor="middle" font-family="Bangers, Impact, 'Arial Black', sans-serif" font-size="${300 * s}"
      fill="#fff6e0" stroke="#0b0b10" stroke-width="${18 * s}" paint-order="stroke" transform="rotate(-6 512 500)">RR</text>
  </svg>`;
}

// Launch screen: dusk colour with the burst small in the middle (square, iOS crops it to fit).
function splashSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732" width="2732" height="2732">
    <rect width="2732" height="2732" fill="#2b2a5e"/>
    <g transform="translate(1066 1066) scale(0.586)">${iconSvg().replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/<rect width="1024" height="1024" fill="url\(#g\)"\/>/, '')}</g>
  </svg>`;
}

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(svg, size, path) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Bangers&display=swap" rel="stylesheet">
    <style>html,body{margin:0;background:#2b2a5e}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', path);
}

mkdirSync('public/icons', { recursive: true });
await render(iconSvg(), 180, 'public/icons/icon-180.png');      // iPhone Home Screen
await render(iconSvg(), 192, 'public/icons/icon-192.png');
await render(iconSvg(), 512, 'public/icons/icon-512.png');
await render(iconSvg({ safe: 0.78 }), 512, 'public/icons/icon-maskable-512.png'); // Android crops to a circle
await render(iconSvg(), 1024, 'public/icons/icon-1024.png');    // App Store
const xc = 'ios/App/App/Assets.xcassets';
if (existsSync(xc)) {
  await render(iconSvg(), 1024, `${xc}/AppIcon.appiconset/AppIcon-512@2x.png`);
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    if (existsSync(`${xc}/Splash.imageset`)) await render(splashSvg(), 2732, `${xc}/Splash.imageset/${f}`);
  }
}
await browser.close();
