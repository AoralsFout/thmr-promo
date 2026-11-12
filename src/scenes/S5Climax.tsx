// S5 高潮 — Bad Apple's second drop: mascot roll call, the title, a wall of danmaku.
import React, { useMemo } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { BA, bar, CAST, DANMAKU_CLIMAX, FPS, MASCOTS, ROLLCALL, T5, T6, TITLE_HITS } from "../timeline";
import { backOut, beatPulse, clamp, easeIn, easeOut5, lerp, prog, useT } from "../lib/anim";
import { SERIF, theme } from "../theme";
import { Dialogue } from "../components/Dialogue";
import { Danmaku, makeDanmaku, Shot } from "../components/Danmaku";
import { Egg, Flash, Petals, Rings, SpeedLines } from "../components/Fx";
import { Sprite } from "../components/Sprite";

const BEAT = 60 / BA.bpm;
const TITLE = "与幻想乡同频";
const T_TITLE = bar(52);
const T_WALL = bar(56);

/** The title lock-up; also used for the cover still. `hits` = per-glyph landing times. */
export const TitleLockup: React.FC<{ t: number; hits?: number[]; y?: number; size?: number }> = ({ t, hits, y = 150, size = 236 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", fontFamily: SERIF }}>
    <div style={{ display: "inline-flex", gap: size * 0.05 }}>
      {[...TITLE].map((ch, i) => {
        const t0 = hits ? hits[i] : -10;
        const u = prog(t, t0, 0.2);
        const hot = i >= 4; // 同频
        return (
          <span
            key={i}
            style={{
              display: "inline-block", fontSize: size, fontWeight: 900, lineHeight: 1.1, color: hot ? "#ffd9e0" : "#fffafb",
              opacity: t >= t0 ? 1 : 0, transform: `scale(${lerp(3.2, 1, easeOut5(u))}) rotate(${lerp(i % 2 ? 14 : -14, 0, easeOut5(u))}deg)`,
              textShadow: `0 0 ${50 + 40 * Math.exp(-Math.max(0, t - t0) * 5)}px ${hot ? "#ff5c78" : theme.accent}, 0 10px 0 rgba(60,10,22,0.55), 0 14px 40px rgba(0,0,0,0.6)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  </div>
);

/** The eight mascots lined up along the bottom. */
export const Lineup: React.FC<{ t: number; t0: number; baseY?: number; h?: number }> = ({ t, t0, baseY = 350, h = 800 }) => {
  // back row first so the centre overlaps nicely
  const order = [0, 7, 1, 6, 2, 5, 3, 4];
  return (
    <div style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
      {order.map((idx, k) => {
        const who = MASCOTS[idx];
        const x = 216 + idx * 212.5;
        const u = backOut(prog(t, t0 + k * 0.045, 0.45));
        const bob = Math.sin(t * (Math.PI / BEAT) + idx * 0.8) * 10;
        const center = 1 - Math.abs(idx - 3.5) / 3.5;
        return <Sprite key={who} who={who} expr="base" x={x} y={baseY - center * 70 + (1 - u) * 900 + bob} h={h + center * 90} glow={`${CAST[who].color}88`} z={Math.round(center * 10)} />;
      })}
    </div>
  );
};

export const S5Climax: React.FC = () => {
  const t = useT();
  const frame = Math.round(t * FPS);
  const wall: Shot[] = useMemo(() => {
    const s = makeDanmaku({ texts: DANMAKU_CLIMAX, t0: T_TITLE + BEAT * 5, t1: T6 + 0.5, lanes: 15, seed: 8, size: 50, colorful: 0.55, rate: (x) => (x < T_WALL ? 4 : 12) });
    s.push({ text: <Egg n={8} />, len: 1, t: T_WALL + 1.1, lane: 9, color: "#7ec9ff", size: 56, speed: 520 });
    return s;
  }, []);
  const out = easeIn(prog(t, T6 - 0.45, 0.45));

  // ── A: roll call ──
  if (t < T_TITLE) {
    const i = Math.min(MASCOTS.length - 1, Math.max(0, Math.floor((t - T5) / (2 * BEAT))));
    const who = MASCOTS[i];
    const c = CAST[who];
    const local = t - ROLLCALL[i];
    const u = easeOut5(prog(local, 0, 0.22));
    const left = i % 2 === 0; // sprite side alternates
    return (
      <AbsoluteFill style={{ background: c.night, overflow: "hidden" }}>
        <AbsoluteFill style={{ background: `linear-gradient(${left ? 115 : 245}deg, ${c.color} 0%, ${c.color} 46%, ${c.night} 46.2%, ${c.night} 100%)` }} />
        <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(${left ? 115 : 245}deg, rgba(255,255,255,0.09) 0 26px, transparent 26px 70px)`, backgroundPosition: `${t * 240}px 0` }} />
        <div
          style={{
            position: "absolute", [left ? "right" : "left"]: 90, top: 300, textAlign: left ? "right" : "left", fontFamily: SERIF, color: "#fffafb",
            transform: `translateX(${(1 - u) * (left ? 500 : -500)}px)`,
          } as React.CSSProperties}
        >
          <div style={{ fontSize: 44, letterSpacing: 14, fontWeight: 900, color: c.color, filter: "brightness(1.5)" }}>看板娘 {String(i + 1).padStart(2, "0")} / 08</div>
          <div style={{ fontSize: c.full.length > 6 ? 104 : c.full.length === 6 ? 150 : c.full.length === 5 ? 170 : 190, fontWeight: 900, lineHeight: 1.12, letterSpacing: 6, textShadow: `10px 10px 0 ${c.color}`, whiteSpace: "nowrap" }}>{c.full}</div>
          <div style={{ display: "inline-block", marginTop: 20, padding: "6px 34px", background: "#fffafb", color: c.night, fontSize: 52, fontWeight: 900, letterSpacing: 6, borderRadius: 10 }}>{c.theme}</div>
        </div>
        <Sprite who={who} expr="alt" x={left ? 500 : 1420} y={120} h={1300} scale={lerp(1.4, 1, u)} shadow={false} rot={lerp(left ? -6 : 6, 0, u)} />
        <SpeedLines opacity={0.35 * Math.exp(-local * 4)} cx={left ? 27 : 73} cy={50} frame={frame} />
        <Flash opacity={Math.exp(-local * 14)} />
      </AbsoluteFill>
    );
  }

  // ── B/C: title + danmaku wall ──
  const sinceTitle = t - T_TITLE;
  const pulse = beatPulse(t, T_TITLE, BEAT, 6);
  const cta = easeOut5(prog(t, T_WALL, 0.4));
  return (
    <AbsoluteFill style={{ background: theme.night, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${1.12 + 0.012 * pulse - 0.06 * prog(t, T_TITLE, T6 - T_TITLE)}, ${Math.max(0.004, 1 - out)})`, filter: out > 0 ? `brightness(${1 + out * 3})` : undefined }}>
        <Img src={staticFile("img/bg_gensokyo_night.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(22,13,16,0.25) 0%, rgba(22,13,16,0) 40%, rgba(22,13,16,0.75) 100%)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `scaleY(${Math.max(0.004, 1 - out)})` }}>
        <Rings t={sinceTitle} cx={960} cy={300} color="#ffb7c5" count={4} period={BEAT * 4} max={1500} width={3} opacity={0.5} />
        <Petals t={t} count={34} />
        <Lineup t={t} t0={T_TITLE} />
        <div style={{ transform: `translateY(${-cta * 86}px) scale(${1 - 0.2 * cta})`, transformOrigin: "50% 20%" }}>
          <TitleLockup t={t} hits={TITLE_HITS} y={130} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 410, display: "flex", justifyContent: "center", alignItems: "center", gap: 24, fontFamily: SERIF, color: "#fffafb", opacity: prog(t, T_TITLE + BEAT * 6, 0.3) }}>
            <Img src={staticFile("brand/logo.png")} style={{ width: 84, height: 84 }} />
            <span style={{ fontSize: 62, fontWeight: 900, letterSpacing: 10, textShadow: "0 6px 24px rgba(0,0,0,0.7)" }}>东方音乐电台 THMR</span>
          </div>
        </div>
        <Danmaku shots={wall} t={t} top={24} laneH={62} opacity={0.96} />
        {/* call to action */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 400, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: SERIF, opacity: clamp(cta * 2), transform: `scale(${lerp(1.5, 1, cta)})` }}>
          <div style={{ padding: "10px 60px", borderRadius: 60, background: "#fffafb", color: theme.accentDeep, fontSize: 84, fontWeight: 900, letterSpacing: 4, boxShadow: `0 0 ${60 + 40 * pulse}px ${theme.accent}, 0 16px 40px rgba(0,0,0,0.5)` }}>thmr.yunmoan.cn</div>
          <div style={{ marginTop: 18, fontSize: 40, fontWeight: 900, color: "#fffafb", letterSpacing: 10, textShadow: "0 4px 18px rgba(0,0,0,0.8)" }}>免费收听 · 24 小时放送 · 五端可用</div>
        </div>
        <Dialogue t={t} />
      </AbsoluteFill>
      <Flash opacity={Math.exp(-sinceTitle * 5)} />
      <Flash opacity={t >= T_WALL ? Math.exp(-(t - T_WALL) * 7) * 0.6 : 0} color="#ffd9e0" />
    </AbsoluteFill>
  );
};
