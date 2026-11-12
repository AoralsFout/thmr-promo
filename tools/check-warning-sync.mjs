// Check decoded audio samples, including consumers that discard stream offsets.
// node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/check-warning-sync.mjs <video> <original-without-warning>
import { spawnSync } from 'node:child_process';
import { WARNING_SECONDS, T_LOCK, T2, T4, T5, T6 } from '../src/timeline.ts';

const [video, original] = process.argv.slice(2);
if (!video || !original) {
  console.error('Usage: node tools/check-warning-sync.mjs <video> <original-without-warning>');
  process.exit(1);
}
const sr = 8000;
function decode(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a:0',
    '-af', 'asetpts=PTS-STARTPTS', '-ac', '1', '-ar', String(sr), '-f', 'f32le', 'pipe:1'],
  { maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr.toString());
  return new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.byteLength));
}
const reference = decode(original);
const actual = decode(video);
let silentEnergy = 0;
// Leave 50 ms at the boundary for AAC/resampling filter pre-ringing.
const silentSamples = Math.round((WARNING_SECONDS - 0.05) * sr);
for (let i = 0; i < silentSamples; i++) silentEnergy += actual[i] ** 2;
const silentRms = Math.sqrt(silentEnergy / silentSamples);
let ok = actual.length >= reference.length + Math.round((WARNING_SECONDS - 0.05) * sr);
ok &&= silentRms < 1e-7;
console.log(`Decoded warning silence: RMS=${silentRms.toExponential(3)} (required < 1e-7)`);
for (const time of [1, T_LOCK, T2, T4, T5, T6]) {
  const start = Math.round(time * sr);
  const shift = Math.round(WARNING_SECONDS * sr);
  let dot = 0, a2 = 0, b2 = 0;
  for (let i = 0; i < sr / 2; i++) {
    const a = reference[start + i], b = actual[start + shift + i] ?? 0;
    dot += a * b; a2 += a * a; b2 += b * b;
  }
  const similarity = dot / Math.max(1e-20, Math.sqrt(a2 * b2));
  console.log(`Content ${time.toFixed(3)}s -> video ${(time + WARNING_SECONDS).toFixed(3)}s: correlation=${similarity.toFixed(6)}`);
  ok &&= similarity > 0.98;
}
console.log(ok ? 'PASS: real leading silence and synchronized audio samples' : 'FAIL: audio starts early or no longer aligns after the warning');
if (!ok) process.exitCode = 1;
