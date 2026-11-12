// Survey every TTS voice with the same "anime girl" instruction, so casting can
// be decided from measured pitch instead of guesswork.
import fs from 'node:fs';
import path from 'node:path';
import { tts } from './openai.mjs';

const OUT = path.resolve('gen', 'voices');
fs.mkdirSync(OUT, { recursive: true });
const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];
const text = '大家好，这里是东方音乐电台！今天也要元气满满地听歌哦！';
const instructions = '十五六岁的日系动画少女声线，声音清亮甜美、音调偏高、充满活力。';

await Promise.all(
  VOICES.map(async (voice) => {
    try {
      const buf = await tts({ text, voice, instructions, format: 'wav' });
      fs.writeFileSync(path.join(OUT, `${voice}.wav`), buf);
      console.log('ok', voice, buf.length);
    } catch (e) {
      console.log('FAIL', voice, String(e).slice(0, 160));
    }
  }),
);
