// Build the complete soundtrack (music + "voice" blips + SFX) from the timeline.
//
//   node tools/build-audio.mjs        ->  public/audio/soundtrack.wav
//
// Music is cut from the station's own stream recording (gen/music/<id>.mp3, made
// by tools/music-survey.mjs) and placed on the beat grid defined in
// src/timeline.ts. There is no spoken voice: every dialogue line is "performed"
// by a per-character typewriter blip, like a visual novel.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { decode, writeWav, db } from './audio-lib.mjs';
import { SR, rng, SFX, blip, staticNoise, Biquad } from './synth.mjs';
import * as TL from '../src/timeline.ts';

const { T_END, T_LOCK, T2, T6, T_AF_STOP, AF, BA, AF_OFFSET, BA_SEGS, BA_BEAT, LINES, CUES, CAST } = TL;
const N = Math.ceil(T_END * SR);
const mk = () => [new Float32Array(N), new Float32Array(N)];
const music = mk();
const fx = mk();
const voice = mk();
const rand = rng(909);

/** Equal-power pan a mono clip into a stereo bus. */
function place(bus, clip, t, gain = 1, pan = 0) {
  const o = Math.round(t * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  for (let i = 0; i < clip.length; i++) {
    const j = o + i;
    if (j < 0 || j >= N) continue;
    bus[0][j] += clip[i] * gl;
    bus[1][j] += clip[i] * gr;
  }
}

/** Decode a cut track as stereo float arrays. */
function loadTrack(id, start = 0, dur) {
  const x = decode(`gen/music/${id}.mp3`, { start, dur, sr: SR, channels: 2 });
  const n = x.length / 2;
  const l = new Float32Array(n), r = new Float32Array(n);
  for (let i = 0; i < n; i++) { l[i] = x[2 * i]; r[i] = x[2 * i + 1]; }
  return [l, r];
}
const rmsOf = (ch, a = 0, b = ch[0].length) => { let s = 0; for (let i = a; i < b; i++) s += ch[0][i] * ch[0][i] + ch[1][i] * ch[1][i]; return Math.sqrt(s / (2 * Math.max(1, b - a))); };
const smooth = (u) => { const c = Math.max(0, Math.min(1, u)); return c * c * (3 - 2 * c); };

// ── MUSIC ────────────────────────────────────────────────────────────────────
// 1) "in the afternoon": from the lock-on to the tape stop before the BA drop.
{
  const tr = loadTrack(AF.id);
  const g = 0.2 / rmsOf(tr, 40 * SR, 100 * SR); // main section sits at about -14 dBFS RMS
  const stopLen = 0.55; // tape-stop duration
  const a = Math.round(T_LOCK * SR), b = Math.round(T_AF_STOP * SR);
  for (let i = a; i < b; i++) {
    const src = i - Math.round(AF_OFFSET * SR);
    const fade = smooth((i - a) / (0.03 * SR));
    music[0][i] += tr[0][src] * g * fade;
    music[1][i] += tr[1][src] * g * fade;
  }
  // tape stop: playback rate glides 1 -> 0
  let pos = b - Math.round(AF_OFFSET * SR);
  const n = Math.round(stopLen * SR);
  for (let k = 0; k < n; k++) {
    const u = k / n;
    const rate = Math.pow(1 - u, 1.6);
    const i0 = Math.floor(pos), fr = pos - i0;
    const gg = g * (1 - u * u);
    music[0][b + k] += (tr[0][i0] * (1 - fr) + tr[0][i0 + 1] * fr) * gg;
    music[1][b + k] += (tr[1][i0] * (1 - fr) + tr[1][i0 + 1] * fr) * gg;
    pos += rate;
  }
  console.log(`AF gain ${db(g).toFixed(1)} dB`);
}
// 2) "Bad Apple!!": re-cut on bar lines (BA_SEGS). A filtered lead-in plays
//    under the riser, the track is full from the drop (T2) to T6, then it keeps
//    playing through a "small radio speaker" to the end.
{
  const tr = loadTrack(BA.id);
  const g = 0.215 / rmsOf(tr, 60 * SR, 110 * SR);
  const leadIn = T_AF_STOP + 0.45;
  const a = Math.round(leadIn * SR), d = Math.round(T2 * SR), e = Math.round(T6 * SR), z = N;
  // film time -> track time, per segment (segment k is also extrapolated a
  // little past its ends so splices can be cross-faded)
  const segs = [];
  let filmBeat = 0;
  for (const sg of BA_SEGS) { segs.push({ f0: filmBeat, f1: filmBeat + sg.bars * 4, from: sg.from }); filmBeat += sg.bars * 4; }
  segs[0].f0 = -Infinity; // lead-in continues backwards from the first drop
  segs[segs.length - 1].f1 = Infinity; // and the last one runs on into S6
  const trackSample = (k, fb) => (BA.beat0 + (segs[k].from + (fb - (k === 0 ? 0 : segs[k].f0))) * BA_BEAT) * SR;
  const read = (c, pos) => { const i0 = Math.floor(pos); if (i0 < 0 || i0 + 1 >= tr[c].length) return 0; const fr = pos - i0; return tr[c][i0] * (1 - fr) + tr[c][i0 + 1] * fr; };
  const XF = 0.012; // seconds of cross-fade either side of a splice
  const hp = [new Biquad(), new Biquad()];
  const bp = [new Biquad(), new Biquad()], lp2 = [new Biquad(), new Biquad()];
  for (const c of [0, 1]) { bp[c].set('hp', 420, 0.8); lp2[c].set('lp', 2600, 0.8); }
  for (let i = a; i < z; i++) {
    const fb = (i / SR - T2) / BA_BEAT; // film beats since the drop
    let k = segs.findIndex((sg) => fb >= sg.f0 && fb < sg.f1);
    if (k < 0) k = segs.length - 1;
    // cross-fade weight towards the neighbouring segment near a splice
    let other = -1, w = 0;
    const toEnd = (segs[k].f1 - fb) * BA_BEAT, fromStart = (fb - segs[k].f0) * BA_BEAT;
    if (toEnd < XF && k + 1 < segs.length) { other = k + 1; w = 0.5 * (1 - toEnd / XF); }
    else if (fromStart < XF && k > 0) { other = k - 1; w = 0.5 * (1 - fromStart / XF); }
    for (const c of [0, 1]) {
      let s = read(c, trackSample(k, fb));
      if (other >= 0) s = s * (1 - w) + read(c, trackSample(other, fb)) * w;
      s *= g;
      if (i < d) {
        // lead-in: thin + rising, with a 60 ms hole right before the drop
        const u = (i - a) / (d - a);
        if (i % 48 === 0) hp[c].set('hp', 2600 * Math.pow(0.12, u), 0.8);
        s = hp[c].run(s) * 0.75 * u * u * smooth((d - i) / (0.06 * SR));
      } else if (i >= e) {
        // S6: collapse to a small-speaker sound and fade under the outro
        const u = smooth((i - e) / (0.5 * SR));
        const wet = lp2[c].run(bp[c].run(s));
        const tail = 1 - smooth((i / SR - (T_END - 5.5)) / 4.6);
        s = (s * (1 - u) + wet * u * 0.42) * tail;
      }
      music[c][i] += s;
    }
  }
  console.log(`BA gain ${db(g).toFixed(1)} dB, segments: ${BA_SEGS.map((sg) => `${sg.from}+${sg.bars}bars`).join(' | ')}`);
}
// 3) S0: while the dial sweeps, fragments of other broadcasts leak through.
{
  const frags = [
    { id: '3887b951db56f19f', at: 60, t: 1.42, len: 1.0 }, // 少女さとり Violin×Piano
    { id: '1c00f174e991f07d', at: 70, t: 4.42, len: 0.8 }, // 幻想浪漫飛行
    { id: '55ce4543697dd84a', at: 50, t: 7.12, len: 0.85 }, // Shining Go Your Way
    { id: '528e988708be8404', at: 40, t: 9.5, len: 0.9 }, // 秘密のティータイム
  ];
  for (const f of frags) {
    if (!fs.existsSync(`gen/music/${f.id}.mp3`)) continue;
    const tr = loadTrack(f.id, f.at, f.len + 0.1);
    const g = 0.11 / Math.max(1e-4, rmsOf(tr));
    const bq = [new Biquad(), new Biquad()], bq2 = [new Biquad(), new Biquad()];
    for (const c of [0, 1]) { bq[c].set('hp', 500, 0.8); bq2[c].set('lp', 2400, 0.8); }
    const n = Math.round(f.len * SR), o = Math.round(f.t * SR);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const env = Math.sin(Math.PI * u) ** 0.7 * (0.75 + 0.25 * Math.sin(2 * Math.PI * 13 * u));
      const m = (tr[0][i] + tr[1][i]) * 0.5; // AM-radio mono
      const s = bq2[0].run(bq[0].run(m)) * g * env;
      music[0][o + i] += s;
      music[1][o + i] += s;
    }
  }
}

// ── STATIC ───────────────────────────────────────────────────────────────────
{
  const dips = [1.42, 4.42, 7.12, 9.5]; // signal pokes through => static ducks
  const level = (t) => {
    if (t >= T_LOCK) return 0;
    let v = 0.2 * smooth(t / 0.7);
    for (const d of dips) if (t > d - 0.05 && t < d + 1.0) v *= 0.45;
    v *= 1 + 0.9 * smooth((t - (T_LOCK - 0.8)) / 0.8); // swell into the lock
    return v;
  };
  place(fx, staticNoise(T_LOCK + 0.01, level, rand), 0, 1, 0);
  // S6: a breath of static as the picture returns to the room
  const tail = staticNoise(T_END - T6, (t) => 0.1 * Math.exp(-t / 1.1) + 0.012 * (1 - smooth((t - 8) / 5)), rand);
  place(fx, tail, T6, 1, 0);
}

// ── SFX CUES ─────────────────────────────────────────────────────────────────
for (const c of CUES) {
  let clip;
  if (c.sfx === 'riser') clip = SFX.riser(rand, c.dur ?? 2);
  else if (SFX[c.sfx]) clip = SFX[c.sfx](rand);
  else { console.warn('unknown sfx', c.sfx); continue; }
  place(fx, clip, c.t, (c.gain ?? 1) * 0.42, c.pan ?? 0);
}

// ── VOICE BLIPS ──────────────────────────────────────────────────────────────
// pentatonic wander around each character's base pitch, rising on questions
const STEPS = [-3, 0, 0, 2, 4, 0, 2, -3, 0, 5, 2, 0];
const PAN = { reimu: -0.25, marisa: 0.25, sanae: 0.05, cirno: 0.1, koishi: -0.1, satori: -0.15, remilia: -0.2, tenshi: 0.15, renko: -0.2, merry: 0.2 };
let blipCount = 0;
for (const line of LINES) {
  const who = CAST[line.who];
  const radio = line.style === 'radio';
  // louder over the dense BA mix, gentler in the quiet scenes
  const g = (radio ? 0.11 : line.t0 >= T2 && line.t0 < T6 ? 0.26 : 0.16) * (line.shout ? 1.2 : 1);
  const times = TL.blipTimes(line);
  times.forEach((b, k) => {
    const semi = STEPS[(k * 5 + line.id.length) % STEPS.length] + (b.rise ? 4 : 0) + (rand() < 0.2 ? 1 : 0);
    const clip = blip(who.blip * Math.pow(2, semi / 12), who.wave, { soft: radio });
    place(voice, clip, b.t, g, PAN[line.who] ?? 0);
    blipCount++;
  });
}

// ── DUCKING: dip the music a little while a line is being "spoken" ───────────
{
  const duck = new Float32Array(N).fill(1);
  for (const line of LINES) {
    const g = TL.typeSchedule(line);
    const a = line.t0 + 0.05, b = line.t0 + g[g.length - 1].t + 0.2;
    const depth = line.t0 >= T2 && line.t0 < T6 ? 0.68 : 0.82;
    for (let i = Math.round((a - 0.08) * SR); i < Math.round((b + 0.25) * SR) && i < N; i++) {
      const t = i / SR;
      const u = Math.min(smooth((t - (a - 0.08)) / 0.08), 1 - smooth((t - b) / 0.25));
      duck[i] = Math.min(duck[i], 1 - (1 - depth) * u);
    }
  }
  for (let i = 0; i < N; i++) { music[0][i] *= duck[i]; music[1][i] *= duck[i]; }
}

// ── MASTER ───────────────────────────────────────────────────────────────────
const out = new Float32Array(N * 2);
let peak = 0;
for (let i = 0; i < N; i++) {
  for (const c of [0, 1]) {
    // gentle soft-clip so stacked hits never square off
    const v = Math.tanh((music[c][i] + fx[c][i] + voice[c][i]) * 1.15) / 1.15;
    out[2 * i + c] = v;
    peak = Math.max(peak, Math.abs(v));
  }
}
fs.mkdirSync('public/audio', { recursive: true });
const raw = path.resolve('gen', 'soundtrack_raw.wav');
writeWav(raw, out, SR, 2);

// measure integrated loudness, then static gain to -14 LUFS with a limiter
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
const m = /Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/.exec(probe.stderr);
const I = m ? Number(m[1]) : -14;
const gainDb = Math.min(8, -14 - I);
const final = path.resolve('public', 'audio', 'soundtrack.wav');
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', `volume=${gainDb.toFixed(2)}dB,alimiter=limit=0.891:attack=3:release=60:level=disabled`, '-ar', '48000', '-c:a', 'pcm_s16le', final]);
if (r.status !== 0) throw new Error(r.stderr.toString());

// report (we cannot listen, so print the numbers that matter)
const report = [];
for (const s of TL.SCENES) {
  const a = Math.round(s.t0 * SR), b = Math.min(N, Math.round(s.t1 * SR));
  report.push(`${s.id} ${s.name.padEnd(8)} ${s.t0.toFixed(2).padStart(7)}–${s.t1.toFixed(2).padStart(7)}  music ${db(rmsOf(music, a, b)).toFixed(1).padStart(6)}  fx ${db(rmsOf(fx, a, b)).toFixed(1).padStart(6)}  voice ${db(rmsOf(voice, a, b)).toFixed(1).padStart(6)} dB`);
}
console.log(report.join('\n'));
console.log(`blips ${blipCount}, cues ${CUES.length}, raw peak ${db(peak).toFixed(1)} dBFS, integrated ${I} LUFS -> gain ${gainDb.toFixed(2)} dB`);
console.log(`soundtrack -> ${final}  (${(T_END).toFixed(2)}s)`);
