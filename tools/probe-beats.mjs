// Print per-beat loudness around given beat indices: node tools/probe-beats.mjs <id> <beat> [...]
import fs from 'node:fs';
import { decode, db } from './audio-lib.mjs';
const id = process.argv[2];
const g = JSON.parse(fs.readFileSync(`gen/music/${id}.grid.json`, 'utf8'));
const sr = 22050;
const x = decode(`gen/music/${id}.mp3`, { sr });
let lp = 0; const a = 1 - Math.exp((-2 * Math.PI * 120) / sr);
const low = new Float32Array(x.length); for (let i = 0; i < x.length; i++) { lp += a * (x[i] - lp); low[i] = lp; }
const r = (arr, t0, t1) => { const s0 = Math.floor(t0 * sr), s1 = Math.floor(t1 * sr); let s = 0; for (let i = s0; i < s1; i++) s += arr[i] * arr[i]; return db(Math.sqrt(s / (s1 - s0))).toFixed(0); };
for (const b of process.argv.slice(3).map(Number)) {
  const row = [];
  for (let k = b - 10; k <= b + 6; k++) { const t = g.beat0 + k * g.beatSec; row.push(`${k === b ? '>' : ''}${k}@${t.toFixed(2)}:${r(x, t, t + g.beatSec)}/${r(low, t, t + g.beatSec)}`); }
  console.log(row.join('  '));
  console.log();
}
