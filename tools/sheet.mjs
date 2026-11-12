// Build a labelled contact sheet from images (for visual QC).
//   node tools/sheet.mjs <out.png> <cols> <cellW> <cellH> <file...>
import path from 'node:path';
import sharp from 'sharp';

const [out, colsS, wS, hS, ...files] = process.argv.slice(2);
const cols = Number(colsS);
const cw = Number(wS);
const ch = Number(hS);
const rows = Math.ceil(files.length / cols);
const labelH = 26;

const composites = [];
for (let i = 0; i < files.length; i++) {
  const f = files[i];
  const img = await sharp(f)
    .resize(cw, ch - labelH, { fit: 'contain', background: { r: 120, g: 120, b: 120, alpha: 1 } })
    .flatten({ background: { r: 120, g: 120, b: 120 } })
    .png()
    .toBuffer();
  const x = (i % cols) * cw;
  const y = Math.floor(i / cols) * ch;
  composites.push({ input: img, left: x, top: y });
  const label = path.basename(f).replace(/\.png$/, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${labelH}"><rect width="100%" height="100%" fill="#222"/><text x="6" y="19" font-family="Consolas, monospace" font-size="17" fill="#fff">${label}</text></svg>`;
  composites.push({ input: Buffer.from(svg), left: x, top: y + ch - labelH });
}

await sharp({ create: { width: cols * cw, height: rows * ch, channels: 3, background: { r: 60, g: 60, b: 60 } } })
  .composite(composites)
  .png()
  .toFile(out);
console.log('sheet ->', out, `${cols * cw}x${rows * ch}`);
