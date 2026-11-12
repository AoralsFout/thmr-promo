// S4 多端实机 — real captures on every platform, then the mascot/theme switcher.
// Plays over Bad Apple's break; the roulette winds up into the final drop.
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import { BA, bar, CAST, CharId, FPS, LINES, MASCOTS, ROULETTE, T4, T5 } from "../timeline";
import { backOut, clamp, easeIn, easeOut5, prog, useT } from "../lib/anim";
import { SERIF, theme } from "../theme";
import { Dialogue } from "../components/Dialogue";
import { Egg, Flash, Rings } from "../components/Fx";
import { perform, Sprite } from "../components/Sprite";
import { AppWindow, skin, TRACKS } from "../components/Ui";

const BEAT = 60 / BA.bpm;
const SCENE_LINES = LINES.filter((l) => l.id.startsWith("s4_"));
const B = bar(38); // part B: theme switcher
const PLATFORMS = ["网页", "Windows", "macOS", "Linux", "Android"];
const LIGHT_BG: Record<string, string> = {
  reimu: "#fbf2f4", marisa: "#faf4e6", cirno: "#eff6fa", tenshi: "#f2f4f9", sanae: "#eff6f0", koishi: "#f6f2f9", remilia: "#faf1f1", satori: "#faf1f5",
};
const QUEUE = Array.from({ length: 8 }, (_, i) => TRACKS[(i * 13 + 9) % TRACKS.length]);

/** Which mascot theme is active at time t (and when it was switched to). */
function themeAt(t: number): { who: CharId; since: number; light: boolean } {
  const steps: { t: number; who: CharId; light: boolean }[] = [
    { t: B, who: "cirno", light: false }, // the capture's theme: 琪露诺 · 冰蓝
    { t: B + BEAT * 2, who: "reimu", light: false },
    { t: bar(42), who: "marisa", light: false },
    { t: bar(43.5), who: "cirno", light: false },
    ...ROULETTE.map((rt, i) => ({ t: rt, who: MASCOTS[(i + 4) % MASCOTS.length], light: i % 2 === 1 })),
  ];
  let cur = steps[0];
  for (const s of steps) if (t >= s.t) cur = s;
  return { who: cur.who, since: cur.t, light: cur.light };
}

const Device: React.FC<{ x: number; y: number; w: number; h: number; ry: number; enter: number; children: React.ReactNode; label: string; chrome?: "browser" | "monitor" | "phone" }> = ({
  x, y, w, h, ry, enter, children, label, chrome = "monitor",
}) => (
  <div style={{ position: "absolute", left: x, top: y + (1 - enter) * 500, width: w, opacity: clamp(enter * 2), perspective: 2200, fontFamily: SERIF }}>
    <div style={{ textAlign: "center", marginBottom: 12, fontSize: 24, letterSpacing: 6, color: theme.mutedOnNight, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</div>
    <div style={{ transform: `rotateY(${ry}deg)`, transformStyle: "preserve-3d" }}>
      <div
        style={{
          borderRadius: chrome === "phone" ? 44 : 18, padding: chrome === "phone" ? 12 : chrome === "browser" ? "0 0 0 0" : 14, background: "#0b0709",
          border: "2px solid rgba(255,228,236,0.22)", boxShadow: "0 40px 90px rgba(0,0,0,0.65)", overflow: "hidden",
        }}
      >
        {chrome === "browser" && (
          <div style={{ height: 44, display: "flex", alignItems: "center", gap: 9, padding: "0 16px", background: "#24161a" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (<span key={c} style={{ width: 13, height: 13, borderRadius: 13, background: c }} />))}
            <div style={{ flex: 1, marginLeft: 12, height: 26, borderRadius: 13, background: "rgba(255,255,255,0.1)", color: theme.mutedOnNight, fontSize: 16, display: "flex", alignItems: "center", padding: "0 14px" }}>thmr.yunmoan.cn</div>
          </div>
        )}
        <div style={{ width: "100%", height: h, borderRadius: chrome === "phone" ? 34 : chrome === "browser" ? 0 : 6, overflow: "hidden", position: "relative", background: "#000" }}>{children}</div>
      </div>
      {chrome === "monitor" && (
        <>
          <div style={{ width: 150, height: 30, margin: "0 auto", background: "linear-gradient(180deg, #1c1215, #0b0709)" }} />
          <div style={{ width: 380, height: 14, margin: "0 auto", borderRadius: 8, background: "#1c1215" }} />
        </>
      )}
    </div>
  </div>
);

export const S4Devices: React.FC = () => {
  const t = useT();
  const partB = t >= B;
  const th = themeAt(t);
  const c = CAST[th.who];
  const s = skin(c.color, th.light ? LIGHT_BG[th.who] : c.night, !th.light);
  const sw = Math.exp(-(t - th.since) * 7);
  const roulette = t >= bar(45);
  const collapse = easeIn(prog(t, T5 - BEAT * 2.1, BEAT * 1.6)); // CRT-off into the silent gap before the drop
  const p = perform(th.who, t, SCENE_LINES, th.who === "reimu" ? "smug" : th.who === "marisa" ? "laugh" : th.who === "cirno" ? "proud" : "base");
  const bIn = easeOut5(prog(t, B, 0.5));
  const aOut = easeIn(prog(t, B - 0.3, 0.3));

  return (
    <AbsoluteFill style={{ background: partB ? (th.light ? "#2a1a1f" : c.night) : theme.night }}>
      <AbsoluteFill style={{ background: `radial-gradient(70% 70% at 50% 45%, ${partB ? c.color : theme.accent}55 0%, transparent 70%)` }} />
      <Rings t={t - T4} cx={960} cy={480} color={partB ? c.color : theme.accent} count={4} period={BEAT * 4} max={1300} width={2} opacity={0.3} />

      {/* ── A: every platform, real captures ── */}
      {!partB && (
        <AbsoluteFill style={{ transform: `scale(${1 - 0.2 * aOut})`, opacity: 1 - aOut }}>
          <Device x={70} y={230} w={520} h={292} ry={22} enter={backOut(prog(t, T4 + 0.25, 0.5))} label="网页版" chrome="browser">
            <Img src={staticFile("ui/dark_playing.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" }} />
          </Device>
          <Device x={500} y={136} w={920} h={493} ry={0} enter={backOut(prog(t, T4 + 0.05, 0.5))} label="桌面客户端实机录屏">
            <Sequence from={Math.round(T4 * FPS)} layout="none">
              <OffthreadVideo src={staticFile("ui/app_play.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </Sequence>
          </Device>
          <Device x={1500} y={150} w={262} h={516} ry={-22} enter={backOut(prog(t, T4 + 0.45, 0.5))} label="移动端" chrome="phone">
            <Img src={staticFile("ui/m_playing.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" }} />
          </Device>
          <div style={{ position: "absolute", left: 70, top: 44, display: "flex", gap: 18, fontFamily: SERIF }}>
            {PLATFORMS.map((name, i) => {
              const t0 = T4 + BEAT * (2 + i * 4);
              const u = backOut(prog(t, t0, 0.28));
              return (
                <div key={name} style={{ padding: "6px 30px", borderRadius: 40, fontSize: 36, fontWeight: 900, color: t >= t0 ? "#fffafb" : theme.mutedOnNight, background: t >= t0 ? theme.accent : "transparent", border: `2.5px solid ${t >= t0 ? theme.accent : theme.borderOnNight}`, transform: `scale(${t >= t0 ? u : 1})`, boxShadow: t >= t0 ? `0 0 ${30 * Math.exp(-(t - t0) * 4) + 8}px ${theme.accent}` : undefined }}>
                  {name}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* ── B: pick your mascot ── */}
      {partB && (
        <AbsoluteFill style={{ transform: `scaleY(${Math.max(0.004, 1 - collapse)})`, filter: collapse > 0 ? `brightness(${1 + collapse * 2.5})` : undefined }}>
          <Sprite
            who={th.who} expr={roulette ? "base" : p.expr} x={330 + (th.who === "marisa" && !roulette ? (1 - backOut(prog(t, th.since, 0.3))) * -500 : 0)} y={190 + p.dy - sw * 30}
            h={1280} scale={p.scale * (1 + 0.05 * sw)} glow={`${c.color}99`}
          />
          <div style={{ position: "absolute", left: 660, top: 146 + (1 - bIn) * 400, opacity: clamp(bIn * 2), transform: `scale(${1 + 0.025 * sw})`, transformOrigin: "50% 50%" }}>
            <AppWindow s={s} who={th.who} t={t} width={1190} height={616} themeName={c.theme} track={QUEUE[0]} queue={QUEUE.slice(1)} switchPulse={sw} listeners={<Egg n={7} />} />
          </div>
          {/* theme name plate */}
          <div style={{ position: "absolute", left: 660, top: 56, display: "flex", alignItems: "center", gap: 22, fontFamily: SERIF, color: theme.nightInk, opacity: clamp(bIn * 2) }}>
            <div style={{ fontSize: 26, letterSpacing: 10, color: c.color, fontWeight: 900 }}>看板娘主题</div>
            <div style={{ padding: "4px 30px", borderRadius: 12, background: c.color, color: "#fffafb", fontSize: 50, fontWeight: 900, letterSpacing: 4, transform: `scale(${1 + 0.18 * sw})`, transformOrigin: "0% 50%", whiteSpace: "nowrap" }}>{c.theme}</div>
          </div>
          {/* swatches */}
          <div style={{ position: "absolute", left: 660, top: 778, display: "flex", alignItems: "center", gap: 16, opacity: clamp(bIn * 2), fontFamily: SERIF }}>
            {MASCOTS.map((m) => (
              <div key={m} style={{ width: 54, height: 54, borderRadius: 54, background: CAST[m].color, border: m === th.who ? "5px solid #fffafb" : "5px solid transparent", boxSizing: "border-box", transform: `scale(${m === th.who ? 1.25 + 0.3 * sw : 1})`, boxShadow: m === th.who ? `0 0 24px ${CAST[m].color}` : undefined }} />
            ))}
            <div style={{ marginLeft: 26, fontSize: 34, color: "#fffafb", fontWeight: 900, letterSpacing: 4, opacity: roulette ? 1 : 0, whiteSpace: "nowrap" }}>8 位看板娘 × 明暗双主题</div>
          </div>
        </AbsoluteFill>
      )}

      {collapse < 0.6 && <Dialogue t={t} />}
      <Flash opacity={Math.exp(-(t - T4) * 5) * 0.6} color={theme.night} />
      <Flash opacity={partB ? sw * (roulette ? 0.3 : 0.4) : 0} color={c.color} />
      {/* black-out in the silent gap before the drop */}
      <Flash opacity={prog(t, T5 - BEAT * 0.9, BEAT * 0.4)} color="#000" />
    </AbsoluteFill>
  );
};
