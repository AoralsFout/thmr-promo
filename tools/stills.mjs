// Render review stills at given film seconds (bundles once).
//   node tools/stills.mjs <label> <sec> [sec...]      -> gen/stills/<label>_<sec>.png (+ contact sheet)
//   options: --scale=0.5  --comp=Promo  --cols=4
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition, openBrowser } from '@remotion/renderer';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [label, ...secs] = args.filter((a) => !a.startsWith('--'));
const scale = Number(opt.scale ?? 0.5);
const comp = opt.comp ?? 'Promo';
const outDir = path.resolve('gen/stills');
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
const browser = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' } });
const composition = await selectComposition({ serveUrl, id: comp, puppeteerInstance: browser });
const files = [];
for (const s of secs) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(Number(s) * composition.fps));
  const output = path.join(outDir, `${label}_${String(s).replace('.', '_')}.png`);
  await renderStill({ composition, serveUrl, output, frame, scale, puppeteerInstance: browser, imageFormat: 'png', timeoutInMilliseconds: 180000 });
  files.push(output);
  console.log('still', s, '->', path.basename(output));
}
await browser.close({ silent: true });
if (files.length > 1) {
  const cols = Number(opt.cols ?? Math.min(3, files.length));
  spawnSync('node', ['tools/sheet.mjs', path.join(outDir, `${label}_sheet.png`), String(cols), String(Math.round(1920 * scale * (opt.cell ?? 0.667))), String(Math.round(1080 * scale * (opt.cell ?? 0.667)) + 26), ...files], { stdio: 'inherit' });
}
