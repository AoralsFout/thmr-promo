import React, { createContext, useContext } from "react";

/** Absolute film time in seconds, provided once at the composition root. */
export const TimeCtx = createContext(0);
export const useT = () => useContext(TimeCtx);

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** 0→1 progress of t through [t0, t0 + dur]. */
export const prog = (t: number, t0: number, dur: number) => clamp((t - t0) / dur);

export const easeOut = (u: number) => 1 - Math.pow(1 - u, 3);
export const easeOut5 = (u: number) => 1 - Math.pow(1 - u, 5);
export const easeIn = (u: number) => u * u * u;
export const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const backOut = (u: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
};
export const elasticOut = (u: number) =>
  u === 0 || u === 1 ? u : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

/** Deterministic hash → [0,1). */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** "Slam": overshooting scale that settles to 1 (big → 1). */
export const slam = (u: number, from = 2.4) => lerp(from, 1, easeOut5(u));

/** Fade in over `a` seconds from t0 and out over `b` seconds before t1. */
export const inOut = (t: number, t0: number, t1: number, a = 0.2, b = 0.2) =>
  Math.min(prog(t, t0, a), 1 - prog(t, t1 - b, b));

/** Decaying pulse on every beat (1 at the beat → 0). */
export const beatPulse = (t: number, t0: number, beat: number, sharp = 7) => {
  if (t < t0) return 0;
  const ph = ((t - t0) % beat) / beat;
  return Math.exp(-sharp * ph);
};

export const px = (n: number) => `${n}px`;
export type Style = React.CSSProperties;
