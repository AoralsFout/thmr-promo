// QC for synthesized dialogue: round-trip every line through speech-to-text,
// and let an audio model describe each speaker's voice (we cannot listen).
import fs from 'node:fs';
import path from 'node:path';
import { transcribe, audioUnderstand } from './openai.mjs';
import { LINES } from './script-lines.mjs';

const manifest = JSON.parse(fs.readFileSync(path.resolve('public', 'data', 'lines.json'), 'utf8'));
const only = process.argv.slice(2);
const items = manifest.filter((m) => !only.length || only.includes(m.id));

const out = [];
const queue = [...items];
const seenSpeaker = new Set();

await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const m = queue.shift();
      if (!m) break;
      const file = path.resolve('public', m.file);
      const src = LINES.find((l) => l.id === m.id);
      let stt = '';
      let ears = '';
      try {
        stt = (await transcribe({ audioPath: file })).replace(/\s+/g, ' ');
      } catch (e) {
        stt = `STT FAIL ${String(e).slice(0, 80)}`;
      }
      if (!seenSpeaker.has(m.who)) {
        seenSpeaker.add(m.who);
        try {
          ears = (
            await audioUnderstand({
              audioPath: file,
              prompt:
                '请只用一句话回答：这句配音听起来像多大年龄、什么性格的角色？情绪是什么？普通话是否自然、有没有读错或奇怪的停顿？最后给出 1-10 的动画配音适配度评分。',
            })
          ).replace(/\s+/g, ' ');
        } catch (e) {
          ears = `EARS FAIL ${String(e).slice(0, 80)}`;
        }
      }
      out.push({ id: m.id, who: m.who, dur: m.durationSec, want: src?.tts ?? '', stt, ears });
    }
  }),
);

out.sort((a, b) => manifest.findIndex((m) => m.id === a.id) - manifest.findIndex((m) => m.id === b.id));
for (const o of out) {
  console.log(`\n[${o.id}] ${o.who} ${o.dur.toFixed(2)}s`);
  console.log(`  want: ${o.want}`);
  console.log(`  stt : ${o.stt}`);
  if (o.ears) console.log(`  ears: ${o.ears}`);
}
fs.writeFileSync(path.resolve('gen', 'tts_qc.json'), JSON.stringify(out, null, 2));
