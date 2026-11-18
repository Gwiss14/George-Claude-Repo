import './menu.css';
import { isIOS, isStandalone } from '../app/app.js';

const best = (key) => { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } };
for (const [id, key] of [['best-brawler', 'trs-best-wave'], ['best-fps', 'trs-best-wave-fps']]) {
  const n = best(key);
  if (n) document.getElementById(id).textContent = `Best: wave ${n}`;
}
// In Safari on an iPhone, explain how to install. Once installed, the hint goes away.
document.getElementById('install').hidden = !(isIOS && !isStandalone);

// skyline silhouette: a row of blocks with lit windows, drawn once
const sky = document.getElementById('skyline');
let seed = 3;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < 18; i++) {
  const b = document.createElement('i');
  b.style.height = `${18 + rnd() * 34}%`;
  b.style.flexGrow = String(1 + Math.floor(rnd() * 3));
  sky.appendChild(b);
}
