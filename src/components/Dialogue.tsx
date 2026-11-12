import React from "react";
import { CAST, Line, typeSchedule } from "../timeline";
import { backOut, clamp, hash, prog } from "../lib/anim";
import { SERIF, theme } from "../theme";
import { activeLine } from "./Sprite";

/** Typewriter text for a line. Unrevealed glyphs keep their space (no reflow). */
export const Typed: React.FC<{ line: Line; t: number; emColor: string; pop?: number }> = ({ line, t, emColor, pop = 12 }) => {
  const glyphs = typeSchedule(line);
  const local = t - line.t0;
  return (
    <>
      {glyphs.map((g, i) => {
        const age = local - g.t;
        const shown = clamp(age / 0.05);
        const rise = (1 - backOut(prog(age, 0, 0.16))) * pop;
        return (
          <span
            key={i}
            style={{
              position: "relative",
              top: age > 0 ? rise : 0,
              opacity: shown,
              color: g.em ? emColor : undefined,
              fontWeight: g.em ? 900 : undefined,
              whiteSpace: g.ch === " " ? "pre" : undefined,
            }}
          >
            {g.ch}
          </span>
        );
      })}
    </>
  );
};

const typingDone = (line: Line, t: number) => {
  const g = typeSchedule(line);
  return t - line.t0 > g[g.length - 1].t + 0.25;
};

/**
 * The film's "voice": a visual-novel dialogue box (or a boxless lower third for
 * the two outside-world girls). Scenes mount it wherever it should live, so it
 * can sit inside a scaled/rotated container when needed.
 */
export const Dialogue: React.FC<{ t: number; bottom?: number; only?: string[]; skip?: string[] }> = ({ t, bottom = 50, only, skip }) => {
  const line = activeLine(t);
  if (!line) return null;
  if (only && !only.includes(line.id)) return null;
  if (skip && skip.includes(line.id)) return null;
  const who = CAST[line.who];
  const enter = prog(t, line.t0, 0.2);
  const exit = prog(t, line.t1 - 0.12, 0.12);
  const alpha = Math.min(enter * 1.6, 1 - exit);

  if (line.style === "radio") {
    // boxless: a voice from the room, not a character on stage
    const flick = 0.9 + 0.1 * hash(Math.floor(t * 24));
    return (
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, textAlign: "center", opacity: alpha * flick, fontFamily: SERIF }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 18, color: who.color, fontSize: 30, letterSpacing: 10, fontWeight: 600 }}>
          <span style={{ width: 54, height: 1.5, background: who.color, opacity: 0.6 }} />
          {who.name}
          <span style={{ width: 54, height: 1.5, background: who.color, opacity: 0.6 }} />
        </div>
        <div
          style={{
            marginTop: 18, fontSize: 58, fontWeight: 600, color: "#fff6f8", letterSpacing: 3,
            textShadow: "0 0 22px rgba(255,170,190,0.45), 0 3px 10px rgba(0,0,0,0.85)",
          }}
        >
          <Typed line={line} t={t} emColor="#ffb7c5" pop={8} />
        </div>
      </div>
    );
  }

  const night = line.style === "night";
  const since = t - line.t0;
  const shake = line.shout ? Math.exp(-since * 9) : 0;
  const sx = (hash(Math.floor(t * 60)) - 0.5) * 22 * shake;
  const sy = (hash(Math.floor(t * 60) + 9) - 0.5) * 16 * shake;
  const scale = 0.94 + 0.06 * backOut(enter) + (line.shout ? 0.03 * Math.exp(-since * 7) : 0);
  const W = 1380;
  return (
    <div
      style={{
        position: "absolute", left: (1920 - W) / 2, bottom, width: W, opacity: alpha,
        transform: `translate(${sx}px, ${sy + (1 - enter) * 24}px) scale(${scale})`, transformOrigin: "50% 100%", fontFamily: SERIF,
      }}
    >
      {/* name plate */}
      <div
        style={{
          position: "absolute", left: 44, top: -34, height: 62, padding: "0 34px 0 30px", display: "flex", alignItems: "center", gap: 14,
          background: who.color, color: "#fff9fa", fontSize: 36, fontWeight: 900, letterSpacing: 6, borderRadius: "14px 14px 14px 0",
          boxShadow: "0 8px 20px rgba(0,0,0,0.28)", zIndex: 2,
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: 12, background: "#fff9fa", opacity: 0.9 }} />
        {who.name}
      </div>
      <div
        style={{
          position: "relative", minHeight: 190, padding: "52px 64px 38px 64px", borderRadius: 22, boxSizing: "border-box",
          background: night ? "rgba(27,15,19,0.93)" : "rgba(255,250,251,0.95)",
          border: `2px solid ${night ? "rgba(255,228,236,0.18)" : "rgba(84,34,46,0.2)"}`,
          boxShadow: night ? "0 22px 60px rgba(0,0,0,0.55)" : "0 22px 60px rgba(60,20,30,0.3)",
          color: night ? theme.nightInk : theme.paperInk, fontSize: 50, lineHeight: 1.5, fontWeight: 600, letterSpacing: 2,
        }}
      >
        {/* accent rail */}
        <div style={{ position: "absolute", left: 0, top: 26, bottom: 26, width: 8, borderRadius: 8, background: who.color }} />
        <Typed line={line} t={t} emColor={night ? "#ff9fb2" : theme.accentDeep} />
        {typingDone(line, t) && (
          <div
            style={{
              position: "absolute", right: 36, bottom: 22 + Math.sin(t * 9) * 5, width: 0, height: 0,
              borderLeft: "13px solid transparent", borderRight: "13px solid transparent", borderTop: `18px solid ${who.color}`,
            }}
          />
        )}
      </div>
    </div>
  );
};

/** Compact speech bubble (used for the post-credits gag). */
export const Bubble: React.FC<{ line: Line; t: number; x: number; y: number; w: number; tail?: "right" | "left" }> = ({ line, t, x, y, w, tail = "right" }) => {
  if (t < line.t0 || t >= line.t1) return null;
  const who = CAST[line.who];
  const enter = backOut(prog(t, line.t0, 0.25));
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width: w, padding: "22px 30px", boxSizing: "border-box", borderRadius: 24,
        background: "rgba(255,250,251,0.97)", border: `3px solid ${who.color}`, color: theme.paperInk, fontFamily: SERIF,
        fontSize: 36, fontWeight: 700, lineHeight: 1.4, transform: `scale(${enter})`, transformOrigin: tail === "right" ? "100% 100%" : "0% 100%",
        boxShadow: "0 14px 34px rgba(0,0,0,0.4)",
      }}
    >
      <Typed line={line} t={t} emColor={who.color} pop={8} />
      <div
        style={{
          position: "absolute", bottom: -20, [tail]: 46, width: 0, height: 0,
          borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: `22px solid ${who.color}`,
        } as React.CSSProperties}
      />
    </div>
  );
};
