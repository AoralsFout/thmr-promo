// Numeric sanity checks on the final soundtrack (we cannot listen to it).
import { decode, db } from './audio-lib.mjs';
import * as TL from '../src/timeline.ts';
const sr = 22050;
const x = decode('public/audio/soundtrack.wav', { sr });
const rms = (a, b) => { let s = 0; const i0 = Math.round(a * sr), i1 = Math.min(x.length, Math.round(b * sr)); for (let i = i0; i < i1; i++) s += x[i] * x[i]; return db(Math.sqrt(s / Math.max(1, i1 - i0))).toFixed(1); };
let peak = 0, clipped = 0; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > peak) peak = v; if (v > 0.985) clipped++; }
console.log(`duration ${(x.length / sr).toFixed(2)}s  peak ${db(peak).toFixed(2)} dBFS  samples>0.985: ${clipped}`);
const around = (name, t) => console.log(`${name.padEnd(22)} t=${t.toFixed(2).padStart(7)}  [-1.0,-0.5] ${rms(t - 1, t - 0.5)}  [-0.5,-0.1] ${rms(t - 0.5, t - 0.1)}  [-0.1,0] ${rms(t - 0.1, t)}  [0,0.1] ${rms(t, t + 0.1)}  [0.1,0.5] ${rms(t + 0.1, t + 0.5)}  [0.5,1] ${rms(t + 0.5, t + 1)}`);
around('lock (AF first note)', TL.T_LOCK);
around('AF tape stop', TL.T_AF_STOP);
around('BA drop 1 (S2)', TL.T2);
around('BA break (S4)', TL.T4);
around('BA drop 2 (S5)', TL.T5);
around('outro (S6)', TL.T6);
around('end', TL.T_END - 1);
// beat alignment: mean onset energy on BA beats vs. off-beats during S2
let on = 0, off = 0, n = 0; const beat = 60 / TL.BA.bpm;
for (let k = 0; k < 90; k++) { const t = TL.T2 + k * beat; on += Number(rms(t, t + 0.06)); off += Number(rms(t + beat / 2 - 0.03, t + beat / 2 + 0.03)); n++; }
console.log(`S2 on-beat ${(on / n).toFixed(1)} dB vs off-beat ${(off / n).toFixed(1)} dB (on-beat should be louder)`);
