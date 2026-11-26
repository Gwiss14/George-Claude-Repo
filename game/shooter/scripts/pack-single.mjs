// Packs dist-single/ into one HTML page.
//   dist-single/rooftop-shootout.html  the page body as published (the artifact service adds <html>/<head>)
//   dist-single/wrapped.html           the same page as a complete document, for testing from a file
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const dir = new URL('../dist-single/', import.meta.url).pathname;
const asset = (re) => readFileSync(dir + 'assets/' + readdirSync(dir + 'assets').find((f) => re.test(f)), 'utf8');
const html = readFileSync(dir + 'index.html', 'utf8');
const js = asset(/^index-.*\.js$/).replaceAll('</script', '<\\/script');
const css = asset(/\.css$/);
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).trim();
const page = `<title>Rooftop Shootout</title>
<meta name="theme-color" content="#2b2a5e">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bangers&display=swap">
<style>${css}</style>
${body}
<script type="module">${js}</script>
`;
writeFileSync(dir + 'rooftop-shootout.html', page);
writeFileSync(dir + 'wrapped.html', `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${page}</body></html>`);
console.log(`rooftop-shootout.html: ${(page.length / 1e6).toFixed(2)} MB`);
