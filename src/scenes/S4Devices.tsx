// S4: the signal jumps between devices, then real client themes take over.
// Portrait footage is the Flutter Windows client at phone dimensions; desktop
// footage is Windows. Platform labels describe availability, not capture OS.
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import { BA_BEAT as BEAT, bar, CAST, CharId, FPS, LINES, MASCOTS, PLATFORMS, PLATFORM_HITS, pulse, ROULETTE, T4, T4B, T5, T_ALL5 } from "../timeline";
import { clamp, easeIn, easeOut5, lerp, prog, useT } from "../lib/anim";
import { SERIF, theme } from "../theme";
import { Dialogue } from "../components/Dialogue";
import { Egg, Flash, Rings } from "../components/Fx";
import { perform, Sprite } from "../components/Sprite";

function themeAt(t: number): { who: CharId; since: number; light: boolean } {
  const steps = [
    { t: T4B, who: "reimu" as CharId, light: false },
    { t: bar(26), who: "marisa" as CharId, light: false },
    { t: bar(27), who: "cirno" as CharId, light: false },
    ...ROULETTE.map((rt, i) => ({ t: rt, who: MASCOTS[(i + 4) % 8], light: i % 2 === 1 })),
  ];
  let cur = steps[0];
  for (const s of steps) if (t >= s.t) cur = s;
  return { who: cur.who, since: cur.t, light: cur.light };
}

type Pose = { x: number; y: number; w: number; rot: number; ry: number; opacity: number };
const POSES: Pose[][] = [
  // Android: portrait at centre, desktop and browser frame the signal.
  [{ x: 1000, y: 310, w: 760, rot: 7, ry: -18, opacity: .3 }, { x: 750, y: 135, w: 340, rot: -5, ry: 0, opacity: 1 }, { x: 100, y: 340, w: 730, rot: -9, ry: 20, opacity: .3 }],
  [{ x: 380, y: 200, w: 1200, rot: -3, ry: -7, opacity: 1 }, { x: 1600, y: 300, w: 245, rot: 12, ry: -15, opacity: .5 }, { x: -390, y: 340, w: 700, rot: -12, ry: 15, opacity: .25 }],
  [{ x: 370, y: 190, w: 1220, rot: 2, ry: 7, opacity: 1 }, { x: 1600, y: 270, w: 245, rot: 9, ry: -15, opacity: .5 }, { x: -390, y: 340, w: 700, rot: -12, ry: 15, opacity: .25 }],
  [{ x: 380, y: 200, w: 1200, rot: -1, ry: 0, opacity: 1 }, { x: 1600, y: 300, w: 245, rot: 12, ry: -15, opacity: .5 }, { x: -390, y: 340, w: 700, rot: -12, ry: 15, opacity: .25 }],
  [{ x: 1470, y: 360, w: 750, rot: 10, ry: -15, opacity: .3 }, { x: 80, y: 310, w: 240, rot: -12, ry: 10, opacity: .45 }, { x: 375, y: 200, w: 1190, rot: 2, ry: 0, opacity: 1 }],
  // Pull back into an asymmetric airborne stack, not a row of monitors.
  [{ x: 180, y: 150, w: 1060, rot: -5, ry: 8, opacity: 1 }, { x: 1350, y: 170, w: 300, rot: 8, ry: -10, opacity: 1 }, { x: 680, y: 490, w: 650, rot: 5, ry: -5, opacity: .95 }],
];
const fit: React.CSSProperties = { width: "100%", height: "100%", objectFit: "contain" };

const Screen: React.FC<{ kind: number; pose: Pose; children: React.ReactNode }> = ({ kind, pose: p, children }) => (
  <div style={{ position: "absolute", left: p.x, top: p.y, width: p.w, opacity: p.opacity, perspective: 2400, zIndex: kind === 1 ? 3 : kind === 0 ? 1 : 2 }}>
    <div style={{ transform: `rotate(${p.rot}deg) rotateY(${p.ry}deg)`, background: "#0b0709", padding: kind === 1 ? 9 : 7, borderRadius: kind === 1 ? 30 : 15, border: "2px solid #e8b8c566", boxShadow: "0 35px 75px #000a", overflow: "hidden" }}>
      <div style={{ aspectRatio: kind === 1 ? "480 / 1040" : "16 / 9", overflow: "hidden", borderRadius: kind === 1 ? 22 : 8 }}>{children}</div>
    </div>
  </div>
);

export const S4Devices: React.FC = () => {
  const t = useT();
  const partB = t >= T4B;
  const th = themeAt(t);
  const c = CAST[th.who];
  const sw = partB ? Math.exp(-(t - th.since) * 10) : 0;
  const roulette = t >= bar(28);
  const collapse = easeIn(prog(t, T5 - BEAT * 2.1, BEAT * 1.6));
  const p = perform(th.who, t, LINES.filter(l => l.id.startsWith("s4_")), "base");
  const hits = [...PLATFORM_HITS, T_ALL5];
  const index = Math.max(0, hits.filter(h => t >= h).length - 1);
  const move = easeOut5(prog(t, hits[index], .32));
  const poses = POSES[index].map((dest, i) => {
    const prev = POSES[Math.max(0, index - 1)][i];
    return Object.fromEntries(Object.entries(dest).map(([k, v]) => [k, lerp(prev[k as keyof Pose], v, move)])) as Pose;
  });
  const color = partB ? c.color : theme.accent;
  return (
    <AbsoluteFill style={{ background: partB ? c.night : theme.night, overflow: "hidden", fontFamily: SERIF }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${color}55, transparent 70%)` }} />
      <Rings t={t - T4} cx={960} cy={480} color={color} count={4} period={BEAT * 4} max={1400} width={3} opacity={.4} />
      {!partB && <>
        <div style={{ position: "absolute", left: 70, top: 38, color: "#fffafb", fontSize: 54, fontWeight: 900, letterSpacing: 8 }}>同一束电波，随你而行。</div>
        <AbsoluteFill style={{ transform: `scale(${1 + .012 * pulse(t)})`, opacity: 1 - prog(t, T4B - .18, .18) }}>
          <Screen kind={0} pose={poses[0]}>
            <Sequence from={Math.round(T4 * FPS)} layout="none"><OffthreadVideo src={staticFile("app/desk.mp4")} muted style={fit} /></Sequence>
          </Screen>
          <Screen kind={1} pose={poses[1]}>
            <Sequence from={Math.round(T4 * FPS)} layout="none"><OffthreadVideo src={staticFile("app/phone.mp4")} muted style={fit} /></Sequence>
          </Screen>
          <Screen kind={2} pose={poses[2]}><Img src={staticFile("ui/dark_playing.png")} style={fit} /></Screen>
        </AbsoluteFill>
        <div style={{ position: "absolute", left: 72, top: 700, color: "#fffafb", fontWeight: 900, textShadow: "0 5px 25px #000" }}>
          <div style={{ fontSize: 72, letterSpacing: 5, transform: `translateX(${(1 - move) * -80}px)` }}>{index < 5 ? PLATFORMS[index] : "五端，同频。"}</div>
          <div style={{ fontSize: 23, color: "#e8c4cc", marginTop: 6, opacity: index === 5 ? 0 : 1 }}>{index === 0 ? "Flutter 客户端 · 竖屏布局实录" : index < 4 ? "桌面客户端 · Windows 实录" : index === 4 ? "打开浏览器，即刻收听" : "网页 / Windows / macOS / Linux / Android"}</div>
        </div>
        <div style={{ position: "absolute", left: 75, right: 75, bottom: 62, opacity: 1 - prog(t, T_ALL5, .18), display: "flex", alignItems: "center", gap: 16 }}>
          {PLATFORMS.map((name, i) => <React.Fragment key={name}>
            {i > 0 && <div style={{ flex: 1, height: 3, background: t >= PLATFORM_HITS[i] ? color : "#ffffff22" }} />}
            <div style={{ color: "#fffafb", background: t >= PLATFORM_HITS[i] ? color : "#ffffff11", padding: "7px 24px", borderRadius: 30, fontSize: 30, fontWeight: 900, transform: `scale(${index === i ? 1 + .08 * pulse(t) : 1})` }}>{name}</div>
          </React.Fragment>)}
        </div>
      </>}
      {partB && <AbsoluteFill style={{ transform: `scaleY(${Math.max(.004, 1 - collapse)})` }}>
        <div style={{ position: "absolute", left: 70, top: 48, color: c.color, fontSize: 36, fontWeight: 900, letterSpacing: 8 }}>让放送局，染上你的颜色。</div>
        <Sprite who={th.who} expr={roulette ? "base" : p.expr} x={310} y={230 + p.dy} h={1130} scale={p.scale * (1 + .03 * sw)} glow={`${color}88`} />
        <div style={{ position: "absolute", left: 640, top: 150, color: "#fffafb", fontSize: 54, fontWeight: 900, letterSpacing: 4, transform: `translateX(${sw * 24}px)` }}>{c.theme} <span style={{ color, fontSize: 30 }}>{th.light ? "昼" : "夜"}</span></div>
        <div style={{ position: "absolute", left: 605, top: 240, width: 940, transform: `perspective(2200px) rotateY(${-5 + 2 * Math.sin(t)}deg) scale(${1 + .018 * sw})`, border: `3px solid ${color}`, borderRadius: 12, overflow: "hidden", boxShadow: `0 28px 80px #0009` }}>
          <Img src={staticFile(`app/l_${th.who}_${th.light ? "light" : "dark"}.jpg`)} style={{ width: "100%", display: "block" }} />
        </div>
        <div style={{ position: "absolute", left: 1530, top: 230, width: 230, transform: `rotate(5deg) translateY(${-6 * pulse(t)}px)`, padding: 7, borderRadius: 24, background: "#160d10", border: `2px solid ${color}`, boxShadow: "0 25px 65px #0009" }}>
          <Img src={staticFile(`app/p_${th.who}_${th.who === "reimu" && th.light ? "light" : "dark"}.jpg`)} style={{ width: "100%", display: "block", borderRadius: 17 }} />
        </div>
        <div style={{ position: "absolute", left: 640, top: 112, color: "#e6c8d0", fontSize: 22, letterSpacing: 3 }}>客户端真实主题 · 横屏与竖屏 <Egg n={7} /></div>
        <div style={{ position: "absolute", left: 640, top: 780, display: "flex", gap: 16, alignItems: "center" }}>
          {MASCOTS.map(m => <span key={m} style={{ width: 38, height: 38, borderRadius: 30, background: CAST[m].color, border: `4px solid ${m === th.who ? "#fff" : "transparent"}`, transform: `scale(${m === th.who ? 1.2 : 1})` }} />)}
          <span style={{ color: "#fffafb", fontSize: 28, marginLeft: 12, fontWeight: 900 }}>8 位看板娘 × 明暗双主题</span>
        </div>
      </AbsoluteFill>}
      {collapse < .6 && <Dialogue t={t} />}
      <Flash opacity={partB ? sw * .18 : Math.exp(-(t - T4) * 8) * .35} color={color} />
      <Flash opacity={clamp(prog(t, T5 - BEAT * .9, BEAT * .4))} color="#000" />
    </AbsoluteFill>
  );
};
