// Precise beat grid + section map for a cut track.
//   node tools/beatgrid.mjs <trackId> [bpmMin bpmMax]
import fs from 'node:fs';
import { decode, onsetEnvelope, rmsEnvelope, db } from './audio-lib.mjs';

const id = process.argv[2];
const lo = Number(process.argv[3] ?? 80), hi = Number(process.argv[4] ?? 180);
const sr = 22050, hop = 221; // ~10ms
const x = decode(`gen/music/${id}.mp3`, { sr });
const { env, fps } = onsetEnvelope(x, sr, hop);
const n = env.length;
let mean = 0; for (let i = 0; i < n; i++) mean += env[i]; mean /= n;
const e = Float32Array.from(env, (v) => v - mean);
const ac = (L) => { const l0 = Math.floor(L), fr = L - l0; let s = 0; for (let i = 0; i + l0 + 1 < n; i++) s += e[i] * (e[i + l0] * (1 - fr) + e[i + l0 + 1] * fr); return s / (n - l0); };
// coarse: beat-lag autocorrelation summed at 1,2,4 beats; report top peaks
const cand = [];
for (let bpm = lo; bpm <= hi; bpm += 0.25) { const L = (60 / bpm) * fps; cand.push([bpm, ac(L) + ac(2 * L) + ac(4 * L)]); }
cand.sort((a, b) => b[1] - a[1]);
const top = []; for (const c of cand) { if (top.every((t) => Math.abs(t[0] - c[0]) > 3)) top.push(c); if (top.length >= 4) break; }
console.log('tempo candidates:', top.map((t) => `${t[0]}(${t[1].toFixed(3)})`).join('  '));
// fine: maximize long-lag (16, 32, 64 beats) autocorrelation near best
let best = [top[0][0], -Infinity];
for (let bpm = top[0][0] - 1; bpm <= top[0][0] + 1; bpm += 0.005) { const L = (60 / bpm) * fps; const s = ac(16 * L) + ac(32 * L) + ac(64 * L); if (s > best[1]) best = [bpm, s]; }
const bpm = Math.round(best[0] * 1000) / 1000;
const L = (60 / bpm) * fps;
// phase
let bp = 0, bs = -Infinity;
for (let p = 0; p < L; p += 0.25) { let s = 0; for (let k = 0; p + k * L < n - 2; k++) { const i0 = Math.round(p + k * L); s += env[i0] + 0.6 * (env[i0 - 1] ?? 0) + 0.6 * env[i0 + 1]; } if (s > bs) { bs = s; bp = p; } }
const beat0 = bp / fps, beatSec = 60 / bpm;
// drift check: phase from first vs last third
const phaseOf = (a, b) => { let pp = 0, ss = -Infinity; for (let p = 0; p < L; p += 0.25) { let s = 0; for (let k = Math.ceil((a - p) / L); p + k * L < b; k++) { const i0 = Math.round(p + k * L); if (i0 > 0 && i0 < n - 1) s += env[i0] + 0.6 * env[i0 - 1] + 0.6 * env[i0 + 1]; } if (s > ss) { ss = s; pp = p; } } return pp / fps; };
console.log(`bpm=${bpm} beat0=${beat0.toFixed(3)}s  beat=${beatSec.toFixed(4)}s  bar=${(4 * beatSec).toFixed(4)}s  phase(first third)=${phaseOf(0, n / 3).toFixed(3)} phase(last third)=${phaseOf((2 * n) / 3, n).toFixed(3)}`);
// per-beat loudness + low-band energy
const nb = Math.floor((x.length / sr - beat0) / beatSec);
const loud = new Float32Array(nb), low = new Float32Array(nb);
let lp = 0; const a = 1 - Math.exp((-2 * Math.PI * 120) / sr);
const lowSig = new Float32Array(x.length); for (let i = 0; i < x.length; i++) { lp += a * (x[i] - lp); lowSig[i] = lp; }
for (let b = 0; b < nb; b++) { const s0 = Math.floor((beat0 + b * beatSec) * sr), s1 = Math.floor((beat0 + (b + 1) * beatSec) * sr); let s = 0, l = 0; for (let i = s0; i < s1; i++) { s += x[i] * x[i]; l += lowSig[i] * lowSig[i]; } loud[b] = db(Math.sqrt(s / (s1 - s0))); low[b] = db(Math.sqrt(l / (s1 - s0))); }
// bar phase vote: where do the biggest 4-beat-average loudness jumps happen (mod 4)?
const jumps = [];
for (let b = 4; b + 4 <= nb; b++) { const pre = (loud[b - 1] + loud[b - 2] + loud[b - 3] + loud[b - 4]) / 4, post = (loud[b] + loud[b + 1] + loud[b + 2] + loud[b + 3]) / 4; const lpre = (low[b - 1] + low[b - 2] + low[b - 3] + low[b - 4]) / 4, lpost = (low[b] + low[b + 1] + low[b + 2] + low[b + 3]) / 4; jumps.push([b, Math.abs(post - pre) + 0.5 * Math.abs(lpost - lpre), post - pre, lpost - lpre]); }
jumps.sort((p, q) => q[1] - p[1]);
const picked = []; for (const j of jumps) { if (picked.every((p) => Math.abs(p[0] - j[0]) >= 8)) picked.push(j); if (picked.length >= 16) break; }
const vote = [0, 0, 0, 0]; for (const p of picked) vote[p[0] % 4] += p[1];
const barPhase = vote.indexOf(Math.max(...vote));
console.log('bar-phase votes (beat mod 4):', vote.map((v) => v.toFixed(1)).join(' '), '=> downbeat beats ≡', barPhase);
picked.sort((p, q) => p[0] - q[0]);
console.log('section changes (beat, time, bar#, Δloud dB, Δlow dB):');
for (const p of picked) console.log(`  beat ${String(p[0]).padStart(4)}  t=${(beat0 + p[0] * beatSec).toFixed(2).padStart(7)}s  bar ${((p[0] - barPhase) / 4).toFixed(2).padStart(6)}  ${p[2].toFixed(1).padStart(6)}  ${p[3].toFixed(1).padStart(6)}`);
// per-bar loudness map
const bars = []; for (let b = barPhase; b + 4 <= nb; b += 4) bars.push(Math.round((loud[b] + loud[b + 1] + loud[b + 2] + loud[b + 3]) / 4));
console.log('per-bar dB (from first downbeat):'); for (let i = 0; i < bars.length; i += 16) console.log(`  bar ${String(i).padStart(3)} @${(beat0 + (barPhase + i * 4) * beatSec).toFixed(1).padStart(6)}s: ${bars.slice(i, i + 16).join(' ')}`);
fs.writeFileSync(`gen/music/${id}.grid.json`, JSON.stringify({ id, bpm, beat0, barPhase, beatSec, bars }, null, 1));
