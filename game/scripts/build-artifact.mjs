// Builds the game as ONE self-contained HTML page (CSS and JS inlined), for sharing as a single file.
//   node scripts/build-artifact.mjs <output.html> [entry.html]   (entry: index.html)
import { build } from 'vite';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const out = process.argv[2] || 'dist-single/roof-rumble.html';
const entry = process.argv[3] || 'index.html';
await build({
  logLevel: 'error',
  build: { outDir: 'dist-single/tmp', emptyOutDir: true, rollupOptions: { input: entry, output: { inlineDynamicImports: true } } },
});
const dir = 'dist-single/tmp/assets/';
const files = readdirSync(dir);
const js = readFileSync(dir + files.find((f) => f.endsWith('.js')), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(dir + files.find((f) => f.endsWith('.css')), 'utf8');
const html = readFileSync(`dist-single/tmp/${entry}`, 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/<script[^>]*src=[^>]*><\/script>/g, '')
  .replace(/\s*<a id="menu-btn"[^>]*>[^<]*<\/a>/, '') // no menu page to go back to
  .replace(/\s*<a class="classic"[^>]*>[^<]*<\/a>/, ''); // nor the classic modes
const title = (html.match(/<title>([^<]*)<\/title>/) || [, 'Roof Rumble'])[1];
const page = `<title>${title}</title>
<meta name="theme-color" content="#2b2a5e">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bangers&display=swap">
<style>:root{color-scheme:dark}${css}</style>
${body.trim()}
<script type="module">${js}</script>
`;
writeFileSync(out, page);
console.log(out, (page.length / 1024).toFixed(0) + ' KB');
