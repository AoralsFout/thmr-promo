import React from "react";
import { AbsoluteFill } from "remotion";
import { backOut, clamp, hash, prog } from "../lib/anim";
import { SERIF, theme } from "../theme";

/** Analog TV/radio static. Rendered small and scaled up: chunky and cheap. */
export const StaticOverlay: React.FC<{ opacity: number; frame: number }> = ({ opacity, frame }) => {
  if (opacity <= 0.002) return null;
  const id = "st";
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "screen" }}>
      <svg viewBox="0 0 480 270" preserveAspectRatio="none" style={{ width: 1920, height: 1080, imageRendering: "pixelated" }}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.92" numOctaves="1" seed={frame % 997} />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3.2 0 0 0 -1.25" />
        </filter>
        <rect width="480" height="270" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.18 }) => (
  <AbsoluteFill
    style={{
      opacity,
      background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 2px, transparent 2px, transparent 5px)",
      pointerEvents: "none",
    }}
  />
);

export const Vignette: React.FC<{ strength?: number; color?: string }> = ({ strength = 0.6, color = "0,0,0" }) => (
  <AbsoluteFill
    style={{ background: `radial-gradient(120% 110% at 50% 50%, rgba(${color},0) 52%, rgba(${color},${strength}) 100%)`, pointerEvents: "none" }}
  />
);

export const Flash: React.FC<{ opacity: number; color?: string }> = ({ opacity, color = "#fff7f9" }) =>
  opacity <= 0.003 ? null : <AbsoluteFill style={{ background: color, opacity: clamp(opacity), pointerEvents: "none" }} />;

/** Manga focus lines radiating from a point. */
export const SpeedLines: React.FC<{ opacity: number; cx?: number; cy?: number; frame: number; color?: string }> = ({
  opacity, cx = 50, cy = 45, frame, color = "255,255,255",
}) => {
  if (opacity <= 0.01) return null;
  const rot = (frame * 37) % 360;
  return (
    <AbsoluteFill
      style={{
        opacity,
        background: `repeating-conic-gradient(from ${rot}deg at ${cx}% ${cy}%, rgba(${color},0) 0deg, rgba(${color},0) 2.6deg, rgba(${color},0.85) 3deg, rgba(${color},0) 3.5deg, rgba(${color},0) 7deg)`,
        WebkitMaskImage: `radial-gradient(70% 70% at ${cx}% ${cy}%, transparent 38%, black 82%)`,
        maskImage: `radial-gradient(70% 70% at ${cx}% ${cy}%, transparent 38%, black 82%)`,
        pointerEvents: "none",
      }}
    />
  );
};

/** Manga emote bubble: pops in, wobbles, leaves. */
export const Emote: React.FC<{ t: number; t0: number; x: number; y: number; text: string; dur?: number; color?: string; size?: number }> = ({
  t, t0, x, y, text, dur = 1.3, color = theme.accentDeep, size = 110,
}) => {
  if (t < t0 || t > t0 + dur) return null;
  const u = t - t0;
  const s = backOut(prog(u, 0, 0.22)) * (1 - prog(u, dur - 0.15, 0.15));
  const wob = Math.sin(u * 14) * 6 * Math.exp(-u * 2.5);
  return (
    <div
      style={{
        position: "absolute", left: x - size / 2, top: y - size / 2 - prog(u, 0, dur) * 18, width: size, height: size,
        borderRadius: "50% 50% 50% 12%", background: "#fffdfd", border: "5px solid #2a161b", boxShadow: "0 8px 0 rgba(42,22,27,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s}) rotate(${wob}deg)`, transformOrigin: "20% 100%",
        fontFamily: SERIF, fontWeight: 900, fontSize: size * 0.62, color, lineHeight: 1,
      }}
    >
      {text}
    </div>
  );
};

/** Drifting sakura petals. */
export const Petals: React.FC<{ t: number; count?: number; color?: string; opacity?: number }> = ({ t, count = 26, color = "#ffd2dc", opacity = 0.9 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
    {Array.from({ length: count }, (_, i) => {
      const sp = 60 + hash(i) * 90;
      const life = 1300 / sp;
      const ph = (t / life + hash(i + 50)) % 1;
      const x = hash(i + 7) * 2200 - 150 - ph * 380 + Math.sin(t * (0.6 + hash(i + 3)) + i) * 50;
      const y = -60 + ph * 1240;
      const size = 14 + hash(i + 11) * 18;
      return (
        <div
          key={i}
          style={{
            position: "absolute", left: x, top: y, width: size, height: size * 0.62, borderRadius: "80% 10% 80% 10%",
            background: color, opacity: 0.55 + 0.45 * hash(i + 21),
            transform: `rotate(${t * (60 + hash(i + 31) * 120) + i * 40}deg) scaleY(${0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))})`,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

/** Expanding radio-wave rings (the arcs from the THMR logo). */
export const Rings: React.FC<{ t: number; cx: number; cy: number; color?: string; count?: number; period?: number; max?: number; width?: number; opacity?: number }> = ({
  t, cx, cy, color = theme.accent, count = 4, period = 2.4, max = 900, width = 3, opacity = 0.7,
}) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {Array.from({ length: count }, (_, i) => {
      const u = ((t / period + i / count) % 1 + 1) % 1;
      const r = u * max;
      return (
        <div
          key={i}
          style={{
            position: "absolute", left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: "50%",
            border: `${width}px solid ${color}`, opacity: (1 - u) * (1 - u) * opacity, boxSizing: "border-box",
          }}
        />
      );
    })}
  </AbsoluteFill>
);

/** One of the nine hidden ⑨ easter eggs. Count them — Cirno did. */
export const Egg: React.FC<{ n: number; style?: React.CSSProperties }> = ({ n, style }) => (
  <span data-egg={n} style={style}>⑨</span>
);

/** A slanted badge that slams in (used for stat call-outs). */
export const Badge: React.FC<{ t: number; t0: number; x: number; y: number; rot?: number; bg?: string; fg?: string; children: React.ReactNode; size?: number; until?: number }> = ({
  t, t0, x, y, rot = -4, bg = theme.accent, fg = "#fffafb", children, size = 64, until,
}) => {
  if (t < t0) return null;
  const u = prog(t, t0, 0.26);
  const out = until != null ? prog(t, until, 0.25) : 0;
  if (out >= 1) return null;
  const sc = 1 + (1 - Math.pow(u, 0.5)) * 1.6;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y + out * out * 900, padding: `${size * 0.2}px ${size * 0.5}px`, background: bg, color: fg, fontFamily: SERIF,
        fontSize: size, fontWeight: 900, letterSpacing: 3, borderRadius: 14, whiteSpace: "nowrap", opacity: clamp(u * 3),
        transform: `rotate(${rot + out * 30}deg) scale(${sc})`, transformOrigin: "30% 50%",
        boxShadow: "0 10px 0 rgba(40,10,18,0.28), 0 22px 40px rgba(40,10,18,0.3)", border: "4px solid rgba(255,255,255,0.85)",
      }}
    >
      {children}
    </div>
  );
};
