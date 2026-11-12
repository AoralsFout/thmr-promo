// S6 尾声 — back in the room. The signal is still there. End card + credits.
import React, { useMemo } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import QRCode from "qrcode";
import { AF, BA, CAST, FPS, T6, T_END, lineById } from "../timeline";
import { backOut, clamp, easeOut5, lerp, prog, useT } from "../lib/anim";
import { SERIF, theme } from "../theme";
import { Bubble, Dialogue } from "../components/Dialogue";
import { Egg, Flash, Scanlines, StaticOverlay, Vignette } from "../components/Fx";
import { Sprite } from "../components/Sprite";

const URL = "https://thmr.yunmoan.cn";
const T_CARD = T6 + 7.7;
const PLATFORMS = ["网页", "Windows", "macOS", "Linux", "Android"];

const Qr: React.FC<{ size: number }> = ({ size }) => {
  const { cells, n } = useMemo(() => {
    const q = QRCode.create(URL, { errorCorrectionLevel: "M" });
    return { cells: q.modules.data, n: q.modules.size };
  }, []);
  const m = 2; // quiet zone, in modules
  const c = size / (n + m * 2);
  return (
    <svg width={size} height={size} style={{ borderRadius: 18, background: "#fffafb" }}>
      {Array.from(cells, (v, i) => (v ? <rect key={i} x={(m + (i % n)) * c} y={(m + Math.floor(i / n)) * c} width={c + 0.4} height={c + 0.4} fill="#24161a" /> : null))}
    </svg>
  );
};

/** The closing card; also rendered on its own as part of the cover still. */
export const EndCard: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const u = (d: number) => easeOut5(prog(t, t0 + d, 0.6));
  const row = (d: number): React.CSSProperties => ({ opacity: clamp(u(d) * 1.5), transform: `translateY(${(1 - u(d)) * 40}px)` });
  return (
    <AbsoluteFill style={{ fontFamily: SERIF, color: theme.nightInk }}>
      <AbsoluteFill style={{ background: `radial-gradient(110% 110% at 25% 20%, #2e161d 0%, ${theme.night} 62%)`, opacity: clamp(prog(t, t0, 0.7)) * 0.96 }} />
      <div style={{ position: "absolute", left: 150, top: 150, display: "flex", alignItems: "center", gap: 40, ...row(0.1) }}>
        <Img src={staticFile("brand/logo.png")} style={{ width: 200, height: 200, filter: "drop-shadow(0 0 40px rgba(198,90,105,0.6))" }} />
        <div>
          <div style={{ fontSize: 112, fontWeight: 900, letterSpacing: 8, lineHeight: 1.15 }}>东方音乐电台</div>
          <div style={{ fontSize: 34, letterSpacing: 10, color: theme.mutedOnNight, whiteSpace: "nowrap" }}>TOUHOU MUSIC RADIO <span style={{ color: theme.accentSoft, fontWeight: 900 }}>THMR</span></div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 150, top: 410, fontSize: 64, fontWeight: 900, letterSpacing: 16, color: "#ffd9e0", textShadow: `0 0 40px ${theme.accent}`, ...row(0.35) }}>与幻想乡同频</div>
      <div style={{ position: "absolute", left: 150, top: 530, ...row(0.55) }}>
        <div style={{ display: "inline-block", padding: "10px 46px", borderRadius: 50, background: "#fffafb", color: theme.accentDeep, fontSize: 68, fontWeight: 900, letterSpacing: 3 }}>thmr.yunmoan.cn</div>
        <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
          {PLATFORMS.map((p) => (
            <span key={p} style={{ padding: "6px 26px", borderRadius: 30, border: `2px solid ${theme.accent}`, fontSize: 30, fontWeight: 800, color: theme.nightInk }}>{p}</span>
          ))}
        </div>
        <div style={{ marginTop: 26, fontSize: 34, color: theme.mutedOnNight, letterSpacing: 2 }}>
          QQ 交流群 <span style={{ color: theme.nightInk, fontWeight: 900, letterSpacing: 4 }}>1094578162</span>　·　免费 · 24 小时放送
        </div>
      </div>
      <div style={{ position: "absolute", left: 1340, top: 150, textAlign: "center", ...row(0.45) }}>
        <Qr size={330} />
        <div style={{ marginTop: 14, fontSize: 28, letterSpacing: 8, color: theme.mutedOnNight }}>扫码收听</div>
      </div>
      <div style={{ position: "absolute", left: 150, right: 600, bottom: 48, fontSize: 21, lineHeight: 1.7, color: theme.mutedOnNight, opacity: 0.82 * clamp(u(0.9)) }}>
        本片配乐均录自 THMR 直播流：{AF.title} — {AF.artist} ／ {BA.title} — {BA.artist}
        <br />
        东方Project 原作：上海爱丽丝幻乐团 · 本片为非商业同人宣传片 · 音乐与封面版权归各自作者所有 · 第 <Egg n={9} /> 版
      </div>
    </AbsoluteFill>
  );
};

export const S6Outro: React.FC = () => {
  const t = useT();
  const frame = Math.round(t * FPS);
  const since = t - T6;
  const egg = lineById("s6_cirno");
  const cirnoIn = backOut(prog(t, egg.t0 - 0.15, 0.4));
  return (
    <AbsoluteFill style={{ background: "#07050a" }}>
      <AbsoluteFill style={{ transform: `scale(${lerp(1.3, 1.16, easeOut5(prog(since, 0, 8)))})`, transformOrigin: "78% 62%" }}>
        <Img src={staticFile("img/bg_outside_night.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 62%" }} />
        <div
          style={{
            position: "absolute", left: "63%", top: "50%", width: "30%", height: "34%", mixBlendMode: "screen",
            background: "radial-gradient(closest-side, rgba(255,150,120,0.6), rgba(255,150,120,0))", opacity: 0.55 + 0.3 * Math.abs(Math.sin(t * (Math.PI * BA.bpm) / 60)),
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#05030a", opacity: 0.34 }} />
      <Vignette strength={0.8} />
      <div style={{ position: "absolute", left: 96, top: 84, fontFamily: SERIF, color: theme.accentSoft, opacity: clamp((since - 0.6) / 0.6) * (1 - prog(t, T_CARD - 0.4, 0.4)) }}>
        <div style={{ fontSize: 26, letterSpacing: 10, fontWeight: 900 }}>● ON AIR</div>
        <div style={{ fontSize: 54, fontWeight: 900, letterSpacing: 6, color: "#ffe9d6", textShadow: "0 0 26px rgba(255,170,100,0.55)" }}>THMR</div>
      </div>
      <StaticOverlay opacity={0.3 * Math.exp(-since * 1.2) + 0.03} frame={frame} />
      <Scanlines opacity={0.16} />
      <Dialogue t={t} skip={["s6_cirno"]} />

      {t >= T_CARD - 0.1 && <EndCard t={t} t0={T_CARD} />}
      {/* post-credits: the strongest fairy has been counting */}
      {t >= egg.t0 - 0.2 && (
        <>
          <Sprite who="cirno" expr="proud" x={1690} y={330 + (1 - cirnoIn) * 700 - Math.sin(Math.PI * clamp((t - egg.t0) / 0.34)) * 30} h={860} glow={`${CAST.cirno.color}88`} />
          <Bubble line={egg} t={t} x={1010} y={600} w={540} />
        </>
      )}
      <Flash opacity={Math.exp(-since * 3.5)} />
      <Flash opacity={prog(t, T_END - 0.7, 0.6)} color="#000" />
    </AbsoluteFill>
  );
};
