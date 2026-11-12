#!/usr/bin/env node
// Records the THMR live stream (320k MP3) continuously and logs track metadata,
// so the promo's music can be cut from the station's own broadcast with exact
// titles / artists / covers.
//
//   node tools/record-stream.mjs [outDir=captures/radio] [hours=12]
//
// Output:
//   stream_<iso>.mp3   raw MP3 bytes, one file per connection
//   events.jsonl       connect / mark (wall-clock <-> byte offset) / track / close
//   covers/<trackId>.* cover art of every track that aired
//   queue_<ms>.json    queue snapshots (every 30 min)
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://radio.yunmoan.cn';
const STATION = 'touhou';
const PROFILE = '320k';
const OUT = path.resolve(process.argv[2] ?? 'captures/radio');
const HOURS = Number(process.argv[3] ?? 12);
const STALL_MS = 30_000;
const UA = 'THMR-Promo-Recorder/1.0';

fs.mkdirSync(path.join(OUT, 'covers'), { recursive: true });
const endAt = Date.now() + HOURS * 3600_000;
const events = fs.createWriteStream(path.join(OUT, 'events.jsonl'), { flags: 'a' });
const log = (o) => events.write(JSON.stringify({ t: Date.now(), ...o }) + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

async function recordLoop() {
  while (Date.now() < endAt) {
    const name = `stream_${stamp()}.mp3`;
    const ws = fs.createWriteStream(path.join(OUT, name));
    const ac = new AbortController();
    let bytes = 0;
    let lastMark = 0;
    let lastData = Date.now();
    const watchdog = setInterval(() => {
      if (Date.now() - lastData > STALL_MS || Date.now() >= endAt) ac.abort();
    }, 5000);
    try {
      const res = await fetch(`${BASE}/live/${STATION}/${PROFILE}`, {
        signal: ac.signal,
        headers: { 'User-Agent': UA },
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      log({ type: 'connect', file: name, status: res.status, contentType: res.headers.get('content-type') });
      console.log(`[rec] connected -> ${name}`);
      for await (const chunk of res.body) {
        lastData = Date.now();
        if (!ws.write(chunk)) await new Promise((r) => ws.once('drain', r));
        bytes += chunk.length;
        if (bytes - lastMark >= 80_000) {
          lastMark = bytes;
          log({ type: 'mark', file: name, bytes });
        }
      }
    } catch (e) {
      log({ type: 'disconnect', file: name, bytes, msg: String(e?.message ?? e) });
      console.log(`[rec] disconnected after ${bytes} bytes: ${e?.message ?? e}`);
    } finally {
      clearInterval(watchdog);
      await new Promise((r) => ws.end(r));
      log({ type: 'close', file: name, bytes });
    }
    if (Date.now() < endAt) await sleep(1500);
  }
}

async function saveCover(track) {
  if (!track?.coverUrl) return;
  try {
    const res = await fetch(BASE + track.coverUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return;
    const type = res.headers.get('content-type') ?? '';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    fs.writeFileSync(path.join(OUT, 'covers', `${track.trackId}.${ext}`), Buffer.from(await res.arrayBuffer()));
  } catch {
    /* cover is optional */
  }
}

async function pollLoop() {
  let lastId = null;
  let lastQueueDump = 0;
  while (Date.now() < endAt) {
    try {
      const res = await fetch(`${BASE}/api/stations/${STATION}/status`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(15_000),
      });
      const s = await res.json();
      const c = s.current;
      if (c && c.trackId !== lastId) {
        lastId = c.trackId;
        log({ type: 'track', current: c, listeners: s.totals?.listeners ?? null });
        console.log(`[now] ${c.artist ?? '?'} - ${c.title ?? '?'} (${c.durationSec}s)`);
        saveCover(c);
      }
      if (Date.now() - lastQueueDump > 30 * 60_000) {
        lastQueueDump = Date.now();
        fs.writeFileSync(
          path.join(OUT, `queue_${Date.now()}.json`),
          JSON.stringify({ t: Date.now(), current: s.current, previous: s.previous, queue: s.queue, libraryCount: s.libraryCount, totals: s.totals }),
        );
      }
    } catch (e) {
      log({ type: 'pollerr', msg: String(e?.message ?? e) });
    }
    await sleep(10_000);
  }
}

console.log(`[rec] recording ${STATION}/${PROFILE} for up to ${HOURS}h into ${OUT}`);
await Promise.all([recordLoop(), pollLoop()]);
events.end();
console.log('[rec] done');
