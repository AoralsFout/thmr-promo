// Survey candidate tracks: cut them out of the station recording (lossless mp3
// copy), measure tempo + energy profile, and ask an audio model to describe a
// middle excerpt (we cannot listen ourselves).
//   node tools/music-survey.mjs <substring of title> [...]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { decode, rmsEnvelope, db, onsetEnvelope, estimateBeat } from './audio-lib.mjs';
import { audioUnderstand } from './openai.mjs';

const tracks = JSON.parse(fs.readFileSync('gen/tracks.json', 'utf8'));
const wanted = process.argv.slice(2);
const OUT = 'gen/music';
const surveyFile = path.join(OUT, 'survey.json');
const survey = fs.existsSync(surveyFile) ? JSON.parse(fs.readFileSync(surveyFile, 'utf8')) : {};

/** Exact start/end: quietest 100ms within ±8s of the predicted boundaries. */
function refine(file, sec, dur) {
  const find = (center) => {
    const W = 8;
    const x = decode(file, { start: center - W, dur: 2 * W, sr: 11025 });
    const env = rmsEnvelope(x, 1102, 551);
    let mi = 0;
    for (let i = 0; i < env.length; i++) if (env[i] < env[mi]) mi = i;
    return center - W + mi * 0.05;
  };
  return { start: find(sec), end: find(sec + dur) };
}

async function one(t) {
  const src = path.join('captures/radio', t.file);
  const { start, end } = refine(src, t.sec, t.dur);
  const mp3 = path.join(OUT, `${t.id}.mp3`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(start), '-t', String(end - start), '-i', src, '-c', 'copy', mp3]);
  const x = decode(mp3, { sr: 22050 });
  const { env, fps } = onsetEnvelope(x, 22050);
  const beat = estimateBeat(env, fps);
  const rms = rmsEnvelope(x, 22050 * 5, 22050 * 5);
  const profile = Array.from(rms, (v) => Math.round(db(v)));
  // excerpt for the audio model: 40s starting at 35% of the track
  const ex = path.join(OUT, `${t.id}_ex.mp3`);
  const exStart = Math.max(0, (end - start) * 0.35);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(exStart), '-t', '40', '-i', mp3, '-ac', '1', '-b:a', '64k', ex]);
  let desc = '';
  try {
    desc = await audioUnderstand({
      audioPath: ex,
      prompt:
        '这是一段音乐的 40 秒节选。请用不超过 90 个字描述：1) 曲风与主要乐器 2) 有无人声（男/女/无） 3) 情绪与能量（1-10 分）4) 更适合：A 轻松日常搞笑场景 / B 高燃快剪蒙太奇 / C 神秘安静的开场或尾声。直接回答，不要客套。',
    });
  } catch (e) {
    desc = 'ERR ' + String(e).slice(0, 120);
  }
  survey[t.id] = { id: t.id, title: t.title, artist: t.artist, dur: Math.round((end - start) * 10) / 10, bpm: beat.bpm, phase: Math.round(beat.phaseSec * 1000) / 1000, profile, desc };
  console.log(`\n## ${t.artist} — ${t.title}  (${t.id})\n   ${(end - start).toFixed(1)}s  bpm=${beat.bpm}  phase=${beat.phaseSec.toFixed(3)}\n   5s dB: ${profile.join(' ')}\n   ${desc.replace(/\n+/g, ' ')}`);
}

const list = tracks.filter((t) => t.full && wanted.some((w) => t.title.includes(w)));
const queue = [...list];
await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await one(queue.shift()); }));
fs.writeFileSync(surveyFile, JSON.stringify(survey, null, 1));
