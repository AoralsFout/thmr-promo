import React from "react";
import { Img, staticFile } from "remotion";
import { CAST, CharId, Line, LINES, pulse, typeSchedule } from "../timeline";
import { backOut, clamp, prog } from "../lib/anim";

export const artSrc = (who: CharId, expr?: string) => {
  if (!expr || expr === "base") return staticFile(`art/${who}.png`);
  if (expr === "alt") return staticFile(`art/${who}_alt.png`);
  return staticFile(`art/expr/${who}_${expr}.png`);
};

// Several illustrations run off their canvas (sleeves, skirts). Feather the
// left / right / bottom edges so the crop never shows as a hard line on stage.
const EDGE_MASK =
  "linear-gradient(90deg, transparent 0%, #000 7%, #000 93%, transparent 100%), linear-gradient(180deg, #000 0%, #000 93%, transparent 100%)";
const EDGE_FADE: React.CSSProperties = {
  maskImage: EDGE_MASK,
  WebkitMaskImage: EDGE_MASK,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
};

type SpriteProps = {
  who: CharId;
  expr?: string;
  /** centre x of the sprite in px */
  x: number;
  /** extra offset downwards in px (the sprite is bottom-anchored) */
  y?: number;
  /** rendered height in px */
  h?: number;
  flip?: boolean;
  /** 1 = full brightness, lower = dimmed (non-speaking) */
  light?: number;
  opacity?: number;
  scale?: number;
  rot?: number;
  shadow?: boolean;
  /** coloured rim glow */
  glow?: string;
  z?: number;
};

/** A bottom-anchored character illustration (2:3 portrait art with real alpha). */
export const Sprite: React.FC<SpriteProps> = ({
  who, expr, x, y = 0, h = 1240, flip, light = 1, opacity = 1, scale = 1, rot = 0, shadow = true, glow, z,
}) => {
  const w = (h * 2) / 3;
  const filters: string[] = [];
  if (light !== 1) filters.push(`brightness(${light}) saturate(${0.6 + 0.4 * light})`);
  if (glow) filters.push(`drop-shadow(0 0 28px ${glow})`);
  if (shadow) filters.push("drop-shadow(0 18px 26px rgba(20,6,10,0.38))");
  return (
    <Img
      src={artSrc(who, expr)}
      style={{
        position: "absolute",
        left: x - w / 2,
        top: 1080 - h + y,
        width: w,
        height: h,
        objectFit: "contain",
        opacity,
        transform: `scale(${(flip ? -1 : 1) * scale}, ${scale}) rotate(${rot}deg)`,
        transformOrigin: "50% 85%",
        filter: filters.join(" ") || undefined,
        zIndex: z,
        ...EDGE_FADE,
      }}
    />
  );
};

/** The line being delivered at time t (if any). */
export const activeLine = (t: number): Line | undefined => LINES.find((l) => t >= l.t0 && t < l.t1);

/**
 * Performance state for a character inside a scene: which expression to show,
 * whether they are the current speaker, and a little hop/bob while "talking".
 */
export function perform(who: CharId, t: number, sceneLines: Line[], fallbackExpr = "base") {
  const mine = sceneLines.filter((l) => l.who === who && l.t0 <= t);
  const last = mine[mine.length - 1];
  const cur = sceneLines.find((l) => t >= l.t0 && t < l.t1);
  const speaking = !!cur && cur.who === who;
  // everyone on stage nods along with whatever is on air
  let dy = 8 * pulse(t + who.length * 0.013, 4.5);
  let scale = 1;
  if (last) {
    const since = t - last.t0;
    // hop at the start of every line of theirs
    dy -= Math.sin(Math.PI * clamp(since / 0.34)) * (last.shout ? 46 : 26);
    // expression "pop" when the face changes
    scale *= 1 + 0.035 * (1 - backOut(prog(since, 0, 0.3)));
    if (speaking) {
      const g = typeSchedule(last);
      const typing = since < g[g.length - 1].t + 0.1;
      if (typing) dy -= Math.abs(Math.sin(since * 21)) * 5;
    }
  }
  return { expr: last?.expr ?? fallbackExpr, speaking, dy, scale, color: CAST[who].color };
}
