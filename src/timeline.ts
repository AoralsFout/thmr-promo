// ─────────────────────────────────────────────────────────────────────────────
// 《与幻想乡同频》 master timeline — the single source of truth.
//
// This file is PURE DATA + pure functions with no imports, so it is consumed by
// both the Remotion picture (src/*) and the audio builder (tools/build-audio.mjs,
// via Node's native TypeScript type stripping).
//
// The cut is locked to the beat grids of the two tracks that play on the
// "station" during the film (both recorded from THMR's own 320k live stream):
//   AF  in the afternoon — ZuikakuP            104.995 BPM   (S1 神社小剧场)
//   BA  Bad Apple!! feat.nomico (2014 Refix)   138.015 BPM   (S2 → S5)
//
// v2 edit: every hit is followed by more hits, not by waiting. S1 lines are
// 4–8 beats; Bad Apple is re-cut on bar lines (BA_SEGS) so the film uses
// 16 + 4 + 10 + 8 bars of it instead of 68.
// ─────────────────────────────────────────────────────────────────────────────

export const FPS = 60;
/** Silent viewing notice; all music and scene times below stay relative to the film. */
export const WARNING_SECONDS = 2;
export const WARNING_FRAMES = WARNING_SECONDS * FPS;

export const AF = {
  id: '6399d6f7b36b6364',
  title: 'in the afternoon',
  artist: 'ZuikakuP',
  bpm: 104.995,
  beat0: 0.02, // seconds into the cut track where beat 0 falls
};
export const BA = {
  id: 'f85fdc72afd7f312',
  title: 'Bad Apple!! feat.nomico (2014 Refix)',
  artist: 'nomico · Alstroemeria Records',
  bpm: 138.015,
  beat0: 0.261,
};
export const AF_BEAT = 60 / AF.bpm;
export const BA_BEAT = 60 / BA.bpm;

/** Film second at which the radio "locks on": we tune into AF mid-intro, at its beat 20. */
export const T_LOCK = 10.9;
const AF_ENTRY = 20;
/** Film time of AF beat k. */
export const afBeat = (k: number) => T_LOCK + (k - AF_ENTRY) * AF_BEAT;
/** S1 start (AF beat 28) / S2 start = the Bad Apple drop (AF beat 80). */
export const T1 = afBeat(28);
export const T2 = afBeat(80);
/** Film time of the n-th Bad Apple bar, counted from the first drop (film bars, after re-cut). */
export const bar = (n: number) => T2 + n * 4 * BA_BEAT;
/** Film time of beat b (may be fractional) inside film bar n. */
export const bb = (n: number, b: number) => bar(n) + b * BA_BEAT;

export const T3 = bar(16); // S3 号外
export const T4 = bar(20); // S4 多端实机 (BA break)
export const T4B = bar(24); //   └ 看板娘主题
export const T5 = bar(30); // S5 高潮 (BA second drop)
export const T6 = bar(38); // S6 尾声
export const T_END = T6 + 14.1;
export const CONTENT_FRAMES = Math.ceil(T_END * FPS);
export const TOTAL_FRAMES = WARNING_FRAMES + CONTENT_FRAMES;

/** Where AF sits in the film: film second = track second + offset. */
export const AF_OFFSET = T_LOCK - (AF.beat0 + AF_ENTRY * AF_BEAT);
/** AF is cut (tape-stop) here; the riser into the BA drop takes over. */
export const T_AF_STOP = afBeat(76);

/**
 * Bad Apple re-cut. Each entry plays `bars` bars of the track starting at track
 * beat `from`, back to back in the film from T2. Splices are on bar lines:
 *   127  first drop (verse)            -> S2
 *   239  last 4 bars before the break  -> S3
 *   279  last 10 bars of the break     -> S4 (builds into…)
 *   319  second drop                   -> S5, and it keeps playing into S6
 */
export const BA_SEGS = [
  { from: 127, bars: 16 },
  { from: 239, bars: 4 },
  { from: 279, bars: 10 },
  { from: 319, bars: 8 },
];

export const SCENES = [
  { id: 's0', name: '序 · 杂讯', t0: 0, t1: T1 },
  { id: 's1', name: '神社的午后', t0: T1, t1: T2 },
  { id: 's2', name: '放送局巡礼', t0: T2, t1: T3 },
  { id: 's3', name: '号外', t0: T3, t1: T4 },
  { id: 's4', name: '多端实机', t0: T4, t1: T5 },
  { id: 's5', name: '与幻想乡同频', t0: T5, t1: T6 },
  { id: 's6', name: '尾声', t0: T6, t1: T_END },
] as const;

/** The beat grid audible at film time t (for anything that should move with the music). */
export function grid(t: number): { beat: number; t0: number; strong: number } | null {
  if (t >= T_LOCK && t < T_AF_STOP) return { beat: AF_BEAT, t0: T_LOCK, strong: 0.45 };
  if (t >= T2 && t < T6) return { beat: BA_BEAT, t0: T2, strong: 1 };
  if (t >= T6 && t < T_END - 5) return { beat: BA_BEAT, t0: T2, strong: 0.25 };
  return null;
}
/** 1 on every beat, decaying to 0 before the next (0 when no music grid). */
export function pulse(t: number, sharp = 6): number {
  const g = grid(t);
  if (!g) return 0;
  const ph = ((((t - g.t0) % g.beat) + g.beat) % g.beat) / g.beat;
  return Math.exp(-sharp * ph) * g.strong;
}
/** Same, but only on bar downbeats (every 4th beat). */
export function barPulse(t: number, sharp = 5): number {
  const g = grid(t);
  if (!g) return 0;
  const len = g.beat * 4;
  const ph = ((((t - g.t0) % len) + len) % len) / len;
  return Math.exp(-sharp * 4 * ph) * g.strong;
}

// ── Cast ─────────────────────────────────────────────────────────────────────
// color  = the character's accent in the official THMR client theme
// night  = that theme's dark page background
// blip   = "voice": base pitch (Hz) + waveform of the typewriter blip
export type CharId =
  | 'reimu' | 'marisa' | 'sanae' | 'cirno' | 'koishi' | 'satori' | 'remilia' | 'tenshi' | 'renko' | 'merry';

export const CAST: Record<CharId, { name: string; full: string; theme: string; color: string; night: string; blip: number; wave: 'tri' | 'sq' | 'sine' | 'soft' }> = {
  reimu: { name: '灵梦', full: '博丽灵梦', theme: '灵梦 · 绯红', color: '#c65a69', night: '#160d10', blip: 494, wave: 'tri' },
  marisa: { name: '魔理沙', full: '雾雨魔理沙', theme: '魔理沙 · 星尘', color: '#d9a43c', night: '#131008', blip: 587, wave: 'sq' },
  sanae: { name: '早苗', full: '东风谷早苗', theme: '早苗 · 青风', color: '#4e9e62', night: '#0a130d', blip: 659, wave: 'sine' },
  cirno: { name: '琪露诺', full: '琪露诺', theme: '琪露诺 · 冰蓝', color: '#4e9fd4', night: '#0a1216', blip: 880, wave: 'sq' },
  koishi: { name: '恋恋', full: '古明地恋', theme: '恋恋 · 紫瞳', color: '#8e6fa8', night: '#110c16', blip: 740, wave: 'soft' },
  satori: { name: '觉', full: '古明地觉', theme: '觉 · 藕荷', color: '#a86492', night: '#140c11', blip: 415, wave: 'soft' },
  remilia: { name: '蕾米莉亚', full: '蕾米莉亚·斯卡蕾特', theme: '蕾米莉亚 · 猩红', color: '#ae3548', night: '#150c0e', blip: 370, wave: 'tri' },
  tenshi: { name: '天子', full: '比那名居天子', theme: '天子 · 绀蓝', color: '#5c6bb0', night: '#0c0f18', blip: 554, wave: 'tri' },
  renko: { name: '莲子', full: '宇佐见莲子', theme: '', color: '#d7c1c8', night: '#160d10', blip: 330, wave: 'soft' },
  merry: { name: '梅莉', full: '玛艾露贝莉·赫恩', theme: '', color: '#e0b0d0', night: '#160d10', blip: 392, wave: 'soft' },
};

/** The eight 看板娘 in the order used by the roll call. */
export const MASCOTS: CharId[] = ['reimu', 'marisa', 'sanae', 'cirno', 'remilia', 'satori', 'koishi', 'tenshi'];

// ── Dialogue ─────────────────────────────────────────────────────────────────
// text markup: {…} = accent-coloured emphasis. Everything else is literal.
// style: 'vn' paper dialogue box · 'night' dark dialogue box · 'radio' boxless
//        lower-third (the two outside-world girls have no portrait).
export type Line = {
  id: string;
  who: CharId;
  text: string;
  t0: number;
  t1: number;
  style: 'vn' | 'night' | 'radio';
  /** expression file suffix: 'base' | 'alt' | <expr name> */
  expr?: string;
  /** make the box jolt (shouted lines) */
  shout?: boolean;
  /** characters per second (default 17) */
  cps?: number;
};

const L = (id: string, who: CharId, t0: number, t1: number, text: string, extra: Partial<Line> = {}): Line => ({
  id, who, t0, t1, text, style: 'vn', ...extra,
});

export const LINES: Line[] = [
  // S0 序 · 杂讯
  L('s0_renko', 'renko', 1.7, 6.0, '梅莉，快听。这个频率……{地图上不存在}。', { style: 'radio', cps: 13 }),
  L('s0_merry', 'merry', 6.3, 10.2, '……是{结界另一边}的声音呢。', { style: 'radio', cps: 12 }),
  L('s0_sanae', 'sanae', T_LOCK + 0.35, T1 - 0.15, '这里是——{东方音乐电台，THMR}！', { style: 'night', expr: 'cheer', shout: true }),

  // S1 神社的午后 (AF beats) — 52 beats
  L('s1_reimu_1', 'reimu', afBeat(28), afBeat(36), '唉……今天的赛钱箱，又是{空的}。', { expr: 'bored', cps: 14 }),
  L('s1_marisa_1', 'marisa', afBeat(36), afBeat(42), '灵梦——！大新闻 DA☆ZE！{幻想乡开电台了}！', { expr: 'laugh', shout: true, cps: 22 }),
  L('s1_reimu_2', 'reimu', afBeat(42), afBeat(46), '电台？幻想乡哪来的电波？', { expr: 'base', cps: 22 }),
  L('s1_sanae_1', 'sanae', afBeat(46), afBeat(50), '在幻想乡，可不能被{常识}束缚哦！', { expr: 'wink', cps: 22 }),
  L('s1_marisa_2', 'marisa', afBeat(50), afBeat(58), '{13 万首}东方同人曲，{24 小时}不停播，全部{免费}——DA☆ZE！', { expr: 'wink', cps: 18 }),
  L('s1_reimu_3', 'reimu', afBeat(58), afBeat(64), '免费……那、那听众，算{香火钱}吗？', { expr: 'greedy', cps: 20 }),
  L('s1_reimu_4', 'reimu', afBeat(64), afBeat(70), '等等，这些{飞过去的字}，是什么东西！？', { expr: 'surprised', shout: true, cps: 22 }),
  L('s1_marisa_3', 'marisa', afBeat(70), afBeat(76), '是{屏幕那头的听众} DA☆ZE。', { expr: 'laugh', cps: 20 }),
  L('s1_sanae_2', 'sanae', afBeat(76), afBeat(80) - 0.1, '那么——{放送开始}！', { expr: 'cheer', shout: true, cps: 14 }),

  // S2 放送局巡礼 (BA film bars 0 → 16)
  L('s2_sanae', 'sanae', bar(0) + 0.1, bar(1), '先来看看放送局的{看家本领}！', { style: 'night', expr: 'cheer', cps: 26 }),
  L('s2_remilia', 'remilia', bar(1), bar(4), '下一首放什么？呵……{命运}早已写好。', { style: 'night', expr: 'smirk', cps: 22 }),
  L('s2_marisa', 'marisa', bar(4), bar(7), '喜欢的歌？借走！{借到死为止}，DA☆ZE！', { style: 'night', expr: 'wink', cps: 22 }),
  L('s2_tenshi', 'tenshi', bar(7), bar(9.5), '{320K}——这才配得上天人的耳朵。', { style: 'night', expr: 'haughty', cps: 22 }),
  L('s2_cirno', 'cirno', bar(9.5), bar(11), '那我选 {⑨6K}！因为里面有 ⑨！', { style: 'night', expr: 'proud', shout: true, cps: 24 }),
  L('s2_satori', 'satori', bar(11), bar(14), '不喜欢这首？……我读到了。{投票切歌}吧。', { style: 'night', expr: 'gaze', cps: 22 }),
  L('s2_koishi', 'koishi', bar(14), bar(16), '嘻嘻，我一直都在哦——在你{注意不到}的地方。', { style: 'night', expr: 'shh', cps: 24 }),

  // S3 号外 (bars 16 → 20): the three numbers land on beats 4 / 6 / 8
  L('s3_sanae', 'sanae', bar(16) + 0.1, bar(20) - 0.1, '号外号外！{13 万首}曲库，{24 小时}放送，{五端}全覆盖！', { expr: 'cheer', shout: true, cps: 9 }),

  // S4 多端实机 (bars 20 → 30)
  L('s4_sanae', 'sanae', bb(22, 2.5), bar(24) - 0.05, '{想在哪听，就在哪听}！', { style: 'night', expr: 'wink', cps: 20 }),
  L('s4_reimu', 'reimu', bar(24), bar(26), '还能换{看板娘}？……那必须选我。', { style: 'night', expr: 'smug', cps: 22 }),
  L('s4_marisa', 'marisa', bar(26), bar(27), '选我 DA☆ZE！', { style: 'night', expr: 'laugh', shout: true, cps: 26 }),
  L('s4_cirno', 'cirno', bar(27), bar(28), '选{最强}的我！', { style: 'night', expr: 'proud', shout: true, cps: 26 }),

  // S5 高潮 (bars 30 → 38)
  L('s5_sanae', 'sanae', bar(34) + 0.05, bb(36, 2), '东方音乐电台 THMR——{与幻想乡，同频}！', { style: 'night', expr: 'cheer', shout: true, cps: 16 }),

  // S6 尾声
  L('s6_merry', 'merry', T6 + 1.5, T6 + 4.5, '信号……还在吗？', { style: 'radio', cps: 9 }),
  L('s6_renko', 'renko', T6 + 4.8, T6 + 7.4, '{一直都在}哦。', { style: 'radio', cps: 9 }),
  L('s6_cirno', 'cirno', T6 + 9.6, T_END - 0.5, '彩蛋一共 ⑨ 个！你、找到几个？', { style: 'night', expr: 'proud', cps: 15 }),
];

export const lineById = (id: string): Line => {
  const l = LINES.find((x) => x.id === id);
  if (!l) throw new Error(`no line ${id}`);
  return l;
};

// ── Typewriter schedule (shared by picture + blip audio) ─────────────────────
export type Glyph = { ch: string; em: boolean; t: number };

const PAUSE: Record<string, number> = {
  '，': 0.11, '、': 0.11, '。': 0.22, '！': 0.2, '？': 0.2, '…': 0.07, '—': 0.05, '～': 0.08, ' ': 0,
};
const SILENT = new Set(['，', '、', '。', '！', '？', '…', '—', '～', ' ', '☆', '·', '(', ')', '（', '）']);

/** Reveal time (seconds from line start) of every visible glyph. */
export function typeSchedule(line: Line): Glyph[] {
  const cps = line.cps ?? 17;
  const out: Glyph[] = [];
  let em = false;
  let t = 0.12;
  for (const ch of line.text) {
    if (ch === '{') { em = true; continue; }
    if (ch === '}') { em = false; continue; }
    out.push({ ch, em, t });
    // Latin letters/digits type faster so "Windows" doesn't crawl.
    t += (/[A-Za-z0-9]/.test(ch) ? 0.45 : 1) / cps + (PAUSE[ch] ?? 0);
  }
  // Never let typing run past ~70% of the line's slot.
  const budget = (line.t1 - line.t0) * 0.7;
  const end = out.length ? out[out.length - 1].t : 0;
  if (end > budget) for (const g of out) g.t = 0.12 + ((g.t - 0.12) * (budget - 0.12)) / (end - 0.12);
  return out;
}

/** Blip times (film seconds) for a line: every other voiced glyph. */
export function blipTimes(line: Line): { t: number; i: number; rise: boolean }[] {
  const g = typeSchedule(line);
  const res: { t: number; i: number; rise: boolean }[] = [];
  let voiced = 0;
  const question = /？/.test(line.text);
  for (let i = 0; i < g.length; i++) {
    if (SILENT.has(g[i].ch)) continue;
    if (voiced % 2 === 0) res.push({ t: line.t0 + g[i].t, i, rise: question && i > g.length * 0.6 });
    voiced++;
  }
  return res;
}

// ── Sound effect cues (film seconds). Names are synthesised in tools/synth.mjs ─
export type Cue = { t: number; sfx: string; gain?: number; pan?: number; dur?: number };

const lt = (id: string) => lineById(id).t0;
const B = AF_BEAT;

// Shared action beats (picture + sound read the same numbers) ─────────────────
/** S1: the three selling points slam in on consecutive off-beats. */
export const STAT_HITS = [1, 3, 5].map((k) => lt('s1_marisa_2') + k * B);
/** S2 feature segments, in film bars. */
export const TOUR = {
  remilia: { a: bar(1), b: bar(4) },
  marisa: { a: bar(4), b: bar(7) },
  tenshi: { a: bar(7), b: bar(11) }, // Cirno crashes in at bar 9.5
  satori: { a: bar(11), b: bar(14) },
  koishi: { a: bar(14), b: bar(16) },
};
export const T_CIRNO = bar(9.5);
/** S3: the three headline numbers. */
export const NEWS_HITS = [bb(16, 4), bb(16, 6), bb(16, 8)];
export const NEWS_CHIPS = [0, 1, 2, 3, 4].map((i) => bb(16, 10 + i * 0.5));
/** S4A: one platform every two beats, then the camera pulls back to all five. */
export const PLATFORMS = ['Android', 'Windows', 'macOS', 'Linux', '网页版'] as const;
export const PLATFORM_HITS = PLATFORMS.map((_, i) => bb(20, i * 2));
export const T_ALL5 = bb(20, 10);
/** S4B theme roulette (bars 28 → ~29.5): accelerating switches. */
export const ROULETTE: number[] = (() => {
  const out: number[] = [];
  let t = bar(28);
  let step = BA_BEAT / 2;
  while (t < bar(30) - BA_BEAT * 2.2) {
    out.push(t);
    t += step;
    step = Math.max(BA_BEAT / 4, step * 0.9);
  }
  return out;
})();
/** S5: roll call — one mascot per beat; then the six title glyphs, one per beat. */
export const ROLLCALL: number[] = Array.from({ length: 8 }, (_, i) => bb(30, i));
export const TITLE_HITS: number[] = Array.from({ length: 6 }, (_, i) => bb(32, i));
export const T_WALL = bar(34);
export const T_CTA = bb(35, 2);

const RAW_CUES: Cue[] = [
  // S0
  { t: 0.6, sfx: 'dial_click', gain: 0.7 },
  { t: 1.2, sfx: 'tune_sweep', gain: 0.6 },
  { t: 4.2, sfx: 'tune_sweep', gain: 0.5 },
  { t: 6.9, sfx: 'tune_sweep', gain: 0.6 },
  { t: 9.3, sfx: 'tune_sweep', gain: 0.75 },
  { t: T_LOCK - 0.55, sfx: 'riser_short', gain: 0.6 },
  { t: T_LOCK, sfx: 'lock', gain: 0.9 },
  { t: T_LOCK + 0.05, sfx: 'jingle', gain: 0.8 },
  { t: T1 - 0.45, sfx: 'whoosh', gain: 0.6 },
  // S1
  { t: lt('s1_reimu_1') + 0.3, sfx: 'sigh', gain: 0.6, pan: -0.3 },
  { t: lt('s1_reimu_1') + 3 * B, sfx: 'pop', gain: 0.5, pan: 0.4 },
  { t: lt('s1_reimu_1') + 4 * B, sfx: 'boing_sad', gain: 0.5, pan: 0.4 },
  { t: lt('s1_marisa_1') - 0.12, sfx: 'whoosh', gain: 0.85, pan: 0.5 },
  { t: lt('s1_marisa_1') + 0.08, sfx: 'impact', gain: 0.7, pan: 0.4 },
  { t: lt('s1_marisa_1') + B, sfx: 'exclaim', gain: 0.55, pan: -0.4 },
  { t: lt('s1_reimu_2') + 0.1, sfx: 'question', gain: 0.6, pan: -0.4 },
  { t: lt('s1_sanae_1') - 0.05, sfx: 'pop', gain: 0.7 },
  { t: lt('s1_sanae_1') + 0.15, sfx: 'sparkle', gain: 0.55 },
  { t: lt('s1_sanae_1') + 2 * B, sfx: 'stamp', gain: 0.7 },
  ...STAT_HITS.map((t, i) => ({ t, sfx: 'stamp', gain: 0.7 + i * 0.06, pan: -0.2 })),
  { t: STAT_HITS[2] + 0.12, sfx: 'sparkle', gain: 0.5 },
  { t: lt('s1_reimu_3') + 0.15, sfx: 'shine', gain: 0.6, pan: -0.4 },
  { t: lt('s1_reimu_3') + 2 * B, sfx: 'coins', gain: 0.7 },
  { t: lt('s1_reimu_4') + 0.05, sfx: 'exclaim', gain: 0.7, pan: -0.4 },
  { t: lt('s1_marisa_3') - 0.05, sfx: 'whoosh_down', gain: 0.6 },
  { t: lt('s1_marisa_3') + 0.12, sfx: 'pop', gain: 0.6 },
  { t: T_AF_STOP + 0.05, sfx: 'onair_click', gain: 0.8 },
  { t: T_AF_STOP + 0.2, sfx: 'riser', gain: 0.8, dur: T2 - T_AF_STOP - 0.25 },
  { t: T2, sfx: 'boom', gain: 0.9 },
  // S2 — Remilia · queue
  { t: TOUR.remilia.a - 0.1, sfx: 'whoosh', gain: 0.6, pan: -0.4 },
  ...[1, 2, 3, 4].map((k) => ({ t: TOUR.remilia.a + k * BA_BEAT, sfx: 'tick', gain: 0.5, pan: 0.3 })),
  { t: TOUR.remilia.a + 6 * BA_BEAT, sfx: 'chime', gain: 0.5, pan: 0.3 },
  { t: TOUR.remilia.a + 8 * BA_BEAT, sfx: 'slide', gain: 0.6, pan: 0.3 },
  { t: TOUR.remilia.a + 9 * BA_BEAT, sfx: 'tick', gain: 0.5, pan: 0.3 },
  // Marisa · favourites
  { t: TOUR.marisa.a - 0.1, sfx: 'whoosh', gain: 0.6, pan: 0.4 },
  { t: TOUR.marisa.a + 3 * BA_BEAT, sfx: 'click', gain: 0.7, pan: -0.3 },
  { t: TOUR.marisa.a + 3 * BA_BEAT + 0.06, sfx: 'sparkle', gain: 0.6, pan: -0.3 },
  { t: TOUR.marisa.a + 5 * BA_BEAT, sfx: 'pop', gain: 0.6, pan: -0.2 },
  { t: TOUR.marisa.a + 7 * BA_BEAT, sfx: 'click', gain: 0.6, pan: 0.1 },
  { t: TOUR.marisa.a + 8 * BA_BEAT, sfx: 'click', gain: 0.6, pan: 0.2 },
  { t: TOUR.marisa.a + 8 * BA_BEAT + 0.05, sfx: 'chime', gain: 0.45, pan: 0.2 },
  // Tenshi · quality, then ⑨
  { t: TOUR.tenshi.a - 0.1, sfx: 'whoosh', gain: 0.6, pan: -0.4 },
  { t: TOUR.tenshi.a + 2 * BA_BEAT, sfx: 'click', gain: 0.6, pan: 0.3 },
  { t: TOUR.tenshi.a + 2 * BA_BEAT + 0.05, sfx: 'shine', gain: 0.6, pan: 0.3 },
  { t: TOUR.tenshi.a + 6 * BA_BEAT, sfx: 'sparkle', gain: 0.4, pan: 0.3 },
  { t: T_CIRNO - 0.05, sfx: 'pop', gain: 0.8 },
  { t: T_CIRNO + 2 * BA_BEAT, sfx: 'click', gain: 0.6 },
  { t: T_CIRNO + 2 * BA_BEAT + 0.05, sfx: 'bitcrush_blip', gain: 0.7 },
  { t: T_CIRNO + 4 * BA_BEAT, sfx: 'stamp', gain: 0.8 },
  // Satori · vote
  { t: TOUR.satori.a - 0.1, sfx: 'whoosh', gain: 0.6, pan: 0.4 },
  { t: TOUR.satori.a + 2 * BA_BEAT, sfx: 'vote', gain: 0.6, pan: -0.3 },
  { t: TOUR.satori.a + 3 * BA_BEAT, sfx: 'vote', gain: 0.65, pan: -0.3 },
  { t: TOUR.satori.a + 4 * BA_BEAT, sfx: 'vote', gain: 0.7, pan: -0.3 },
  { t: TOUR.satori.a + 5 * BA_BEAT, sfx: 'skip', gain: 0.7, pan: -0.3 },
  { t: TOUR.satori.a + 8 * BA_BEAT, sfx: 'tick', gain: 0.5, pan: -0.3 },
  // Koishi · mini player
  { t: TOUR.koishi.a - 0.1, sfx: 'whoosh_soft', gain: 0.6, pan: -0.4 },
  { t: TOUR.koishi.a + 2 * BA_BEAT, sfx: 'slide', gain: 0.5, pan: 0.5 },
  { t: TOUR.koishi.a + 5 * BA_BEAT, sfx: 'slide', gain: 0.5, pan: 0.5 },
  { t: TOUR.koishi.a + 6 * BA_BEAT, sfx: 'giggle', gain: 0.55, pan: -0.3 },
  // S3 号外
  { t: T3 - 0.22, sfx: 'paper_spin', gain: 0.8 },
  { t: T3 + 0.02, sfx: 'impact', gain: 0.7 },
  { t: bb(16, 1), sfx: 'stamp', gain: 0.8 },
  ...NEWS_HITS.map((t, i) => ({ t, sfx: 'stamp', gain: 0.8 + i * 0.07 })),
  { t: NEWS_HITS[0] + 0.05, sfx: 'counter', gain: 0.45 },
  ...NEWS_CHIPS.map((t, i) => ({ t, sfx: 'tick', gain: 0.5, pan: -0.4 + i * 0.2 })),
  { t: bb(16, 10) - 0.05, sfx: 'whoosh_soft', gain: 0.6 },
  { t: T4 - 0.3, sfx: 'whoosh', gain: 0.7 },
  // S4A — whip-pan across the five platforms
  ...PLATFORM_HITS.flatMap((t, i) => [
    { t: t - 0.13, sfx: 'whoosh', gain: i === 0 ? 0 : 0.7, pan: 0.5 },
    { t, sfx: 'slam', gain: 0.65, pan: -0.2 },
  ]),
  { t: T_ALL5 - 0.15, sfx: 'whoosh_down', gain: 0.7 },
  { t: T_ALL5 + 0.02, sfx: 'shine', gain: 0.6 },
  ...[12, 13, 14, 15].map((k, i) => ({ t: bb(20, k), sfx: 'pop', gain: 0.45, pan: -0.5 + i * 0.33 })),
  // S4B — mascot themes
  { t: T4B - 0.1, sfx: 'whoosh', gain: 0.6 },
  { t: bb(24, 3), sfx: 'theme_switch', gain: 0.6 },
  { t: bar(26) - 0.06, sfx: 'whoosh', gain: 0.7, pan: 0.5 },
  { t: bar(26) + 0.03, sfx: 'theme_switch', gain: 0.65 },
  { t: bar(27) - 0.06, sfx: 'pop', gain: 0.8 },
  { t: bar(27) + 0.03, sfx: 'theme_switch', gain: 0.65 },
  { t: bar(28), sfx: 'riser', gain: 0.85, dur: bar(30) - bar(28) - 0.05 },
  ...ROULETTE.map((t) => ({ t, sfx: 'tick', gain: 0.5 })),
  // S5
  { t: T5, sfx: 'boom', gain: 1 },
  ...ROLLCALL.slice(1).map((t) => ({ t, sfx: 'slam', gain: 0.55 })),
  { t: TITLE_HITS[0], sfx: 'boom', gain: 0.9 },
  ...TITLE_HITS.slice(1).map((t) => ({ t, sfx: 'slam', gain: 0.5 })),
  { t: TITLE_HITS[5] + 0.02, sfx: 'shine', gain: 0.7 },
  { t: T_WALL, sfx: 'impact', gain: 0.7 },
  { t: T_CTA, sfx: 'stamp', gain: 0.8 },
  { t: T_CTA + 0.05, sfx: 'sparkle', gain: 0.5 },
  { t: T6 - 0.5, sfx: 'whoosh_down', gain: 0.8 },
  // S6
  { t: T6, sfx: 'lock', gain: 0.5 },
  { t: T6 + 8.0, sfx: 'chime', gain: 0.6 },
  { t: T6 + 9.5, sfx: 'pop', gain: 0.6, pan: 0.5 },
];
export const CUES: Cue[] = RAW_CUES.filter((c) => (c.gain ?? 1) > 0);

// ── Danmaku (弹幕) ───────────────────────────────────────────────────────────
// t = film second the comment enters at the right edge; row = lane; hue index.
export const DANMAKU_TEXT = [
  '来了来了', '前排', '灵梦又在哭穷', '赛钱箱：我是空的', 'DA☆ZE', '红白贫乏', '13万首？！', '免费万岁',
  '这就是幻想乡吗', '车万人集合', '笨蛋！', '常识是什么', '信仰充值中', '香火钱+1', '好听', '已收藏',
  '电台冲冲冲', '幻想乡放送局', '24小时不停', '早苗好耶', '魔理沙别偷了', '泪目', '开播了开播了',
  '这里是东方音乐电台', '在听了在听了', '同人曲天堂', '是谁在看我', '弹幕护体', '香火钱到账',
];
export const DANMAKU_CLIMAX = [
  '与幻想乡同频', '同频！', '同频了同频了', 'Bad Apple!!', 'DNA 动了', '车万不死', '泪目', '全体起立',
  '东方音乐电台', 'THMR', '320K 党狂喜', '这就是幻想乡', '开播了开播了', '在听了', '好耶', '信仰！',
  '看板娘我全都要', '投票切歌笑死', '恋恋在哪', '天子大人', '二小姐！', '同频', '同频！！', '幻想乡放送局',
];

// ── Hidden ⑨ easter eggs: exactly nine <Egg n={…}/> are placed in the picture ─
export const EGG_COUNT = 9;
