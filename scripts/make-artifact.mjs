/* global console, process, Buffer */
// Turns dist/index.html (fully inlined by vite-plugin-singlefile) into a wrapper-free
// fragment for the claude.ai page host: no doctype/html/head/body tags.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');

const styles = [...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const scripts = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
const bodyInner = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
const markup = bodyInner.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').trim();

if (!styles.length || !scripts.length || !markup) {
  console.error('make-artifact: unexpected dist/index.html shape');
  process.exit(1);
}
if (/<script[^>]+\ssrc=|<link[^>]+href=/i.test(html)) {
  console.error('make-artifact: found an external resource reference');
  process.exit(1);
}

const out = [
  '<title>RailroadSim</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  ...styles,
  markup,
  ...scripts,
  '',
].join('\n');

mkdirSync('dist/artifact', { recursive: true });
writeFileSync('dist/artifact/railroadsim.html', out);
console.log(`wrote dist/artifact/railroadsim.html (${(Buffer.byteLength(out) / 1024).toFixed(1)} KiB)`);
