// Everything that moves with the music: camera, beat pump, spectrum strip.
import React from "react";
import { AbsoluteFill } from "remotion";
import { AF, BA, barPulse, grid, pulse, T2 } from "../timeline";
import { clamp, easeOut5, hash, lerp, prog } from "../lib/anim";
import { SERIF, theme } from "../theme";

/** Camera key: at time `t` start moving to focus (x, y) with zoom z (stage px, 1920×1080 stage). */
export type CamKey = { t: number; x: number; y: number; z: number; dur?: number; rot?: number };
export type CamState = { x: number; y: number; z: number; rot: number };

/** Chain of eased moves between camera keys (each move finishes before the next begins). */
export function camAt(t: number, keys: CamKey[]): CamState {
  let s: CamState = { x: keys[0].x, y: keys[0].y, z: keys[0].z, rot: keys[0].rot ?? 0 };
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t < k.t) break;
    const e = easeOut5(prog(t, k.t, k.dur ?? 0.45));
    s = { x: lerp(s.x, k.x, e), y: lerp(s.y, k.y, e), z: lerp(s.z, k.z, e), rot: lerp(s.rot, k.rot ?? 0, e) };
  }
  return s;
}

/** Sum of decaying "punches" at the given times (for zoom bumps on hits). */
export const punch = (t: number, hits: number[], sharp = 9) => hits.reduce((a, h) => a + (t >= h ? Math.exp(-(t - h) * sharp) : 0), 0);

/** Decaying random shake offset (px) after each hit. */
export function shake(t: number, hits: number[], amp = 16, sharp = 9): [number, number] {
  const a = punch(t, hits, sharp) * amp;
  const f = Math.floor(t * 60);
  return [(hash(f) - 0.5) * 2 * a, (hash(f + 77) - 0.5) * 2 * a];
}

/** Applies a camera to its children. Children are laid out in 1920×1080 stage coordinates. */
export const Cam: React.FC<{ cam: CamState; extraZ?: number; dx?: number; dy?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ cam, extraZ = 0, dx = 0, dy = 0, children, style }) => {
  const z = cam.z + extraZ;
  return (
    <div
      style={{
        position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0",
        transform: `translate(${960 - cam.x * z + dx}px, ${540 - cam.y * z + dy}px) scale(${z}) rotate(${cam.rot}deg)`, ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Whole-frame zoom pump on every beat (stronger on bar downbeats). */
export const Pump: React.FC<{ t: number; amount?: number; children: React.ReactNode }> = ({ t, amount = 1, children }) => (
  <AbsoluteFill style={{ transform: `scale(${1 + amount * (0.009 * pulse(t, 7) + 0.011 * barPulse(t, 4))})`, transformOrigin: "50% 50%" }}>{children}</AbsoluteFill>
);

/** A head-nod offset in px: dips on the beat and eases back up. */
export const nod = (t: number, px = 8) => px * pulse(t, 4.5);

/**
 * Spectrum strip along the bottom edge + accent glow on bar downbeats + BPM tag.
 * Purely decorative, but it is driven by the real beat grid of whatever track
 * is playing, so the whole frame "breathes" with the station.
 */
export const BeatStrip: React.FC<{ t: number; color?: string }> = ({ t, color = theme.accent }) => {
  const g = grid(t);
  if (!g) return null;
  const p = pulse(t, 4);
  const bp = barPulse(t, 3.5);
  const N = 128;
  const bpm = t >= T2 ? BA.bpm : AF.bpm;
  const alpha = clamp(g.strong * 1.6);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* bar-downbeat edge glow */}
      <AbsoluteFill style={{ boxShadow: `inset 0 0 ${90 + 110 * bp}px ${color}`, opacity: 0.28 * bp }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44, display: "flex", alignItems: "flex-end", gap: 3, padding: "0 4px", opacity: 0.85 * alpha }}>
        {Array.from({ length: N }, (_, i) => {
          const u = i / (N - 1);
          const centre = 1 - Math.abs(u - 0.5) * 1.5; // taller in the middle
          const wob = 0.5 + 0.5 * Math.sin(t * (5 + hash(i) * 7) + i * 0.9);
          const h = 3 + 40 * clamp(centre) * (0.18 + 0.82 * p) * (0.35 + 0.65 * wob);
          return <div key={i} style={{ flex: 1, height: h, background: color, borderRadius: 2, opacity: 0.55 + 0.45 * wob }} />;
        })}
      </div>
      <div style={{ position: "absolute", left: 26, bottom: 54, display: "flex", alignItems: "center", gap: 10, fontFamily: SERIF, fontSize: 19, fontWeight: 900, letterSpacing: 3, color, opacity: 0.9 * alpha, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
        <span style={{ width: 12, height: 12, borderRadius: 12, background: color, transform: `scale(${1 + 0.9 * p})`, boxShadow: `0 0 ${16 * p}px ${color}` }} />
        {Math.round(bpm)} BPM
      </div>
    </AbsoluteFill>
  );
};
