// Procedural sound effects for the promo. Everything is synthesised from
// oscillators + filtered noise, so there are no third-party samples to license.
// All generators return mono Float32Array at SR.
export const SR = 48000;

// deterministic RNG so every build of the soundtrack is identical
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** RBJ biquad, coefficients may be re-computed per block for sweeps. */
export class Biquad {
  constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set('lp', 1000, 0.707); }
  set(type, f, q) {
    const w = (TAU * Math.min(f, SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; } // bp (constant peak)
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * c) / a0; this.a2 = (1 - al) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

/** Filter a whole buffer; f may be a function of normalised time for sweeps. */
export function filt(x, type, f, q = 0.707) {
  const bq = new Biquad();
  const out = new Float32Array(x.length);
  const sweep = typeof f === 'function';
  if (!sweep) bq.set(type, f, q);
  for (let i = 0; i < x.length; i++) {
    if (sweep && i % 32 === 0) bq.set(type, f(i / x.length), q);
    out[i] = bq.run(x[i]);
  }
  return out;
}

function noise(sec, r) {
  const o = buf(sec);
  for (let i = 0; i < o.length; i++) o[i] = r() * 2 - 1;
  return o;
}

/** Oscillator with per-sample frequency function f(u) (u = 0..1) and amplitude a(u). */
function osc(sec, wave, f, a) {
  const o = buf(sec);
  let ph = 0;
  for (let i = 0; i < o.length; i++) {
    const u = i / o.length;
    ph += (typeof f === 'function' ? f(u) : f) / SR;
    const p = ph % 1;
    let v;
    if (wave === 'sine') v = Math.sin(TAU * p);
    else if (wave === 'tri') v = 4 * Math.abs(p - 0.5) - 1;
    else if (wave === 'sq') v = p < 0.5 ? 0.6 : -0.6;
    else v = Math.sin(TAU * p) * 0.8 + Math.sin(TAU * 2 * p) * 0.2; // soft
    o[i] = v * (typeof a === 'function' ? a(u) : a);
  }
  return o;
}

function mixInto(dst, src, at = 0, g = 1) {
  const o = Math.round(at * SR);
  for (let i = 0; i < src.length && o + i < dst.length; i++) dst[o + i] += src[i] * g;
  return dst;
}
const apply = (x, a) => { for (let i = 0; i < x.length; i++) x[i] *= a(i / x.length); return x; };
const expd = (k) => (u) => Math.exp(-k * u);
const hann = (u) => 0.5 - 0.5 * Math.cos(TAU * u);
const edge = (u, a = 0.02, b = 0.1) => clamp01(u / a) * clamp01((1 - u) / b);

/** FM bell-ish ping. */
function bell(freq, sec, bright = 2.0) {
  const o = buf(sec);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR, u = i / o.length;
    const m = Math.sin(TAU * freq * 2.76 * t) * bright * Math.exp(-9 * u);
    o[i] = Math.sin(TAU * freq * t + m) * Math.exp(-5.5 * u) * clamp01(u / 0.004);
  }
  return o;
}

// ── the "voice": per-character typewriter blip ───────────────────────────────
export function blip(freq, wave, { soft = false } = {}) {
  const sec = soft ? 0.085 : 0.06;
  const o = osc(sec, wave === 'soft' ? 'soft' : wave, (u) => freq * (1 + 0.04 * (1 - u)), (u) => Math.exp(-(soft ? 4 : 5.5) * u) * clamp01(u / 0.03));
  return wave === 'sq' ? filt(o, 'lp', 3800) : o;
}

// ── named effects ────────────────────────────────────────────────────────────
export const SFX = {
  dial_click(r) {
    const o = buf(0.09);
    mixInto(o, apply(filt(noise(0.012, r), 'bp', 2400, 1.2), expd(4)), 0, 1.4);
    mixInto(o, osc(0.07, 'sine', (u) => 170 - 60 * u, expd(6)), 0.002, 0.8);
    return o;
  },
  tune_sweep(r) {
    // heterodyne whistle wandering across the band + a crackle of band noise
    const sec = 0.85;
    const f0 = 2600 + r() * 1200, f1 = 240 + r() * 200, f2 = 1300 + r() * 900;
    const w = osc(sec, 'sine', (u) => (u < 0.55 ? f0 * Math.pow(f1 / f0, u / 0.55) : f1 * Math.pow(f2 / f1, (u - 0.55) / 0.45)), (u) => hann(u) * (0.75 + 0.25 * Math.sin(TAU * 31 * u)));
    const n = apply(filt(noise(sec, r), 'bp', (u) => 700 + 2600 * hann(u), 2.5), (u) => hann(u) * 0.8);
    return mixInto(mixInto(buf(sec), w, 0, 0.32), n, 0, 0.9);
  },
  riser(r, dur = 2) {
    const n = apply(filt(noise(dur, r), 'bp', (u) => 260 * Math.pow(34, u), 1.6), (u) => Math.pow(u, 2.2) * edge(u, 0.02, 0.015));
    const s = osc(dur, 'tri', (u) => 180 * Math.pow(9, u * u), (u) => Math.pow(u, 2) * (0.6 + 0.4 * Math.sin(TAU * (3 + 22 * u) * u * dur)) * edge(u, 0.02, 0.015));
    return mixInto(mixInto(buf(dur), n, 0, 1.0), s, 0, 0.22);
  },
  riser_short(r) { return SFX.riser(r, 0.52); },
  lock() {
    const o = buf(0.3);
    mixInto(o, osc(0.11, 'sine', (u) => 420 * Math.pow(3.2, u), (u) => edge(u, 0.05, 0.3)), 0, 0.7);
    mixInto(o, bell(1568, 0.28, 1.2), 0.07, 0.5);
    return o;
  },
  jingle() {
    // soft open-fifth shimmer: sits above the music without asserting a key
    const o = buf(1.5);
    [1318.5, 1975.5, 2637, 3951].forEach((f, i) => mixInto(o, bell(f, 1.2 - i * 0.12, 1.0), i * 0.085, 0.3 - i * 0.04));
    return o;
  },
  whoosh(r) {
    return apply(filt(noise(0.38, r), 'bp', (u) => 380 + 3000 * hann(Math.pow(u, 0.8)), 1.1), (u) => hann(u));
  },
  whoosh_down(r) {
    return apply(filt(noise(0.55, r), 'bp', (u) => 4200 * Math.pow(0.07, u), 1.2), (u) => hann(Math.pow(u, 0.6)));
  },
  whoosh_soft(r) {
    const x = apply(filt(noise(0.6, r), 'bp', (u) => 500 + 1300 * hann(u), 0.9), (u) => hann(u));
    for (let i = 0; i < x.length; i++) x[i] *= 0.7;
    return x;
  },
  sigh(r) {
    return apply(filt(noise(0.75, r), 'bp', (u) => 1500 - 900 * u, 1.4), (u) => Math.pow(1 - u, 1.5) * clamp01(u / 0.12) * 0.9);
  },
  pop() {
    return osc(0.08, 'sine', (u) => 950 * Math.pow(0.3, u), (u) => Math.exp(-4 * u) * clamp01(u / 0.02));
  },
  boing_sad() {
    const o = buf(0.75);
    mixInto(o, osc(0.3, 'tri', (u) => 311 * (1 - 0.03 * u), (u) => edge(u, 0.05, 0.4) * (0.8 + 0.2 * Math.sin(TAU * 6 * u))), 0, 0.6);
    mixInto(o, osc(0.42, 'tri', (u) => 233 * (1 - 0.1 * u * u), (u) => edge(u, 0.05, 0.6) * (0.8 + 0.2 * Math.sin(TAU * 7 * u))), 0.3, 0.6);
    return filt(o, 'lp', 1800);
  },
  impact(r) {
    const o = buf(0.4);
    mixInto(o, osc(0.32, 'sine', (u) => 95 * Math.pow(0.45, u), expd(4.5)), 0, 1.0);
    mixInto(o, apply(filt(noise(0.18, r), 'lp', 1400), expd(7)), 0, 0.55);
    return o;
  },
  slam(r) {
    const o = buf(0.22);
    mixInto(o, osc(0.16, 'sine', (u) => 150 * Math.pow(0.4, u), expd(5)), 0, 0.9);
    mixInto(o, apply(filt(noise(0.06, r), 'bp', 1800, 0.8), expd(6)), 0, 0.5);
    return o;
  },
  boom(r) {
    const o = buf(1.5);
    mixInto(o, osc(0.9, 'sine', (u) => 72 * Math.pow(0.48, u), expd(4)), 0, 1.1);
    mixInto(o, apply(filt(noise(1.4, r), 'hp', 2200), (u) => Math.exp(-5.5 * u) * clamp01(u / 0.004)), 0, 0.42);
    mixInto(o, apply(filt(noise(0.25, r), 'lp', 900), expd(6)), 0, 0.6);
    return o;
  },
  exclaim() {
    const o = buf(0.2);
    mixInto(o, filt(osc(0.07, 'sq', 880, (u) => edge(u, 0.05, 0.3)), 'lp', 4200), 0, 0.5);
    mixInto(o, filt(osc(0.11, 'sq', 1318.5, (u) => edge(u, 0.05, 0.6)), 'lp', 4800), 0.075, 0.5);
    return o;
  },
  question() {
    return osc(0.24, 'sine', (u) => 520 * Math.pow(1.8, u * u) * (1 + 0.015 * Math.sin(TAU * 9 * u)), (u) => edge(u, 0.08, 0.35) * 0.8);
  },
  sparkle(r) {
    const o = buf(0.75);
    const scale = [2093, 2349, 2637, 3136, 3520, 4186, 4699, 5274];
    for (let i = 0; i < 9; i++) mixInto(o, bell(scale[Math.floor(r() * scale.length)], 0.22 + r() * 0.15, 0.6), i * 0.045 + r() * 0.02, 0.22);
    return o;
  },
  shine() {
    const o = buf(0.9);
    mixInto(o, bell(1760, 0.85, 1.6), 0, 0.5);
    mixInto(o, osc(0.3, 'sine', (u) => 2200 * Math.pow(2.2, u), (u) => edge(u, 0.1, 0.7) * 0.25), 0.01, 1);
    return o;
  },
  stamp(r) {
    const o = buf(0.2);
    mixInto(o, osc(0.14, 'sine', (u) => 125 * Math.pow(0.5, u), expd(5)), 0, 1.0);
    mixInto(o, apply(filt(noise(0.05, r), 'bp', 1500, 0.9), expd(5)), 0, 0.7);
    return o;
  },
  coins(r) {
    const o = buf(1.3);
    for (let i = 0; i < 7; i++) {
      const f = 2300 + r() * 1500;
      const t = i * 0.12 + r() * 0.06;
      mixInto(o, bell(f, 0.3, 0.9), t, 0.3);
      mixInto(o, bell(f * 1.52, 0.2, 0.5), t + 0.004, 0.16);
    }
    return o;
  },
  onair_click(r) {
    const o = buf(0.18);
    mixInto(o, apply(filt(noise(0.03, r), 'bp', 1900, 0.8), expd(5)), 0, 1.2);
    mixInto(o, osc(0.12, 'sine', (u) => 210 - 90 * u, expd(6)), 0.004, 0.8);
    return o;
  },
  tick() {
    return osc(0.035, 'sine', 1250, (u) => Math.exp(-5 * u) * clamp01(u / 0.05));
  },
  click(r) {
    const o = buf(0.07);
    mixInto(o, apply(filt(noise(0.01, r), 'bp', 3200, 1), expd(4)), 0, 1.0);
    mixInto(o, apply(filt(noise(0.012, r), 'bp', 2100, 1), expd(4)), 0.04, 0.7);
    return o;
  },
  chime() {
    const o = buf(1.1);
    mixInto(o, bell(1046.5, 0.9, 1.2), 0, 0.45);
    mixInto(o, bell(1568, 0.9, 1.2), 0.11, 0.4);
    return o;
  },
  bitcrush_blip() {
    const o = buf(0.3);
    [440, 660, 880, 1320].forEach((f, i) => mixInto(o, osc(0.065, 'sq', f, (u) => edge(u, 0.05, 0.2)), i * 0.065, 0.55));
    // crush to ~9 kHz / 4 bits — a deliberately ⑨-grade sound
    let hold = 0;
    for (let i = 0; i < o.length; i++) { if (i % 5 === 0) hold = Math.round(o[i] * 8) / 8; o[i] = hold; }
    return o;
  },
  vote() {
    const o = buf(0.22);
    mixInto(o, bell(784, 0.2, 0.7), 0, 0.6);
    mixInto(o, osc(0.05, 'sine', 1568, expd(5)), 0, 0.2);
    return o;
  },
  skip(r) {
    const o = buf(0.55);
    [784, 988, 1175, 1568].forEach((f, i) => mixInto(o, bell(f, 0.25, 0.8), i * 0.055, 0.42));
    mixInto(o, SFX.whoosh(r), 0.12, 0.5);
    return o;
  },
  slide(r) {
    return apply(filt(noise(0.26, r), 'bp', (u) => 900 + 900 * u, 1.5), (u) => hann(u) * 0.8);
  },
  giggle() {
    const o = buf(0.5);
    [1175, 1397, 1175, 1568].forEach((f, i) => mixInto(o, osc(0.07, 'soft', (u) => f * (1 + 0.06 * u), (u) => edge(u, 0.15, 0.5)), i * 0.1, 0.45));
    return o;
  },
  paper_spin(r) {
    const sec = 0.55;
    return apply(filt(noise(sec, r), 'bp', 2600, 0.7), (u) => (0.5 + 0.5 * Math.sin(TAU * (6 + 26 * u) * u * sec)) * edge(u, 0.05, 0.1) * (0.4 + 0.6 * u));
  },
  counter() {
    const o = buf(1.0);
    for (let i = 0; i < 22; i++) mixInto(o, osc(0.02, 'sine', 1500 + i * 28, expd(4)), 0.9 * Math.pow(i / 22, 0.75), 0.5);
    return o;
  },
  theme_switch() {
    const o = buf(0.5);
    mixInto(o, osc(0.13, 'sine', (u) => 620 * Math.pow(2, u), (u) => edge(u, 0.08, 0.4) * 0.6), 0, 1);
    mixInto(o, bell(1975.5, 0.4, 0.8), 0.09, 0.32);
    return o;
  },
};

/** Continuous radio static. level(t) is the envelope in film seconds. */
export function staticNoise(sec, level, r) {
  const hiss = filt(filt(noise(sec, r), 'hp', 900), 'lp', 6500);
  const crackle = buf(sec);
  for (let i = 0; i < crackle.length; i++) if (r() < 0.00045) crackle[i] = (r() * 2 - 1) * 2.2;
  const cr = filt(crackle, 'bp', 2200, 0.7);
  const o = buf(sec);
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    const flutter = 0.82 + 0.18 * Math.sin(TAU * 0.9 * t + 2 * Math.sin(TAU * 0.31 * t));
    o[i] = (hiss[i] * 0.5 * flutter + cr[i] * 0.9) * level(t);
  }
  return o;
}
