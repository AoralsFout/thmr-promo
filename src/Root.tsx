import React from "react";
import { AbsoluteFill, Composition, Img, staticFile } from "remotion";
import { FPS, TOTAL_FRAMES, WARNING_FRAMES } from "./timeline";
import { TimeCtx } from "./lib/anim";
import { SERIF, theme } from "./theme";
import { Promo } from "./Promo";
import { Lineup, TitleLockup } from "./scenes/S5Climax";
import { Petals, Rings } from "./components/Fx";
import { PhotosensitivityWarning } from "./scenes/PhotosensitivityWarning";

/** Cover / thumbnail still (1920×1080). */
const Cover: React.FC = () => (
  <TimeCtx.Provider value={100}>
    <AbsoluteFill style={{ background: theme.night, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: "scale(1.08)" }}>
        <Img src={staticFile("img/bg_gensokyo_night.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(22,13,16,0.3) 0%, rgba(22,13,16,0) 40%, rgba(22,13,16,0.8) 100%)" }} />
      <Rings t={1.1} cx={960} cy={300} color="#ffb7c5" count={4} period={2} max={1500} width={3} opacity={0.5} />
      <Petals t={3.3} count={34} />
      <Lineup t={100} t0={0} baseY={300} h={860} />
      <TitleLockup t={100} y={120} size={250} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 432, display: "flex", justifyContent: "center", alignItems: "center", gap: 26, fontFamily: SERIF, color: "#fffafb" }}>
        <Img src={staticFile("brand/logo.png")} style={{ width: 96, height: 96 }} />
        <span style={{ fontSize: 70, fontWeight: 900, letterSpacing: 10, textShadow: "0 6px 24px rgba(0,0,0,0.7)" }}>东方音乐电台 THMR</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, textAlign: "center", fontFamily: SERIF }}>
        <span style={{ padding: "8px 50px", borderRadius: 50, background: "#fffafb", color: theme.accentDeep, fontSize: 56, fontWeight: 900, letterSpacing: 3, boxShadow: "0 12px 40px rgba(0,0,0,0.55)" }}>
          thmr.yunmoan.cn · 免费 · 24 小时放送
        </span>
      </div>
    </AbsoluteFill>
  </TimeCtx.Provider>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="PhotosensitivityWarning" component={PhotosensitivityWarning} durationInFrames={WARNING_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Cover" component={Cover} durationInFrames={1} fps={FPS} width={1920} height={1080} />
  </>
);
