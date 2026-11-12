// Generate every dialogue line with gpt-4o-mini-tts, measure durations and
// write public/data/lines.json for the Remotion timeline.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { tts } from './openai.mjs';
import { LINES, VOICES } from './script-lines.mjs';

const OUT = path.resolve('public', 'audio', 'lines');
fs.mkdirSync(OUT, { recursive: true });

const CONCURRENCY = 3;
const manifest = [];

async function one(line) {
  const v = VOICES[line.who];
  const buf = await tts({ text: line.tts, voice: v.voice, instructions: v.instr, format: 'wav', speed: line.speed });
  const file = `${line.id}.wav`;
  const full = path.join(OUT, file);
  fs.writeFileSync(full, buf);
  const dur = parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${full}"`).toString().trim(),
  );
  manifest.push({
    id: line.id,
    who: line.who,
    file: `audio/lines/${file}`,
    display: line.display,
    durationSec: dur,
    voice: v.voice,
  });
  console.log(`${line.id.padEnd(18)} ${dur.toFixed(2)}s  ${line.who}`);
}

const queue = [...LINES];
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const line = queue.shift();
    if (!line) break;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await one(line);
        break;
      } catch (e) {
        console.error(`retry ${line.id} (${attempt + 1}/3):`, String(e).slice(0, 200));
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
});
await Promise.all(workers);

manifest.sort((a, b) => LINES.findIndex((l) => l.id === a.id) - LINES.findIndex((l) => l.id === b.id));
fs.writeFileSync(path.resolve('public', 'data', 'lines.json'), JSON.stringify(manifest, null, 2));
const total = manifest.reduce((acc, m) => acc + m.durationSec, 0);
console.log(`done: ${manifest.length} lines, total speech ${total.toFixed(1)}s`);
