import React from "react";
import { hash } from "../lib/anim";
import { DANMAKU_FONT, theme } from "../theme";

export type Shot = { text: React.ReactNode; len: number; t: number; lane: number; color: string; size: number; speed: number };

/**
 * Deterministic danmaku generator: comments enter at the right edge between
 * t0 and t1, `rate(t)` comments per second, spread over `lanes` rows.
 */
export function makeDanmaku(opts: {
  texts: string[]; t0: number; t1: number; rate: (t: number) => number; lanes: number; seed?: number; size?: number; colorful?: number;
}): Shot[] {
  const { texts, t0, t1, rate, lanes, seed = 1, size = 44, colorful = 0.3 } = opts;
  const out: Shot[] = [];
  const laneFree = new Array(lanes).fill(-1);
  let t = t0;
  let i = 0;
  while (t < t1) {
    const r = Math.max(0.2, rate(t));
    t += (0.55 + hash(seed * 31 + i) * 0.9) / r;
    const text = texts[Math.floor(hash(seed * 17 + i * 3) * texts.length)];
    const speed = 380 + text.length * 16 + hash(seed + i * 7) * 90;
    // first lane that has cleared enough room, starting from a random one
    let lane = Math.floor(hash(seed * 5 + i * 11) * lanes);
    for (let k = 0; k < lanes; k++) {
      const c = (lane + k) % lanes;
      if (laneFree[c] <= t) { lane = c; break; }
    }
    laneFree[lane] = t + (text.length * size * 0.95 + 90) / speed;
    const color = hash(seed * 13 + i * 5) < colorful ? theme.danmakuColors[1 + Math.floor(hash(seed + i * 19) * 5)] : "#ffffff";
    out.push({ text, len: text.length, t, lane, color, size, speed });
    i++;
  }
  return out;
}

/** Scrolling comments, classic white-with-black-outline style. */
export const Danmaku: React.FC<{ shots: Shot[]; t: number; top?: number; laneH?: number; width?: number; opacity?: number }> = ({
  shots, t, top = 26, laneH = 58, width = 1920, opacity = 1,
}) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", opacity }}>
    {shots.map((s, i) => {
      const age = t - s.t;
      if (age < 0) return null;
      const x = width - age * s.speed;
      const w = s.len * s.size * 1.02 + 20;
      if (x < -w) return null;
      return (
        <div
          key={i}
          style={{
            position: "absolute", left: 0, top: top + s.lane * laneH, transform: `translateX(${x}px)`, whiteSpace: "nowrap",
            fontFamily: DANMAKU_FONT, fontWeight: 700, fontSize: s.size, color: s.color, lineHeight: 1,
            textShadow: "2px 0 0 #000, -2px 0 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
            opacity: 0.93,
          }}
        >
          {s.text}
        </div>
      );
    })}
  </div>
);
