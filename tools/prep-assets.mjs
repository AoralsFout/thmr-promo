// Prepare derived assets for the Remotion project:
//  - public/covers/<id>.jpg  (real cover art of tracks that aired while recording)
//  - src/data/tracks.json    (their real titles / artists, for the recreated UI)
//  - public/ui/app_play.mp4  (real Windows client screen capture, h264)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const tracks = JSON.parse(fs.readFileSync('gen/tracks.json', 'utf8'));
const coverDir = 'captures/radio/covers';
const have = new Map(fs.readdirSync(coverDir).map((f) => [f.split('.')[0], f]));
fs.mkdirSync('public/covers', { recursive: true });
fs.mkdirSync('src/data', { recursive: true });

const out = [];
for (const t of tracks) {
  const f = have.get(t.id);
  if (!f) continue;
  const src = path.join(coverDir, f);
  if (fs.statSync(src).size < 12_000) continue; // skip placeholder-ish covers
  try {
    const meta = await sharp(src).metadata();
    if (!meta.width || Math.abs(meta.width - meta.height) > meta.width * 0.15) continue;
    await sharp(src).resize(360, 360, { fit: 'cover' }).jpeg({ quality: 88 }).toFile(`public/covers/${t.id}.jpg`);
    const circle = (t.path || '').split(' - ')[0].replace(/^.*\]\s*/, '').trim();
    out.push({ id: t.id, title: t.title, artist: t.artist, circle, dur: t.dur });
  } catch { /* unreadable cover */ }
}
fs.writeFileSync('src/data/tracks.json', JSON.stringify(out, null, 1));
console.log('covers', out.length);

if (!fs.existsSync('public/ui/app_play.mp4')) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', 'captures/app/A_play.mkv', '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '60', '-movflags', '+faststart', 'public/ui/app_play.mp4']);
  console.log('app video', r.status, r.stderr?.toString().slice(0, 200));
}
fs.copyFileSync('captures/app/look7.png', 'public/ui/app_look7.png');
