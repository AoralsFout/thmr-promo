// Turn the raw client captures (captures/app2, made by tools/capture-app.mjs)
// into film assets under public/app:
//   l_<theme>_<mode>.jpg   desktop layout stills, window chrome kept (it is a real Windows window)
//   p_<theme>_<mode>.jpg   portrait stills with the desktop title bar cropped off -> pure "phone" UI
//   desk.mp4 / phone.mp4   14 s real screen recordings (reimu · dark)
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
const SRC = 'captures/app2', OUT = 'public/app';
const TITLE_BAR = 40; // px, height of the client's custom title bar in the portrait window
for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.png') && !f.startsWith('test'))) {
  const name = f.replace('.png', '');
  const img = sharp(`${SRC}/${f}`);
  const m = await img.metadata();
  if (name.startsWith('p_')) await img.extract({ left: 0, top: TITLE_BAR, width: m.width, height: m.height - TITLE_BAR }).jpeg({ quality: 94 }).toFile(`${OUT}/${name}.jpg`);
  else await img.jpeg({ quality: 93 }).toFile(`${OUT}/${name}.jpg`);
}
const enc = (src, dst, vf) => spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-an', ...(vf ? ['-vf', vf] : []), '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '60', '-movflags', '+faststart', dst], { stdio: 'inherit' });
enc(`${SRC}/l_reimu_dark.mkv`, `${OUT}/desk.mp4`);
enc(`${SRC}/p_reimu_dark.mkv`, `${OUT}/phone.mp4`, `crop=iw:ih-${TITLE_BAR}:0:${TITLE_BAR}`);
console.log(fs.readdirSync(OUT).join(' '));
