import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { FPS, T1, T2, T3, T4, T5, T6, TITLE_HITS } from "./timeline";
import { easeOut, prog, TimeCtx } from "./lib/anim";
import { theme } from "./theme";
import { NowPlaying } from "./components/NowPlaying";
import { BeatStrip } from "./components/Beat";
import { S0Intro } from "./scenes/S0Intro";
import { S1Shrine } from "./scenes/S1Shrine";
import { S2Tour } from "./scenes/S2Tour";
import { S3News } from "./scenes/S3News";
import { S4Devices } from "./scenes/S4Devices";
import { S5Climax } from "./scenes/S5Climax";
import { S6Outro } from "./scenes/S6Outro";

/**
 * 《与幻想乡同频》— the whole film. Scenes read absolute film time from TimeCtx
 * (see src/timeline.ts for every cut point); the soundtrack is one pre-mixed
 * file built by `npm run audio`.
 */
export const Promo: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  // S0 → S1: the barrier opens as an expanding circle
  const wipe = easeOut(prog(t, T1 - 0.05, 0.65));
  return (
    <TimeCtx.Provider value={t}>
      <AbsoluteFill style={{ background: theme.night, overflow: "hidden" }}>
        {t < T1 + 0.65 && <S0Intro />}
        {t >= T1 - 0.05 && t < T2 && (
          <AbsoluteFill style={{ clipPath: wipe < 1 ? `circle(${wipe * 1250}px at 960px 540px)` : undefined }}>
            <S1Shrine />
          </AbsoluteFill>
        )}
        {t >= T1 - 0.05 && wipe < 1 && (
          <div
            style={{
              position: "absolute", left: 960 - wipe * 1250, top: 540 - wipe * 1250, width: wipe * 2500, height: wipe * 2500, borderRadius: "50%",
              border: `${14 * (1 - wipe) + 3}px solid #ffd9e0`, boxSizing: "border-box", boxShadow: "0 0 60px #ff9fb2, inset 0 0 60px #ff9fb2", opacity: 1 - wipe * wipe,
            }}
          />
        )}
        {t >= T2 && t < T3 && <S2Tour />}
        {t >= T3 && t < T4 && <S3News />}
        {t >= T4 && t < T5 && <S4Devices />}
        {t >= T5 && t < T6 && <S5Climax />}
        {t >= T6 && <S6Outro />}
        <BeatStrip t={t} />
        {(t < TITLE_HITS[0] || t >= T6) && <NowPlaying t={t} />}
      </AbsoluteFill>
      <Audio src={staticFile("audio/soundtrack.wav")} />
    </TimeCtx.Provider>
  );
};
