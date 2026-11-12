// Build gen/tracks.json: every track that aired during recording, mapped to the
// stream file + offset (seconds) where it starts. 320k CBR => 40000 bytes/sec.
import fs from 'node:fs';
const lines = fs.readFileSync('captures/radio/events.jsonl', 'utf8').trim().split('\n')
  .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const marks = {};
for (const e of lines) if (e.type === 'mark') (marks[e.file] ??= []).push([e.t, e.bytes]);
const files = Object.keys(marks).filter((f) => marks[f].length > 20);
function locate(t) {
  for (const f of files) {
    const m = marks[f];
    if (t < m[0][0] || t > m[m.length - 1][0]) continue;
    let lo = 0, hi = m.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (m[mid][0] <= t) lo = mid; else hi = mid; }
    const [t0, b0] = m[lo], [t1, b1] = m[hi];
    return { file: f, sec: (b0 + ((b1 - b0) * (t - t0)) / Math.max(1, t1 - t0)) / 40000, endSec: m[m.length - 1][1] / 40000 };
  }
  return null;
}
const out = [];
for (const e of lines) {
  if (e.type !== 'track') continue;
  const c = e.current;
  const loc = locate(c.startedAtMs ?? e.t);
  out.push({
    id: c.trackId, artist: c.artist, title: c.title, dur: c.durationSec, path: c.relativePath,
    file: loc?.file ?? null, sec: loc ? Math.round(loc.sec * 10) / 10 : null,
    full: !!loc && loc.sec > 6 && loc.endSec - loc.sec > c.durationSec + 6,
  });
}
fs.writeFileSync('gen/tracks.json', JSON.stringify(out, null, 1));
console.log(`tracks ${out.length}, fully recorded ${out.filter((o) => o.full).length}`);
