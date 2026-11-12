// Smoke test for the OpenAI helpers: one flare + one sunburst image, one TTS line
// (+ transcription round-trip and an audio-model description), and an audio
// model listen of a captured radio segment.
import fs from 'node:fs';
import path from 'node:path';
import { genImage, tts, transcribe, audioUnderstand } from './openai.mjs';

const OUT = path.resolve('gen', 'test');
fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// 1) fast model speed check
{
  const t0 = Date.now();
  try {
    const { images, usage } = await genImage({
      prompt: '一幅宁静的水彩风格小图：博丽神社的赛钱箱特写，午后的光，无人物。',
      model: 'gpt-image-2.6-flare',
      size: '1024x1024',
      quality: 'low',
    });
    fs.writeFileSync(path.join(OUT, 'flare_low.png'), images[0]);
    log(`flare low ok in ${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(usage));
  } catch (e) {
    log('flare FAIL', String(e).slice(0, 300));
  }
}

// 2) hero-model quality check for a real background
{
  const t0 = Date.now();
  try {
    const { images, usage } = await genImage({
      prompt:
        '日式幻想风格动画背景美术，水彩与薄涂质感：夜晚的外界公寓房间一角，一张旧木桌上放着一台老式收音机，' +
        '收音机调频盘的暖光微微发亮，窗外是城市的点点灯火与深蓝夜空，室内没有任何人物，构图留出大片负空间，' +
        '色调深邃、安静、略带怀旧感，参考东方Project秘封俱乐部的氛围，画面中不要出现任何文字。',
      model: 'gpt-image-2.6-sunburst',
      size: '1536x1024',
      quality: 'medium',
    });
    fs.writeFileSync(path.join(OUT, 'bg_outside_night.png'), images[0]);
    log(`sunburst medium ok in ${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(usage));
  } catch (e) {
    log('sunburst FAIL', String(e).slice(0, 300));
  }
}

// 3) TTS voice samples + verification
const voiceLines = [
  { id: 'reimu_coral', voice: 'coral', instructions: '懒洋洋的少女语气，略带无奈与嫌弃，语速偏慢，像在叹气。', text: '唉……今天的赛钱箱，也是空的。' },
  { id: 'marisa_nova', voice: 'nova', instructions: '元气十足的少年感少女，张扬、兴奋、语速快，带一点狡黠的笑意。', text: '灵梦——！大新闻哒贼！幻想乡开电台了！' },
  { id: 'cirno_shimmer', voice: 'shimmer', instructions: '像小孩子一样天真又骄傲，音调偏高，大声、理直气壮。', text: '我选九十六K！因为里面有九！' },
];
for (const v of voiceLines) {
  try {
    const buf = await tts({ text: v.text, voice: v.voice, instructions: v.instructions, format: 'wav' });
    const p = path.join(OUT, `tts_${v.id}.wav`);
    fs.writeFileSync(p, buf);
    const back = await transcribe({ audioPath: p });
    log(`tts ${v.id} ok (${buf.length}B) stt="${back.replace(/\n/g, ' ')}"`);
  } catch (e) {
    log(`tts ${v.id} FAIL`, String(e).slice(0, 300));
  }
}

// 4) audio model as ears on the first synthesized clip
{
  const p = path.join(OUT, 'tts_reimu_coral.wav');
  if (fs.existsSync(p)) {
    try {
      const desc = await audioUnderstand({ audioPath: p, prompt: '这一句配音听起来像什么年龄和性格的女孩？情绪是什么？中文自然吗？用两三句话回答。' });
      log('ears(reimu):', desc.replace(/\n/g, ' | '));
    } catch (e) {
      log('ears FAIL', String(e).slice(0, 400));
    }
  }
}

// 5) ears on real radio material (first segment, first 40 seconds)
{
  const seg = 'captures/radio/stream_2026-11-11T14-35-23-610Z.mp3';
  if (fs.existsSync(seg)) {
    const cut = path.join(OUT, 'radio_probe.mp3');
    const { execSync } = await import('node:child_process');
    execSync(`ffmpeg -y -v error -t 40 -i "${seg}" -c copy "${cut}"`);
    try {
      const desc = await audioUnderstand({
        audioPath: cut,
        prompt: '这段电台录音里依次有哪些音乐？分别描述：风格、情绪、大致BPM倾向（快/中/慢）、有没有人声演唱、适合作为视频的什么段落（开场/中段/高潮/结尾）。',
      });
      log('ears(radio):', desc.replace(/\n/g, ' | '));
    } catch (e) {
      log('ears radio FAIL', String(e).slice(0, 400));
    }
  }
}

log('test done');
