// Small audio analysis helpers (ffmpeg decode -> Float32Array, RMS envelope,
// tempo / beat grid estimation, WAV writing). No native deps.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

/** Decode [startSec, startSec+durSec) of any audio file to mono/stereo float PCM. */
export function decode(file, { start = 0, dur, sr = 22050, channels = 1 } = {}) {
  const args = ['-v', 'error', '-ss', String(Math.max(0, start))];
  if (dur != null) args.push('-t', String(dur));
  args.push('-i', file, '-ac', String(channels), '-ar', String(sr), '-f', 'f32le', '-');
  const r = spawnSync('ffmpeg', args, { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg decode failed: ${r.stderr?.toString().slice(0, 400)}`);
  const buf = r.stdout;
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
}

/** RMS envelope with hop/window in samples. */
export function rmsEnvelope(x, win, hop) {
  const n = Math.max(0, Math.floor((x.length - win) / hop) + 1);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const o = i * hop;
    for (let j = 0; j < win; j++) s += x[o + j] * x[o + j];
    out[i] = Math.sqrt(s / win);
  }
  return out;
}

export const db = (v) => 20 * Math.log10(Math.max(v, 1e-9));

/**
 * Onset-strength envelope: half-wave rectified difference of log energy in a few
 * crude bands (one-pole filters), hop = 512 @ 22050 -> ~23ms.
 */
export function onsetEnvelope(x, sr = 22050, hop = 441) {
  // band split with cascaded one-pole lowpasses
  const cut = [150, 800, 3000];
  const bands = cut.length + 1;
  const lp = new Float64Array(cut.length);
  const alpha = cut.map((c) => 1 - Math.exp((-2 * Math.PI * c) / sr));
  const frames = Math.floor(x.length / hop);
  const energy = Array.from({ length: bands }, () => new Float32Array(frames));
  for (let f = 0; f < frames; f++) {
    const acc = new Float64Array(bands);
    for (let i = 0; i < hop; i++) {
      const s = x[f * hop + i];
      let prev = s;
      for (let b = 0; b < cut.length; b++) {
        lp[b] += alpha[b] * (s - lp[b]);
      }
      // band0 = lp0, band1 = lp1-lp0, band2 = lp2-lp1, band3 = s-lp2
      const v0 = lp[0];
      const v1 = lp[1] - lp[0];
      const v2 = lp[2] - lp[1];
      const v3 = prev - lp[2];
      acc[0] += v0 * v0;
      acc[1] += v1 * v1;
      acc[2] += v2 * v2;
      acc[3] += v3 * v3;
    }
    for (let b = 0; b < bands; b++) energy[b][f] = Math.log(1 + 1000 * Math.sqrt(acc[b] / hop));
  }
  const env = new Float32Array(frames);
  for (let b = 0; b < bands; b++) {
    for (let f = 1; f < frames; f++) {
      const d = energy[b][f] - energy[b][f - 1];
      if (d > 0) env[f] += d;
    }
  }
  return { env, fps: sr / hop };
}

/** Estimate tempo (BPM) and beat phase from an onset envelope. */
export function estimateBeat(env, fps, { minBpm = 70, maxBpm = 200 } = {}) {
  const n = env.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += env[i];
  mean /= n;
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) e[i] = env[i] - mean;
  let best = { bpm: 0, score: -Infinity };
  const scores = [];
  for (let bpm = minBpm; bpm <= maxBpm; bpm += 0.05) {
    const lag = (60 / bpm) * fps;
    // comb: sum of autocorrelation at 1,2,4 beats (interpolated)
    let sc = 0;
    for (const [mult, w] of [
      [1, 1],
      [2, 0.8],
      [4, 0.6],
      [8, 0.4],
    ]) {
      const L = lag * mult;
      const l0 = Math.floor(L);
      const fr = L - l0;
      let s = 0;
      for (let i = 0; i + l0 + 1 < n; i += 1) s += e[i] * (e[i + l0] * (1 - fr) + e[i + l0 + 1] * fr);
      sc += (w * s) / (n - l0);
    }
    scores.push([bpm, sc]);
    if (sc > best.score) best = { bpm, score: sc };
  }
  // phase: maximize sum of env at beat positions
  const lag = (60 / best.bpm) * fps;
  let bestPhase = 0;
  let bestSum = -Infinity;
  const steps = Math.ceil(lag);
  for (let p = 0; p < steps; p++) {
    let s = 0;
    for (let k = 0; p + k * lag < n - 1; k++) {
      const pos = p + k * lag;
      const i0 = Math.floor(pos);
      s += env[i0] + env[i0 + 1] * 0.5 + (i0 > 0 ? env[i0 - 1] * 0.5 : 0);
    }
    if (s > bestSum) {
      bestSum = s;
      bestPhase = p;
    }
  }
  return { bpm: Math.round(best.bpm * 100) / 100, phaseSec: bestPhase / fps, scores };
}

/** Write interleaved float samples as 16-bit PCM WAV. */
export function writeWav(file, samples, sr = 48000, channels = 2) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * channels * 2, 28);
  buf.writeUInt16LE(channels * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
}
