// Check how recorded track boundaries line up with the status API timestamps.
import fs from 'node:fs';
import path from 'node:path';
import { decode, rmsEnvelope, db } from './audio-lib.mjs';
const tracks = JSON.parse(fs.readFileSync('gen/tracks.json', 'utf8'));
const pick = tracks.filter((t) => t.full && t.file === '2026-11-11T16-37-04').slice(20, 32);
for (const t of pick) {
  const file = path.join('captures/radio', `stream_${t.file}-630Z.mp3`);
  const W = 30;
  const x = decode(file, { start: t.sec - W, dur: 2 * W, sr: 11025 });
  const env = rmsEnvelope(x, 1102, 551); // 100ms win, 50ms hop
  let mi = 0;
  for (let i = 0; i < env.length; i++) if (env[i] < env[mi]) mi = i;
  // smoothed 1s profile, printed every 2s
  const prof = [];
  for (let s = 0; s < 2 * W; s += 3) {
    let m = 0, c = 0;
    for (let i = s * 20; i < (s + 3) * 20 && i < env.length; i++) { m += env[i]; c++; }
    prof.push(db(m / c).toFixed(0));
  }
  console.log(`${t.title.slice(0, 22).padEnd(24)} min@${(mi * 0.05 - W).toFixed(2).padStart(7)}s ${db(env[mi]).toFixed(0)}dB | ${prof.join(' ')}`);
}
