// S0 序 · 杂讯 — the outside world, a radio, a frequency that is not on any map.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { CAST, FPS, T_LOCK } from "../timeline";
import { backOut, clamp, easeInOut, easeOut, hash, lerp, prog, useT } from "../lib/anim";
import { SERIF, theme } from "../theme";
import { Dialogue } from "../components/Dialogue";
import { Egg, Flash, Rings, Scanlines, StaticOverlay, Vignette } from "../components/Fx";
import { Sprite } from "../components/Sprite";

// needle path across the band: [time, position 0..1]
const NEEDLE: [number, number][] = [
  [0, 0.08], [1.2, 0.1], [1.9, 0.27], [3.2, 0.29], [4.2, 0.31], [4.9, 0.52], [6.6, 0.5], [7.3, 0.4], [8.6, 0.42], [9.3, 0.44], [10.2, 0.8], [T_LOCK, 0.86],
];
const needleAt = (t: number) => {
  for (let i = 1; i < NEEDLE.length; i++) {
    if (t <= NEEDLE[i][0]) {
      const [t0, a] = NEEDLE[i - 1];
      const [t1, b] = NEEDLE[i];
      return lerp(a, b, easeInOut(clamp((t - t0) / (t1 - t0))));
    }
  }
  return NEEDLE[NEEDLE.length - 1][1];
};
/** how much static is on screen (dips whenever a broadcast leaks through) */
const staticLevel = (t: number) => {
  if (t >= T_LOCK) return Math.max(0, 0.5 - (t - T_LOCK) * 4);
  let v = 0.55 * clamp(t / 0.7);
  for (const d of [1.42, 4.42, 7.12, 9.5]) if (t > d && t < d + 0.95) v *= 0.45;
  return v + 0.35 * prog(t, T_LOCK - 0.8, 0.8);
};

const BAND_W = 1240;
const LO = 76;
const HI = 108;

export const S0Intro: React.FC = () => {
  const t = useT();
  const frame = Math.round(t * FPS);
  const locked = t >= T_LOCK;
  const sinceLock = t - T_LOCK;
  const pos = needleAt(t) + (locked ? 0 : (hash(frame) - 0.5) * 0.004);
  const freq = LO + pos * (HI - LO);
  const lit = clamp(t / 2.6);
  const idIn = prog(t, T_LOCK + 0.05, 0.5);

  return (
    <AbsoluteFill style={{ background: "#07050a" }}>
      {/* the room */}
      <AbsoluteFill style={{ transform: `scale(${lerp(1.06, 1.24, easeInOut(prog(t, 0, T_LOCK)))})`, transformOrigin: "78% 62%", filter: locked ? `blur(${14 * easeOut(idIn)}px) brightness(${1 - 0.45 * idIn})` : undefined }}>
        <Img src={staticFile("img/bg_outside_night.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 62%" }} />
        {/* dial glow breathing with the signal */}
        <div
          style={{
            position: "absolute", left: "63%", top: "50%", width: "30%", height: "34%",
            background: "radial-gradient(closest-side, rgba(255,176,96,0.5), rgba(255,176,96,0))",
            opacity: 0.35 + 0.4 * Math.abs(Math.sin(t * 3.1)) * (1 - staticLevel(t)) + (locked ? 0.4 : 0), mixBlendMode: "screen",
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#05030a", opacity: 1 - 0.62 * lit }} />
      <Vignette strength={0.8} />

      {/* caption */}
      <div style={{ position: "absolute", left: 96, top: 84, fontFamily: SERIF, color: theme.mutedOnNight, fontSize: 30, letterSpacing: 8, opacity: clamp((t - 0.5) / 0.8) * (1 - prog(t, T_LOCK - 0.6, 0.4)) }}>
        外界 · 某个深夜
        <div style={{ fontSize: 20, letterSpacing: 5, marginTop: 8, opacity: 0.7 }}>SOMEWHERE OUTSIDE THE BARRIER</div>
      </div>

      {/* frequency band */}
      <div style={{ position: "absolute", left: (1920 - BAND_W) / 2, top: 250, width: BAND_W, opacity: clamp((t - 0.4) / 0.8) * (1 - prog(t, T_LOCK + 0.25, 0.3)), fontFamily: SERIF }}>
        <div style={{ position: "relative", height: 96, borderTop: "2px solid rgba(255,236,224,0.5)", borderBottom: "2px solid rgba(255,236,224,0.5)", background: "rgba(10,6,8,0.5)" }}>
          {Array.from({ length: (HI - LO) * 2 + 1 }, (_, i) => {
            const major = i % 8 === 0;
            const v = LO + i / 2;
            return (
              <div key={i} style={{ position: "absolute", left: (i / ((HI - LO) * 2)) * BAND_W, top: 0 }}>
                <div style={{ width: 2, height: major ? 34 : i % 2 === 0 ? 22 : 12, background: "rgba(255,236,224,0.75)" }} />
                {major && (
                  <div style={{ position: "absolute", top: 44, left: -30, width: 60, textAlign: "center", fontSize: 26, color: "rgba(255,236,224,0.85)", fontWeight: 600 }}>
                    {v === 100 ? <Egg n={1} style={{ opacity: 0.85 }} /> : v}
                  </div>
                )}
              </div>
            );
          })}
          {/* the frequency that is not on the map */}
          <div style={{ position: "absolute", left: 0.86 * BAND_W - 3, top: -14, width: 6, height: 124, background: theme.accent, opacity: locked ? 1 : 0.0, boxShadow: `0 0 24px ${theme.accent}` }} />
          {/* needle */}
          <div style={{ position: "absolute", left: pos * BAND_W - 2, top: -22, width: 4, height: 140, background: locked ? theme.accent : "#ffcf8a", boxShadow: `0 0 18px ${locked ? theme.accent : "#ffb060"}` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 26, color: "#ffe9d6" }}>
          <div style={{ fontSize: 26, letterSpacing: 8, opacity: 0.7 }}>FM</div>
          <div style={{ fontSize: 74, fontWeight: 900, fontVariantNumeric: "tabular-nums", letterSpacing: 4, textShadow: "0 0 26px rgba(255,170,100,0.55)" }}>
            {locked ? "??.?" : freq.toFixed(1)} <span style={{ fontSize: 34, fontWeight: 600 }}>MHz</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 40 }}>
            {[0, 1, 2, 3, 4].map((i) => {
              const sig = clamp(1 - staticLevel(t) * 1.6 + (hash(frame + i) - 0.5) * 0.2);
              return <div key={i} style={{ width: 12, height: 10 + i * 7, background: i / 5 < sig ? "#ffcf8a" : "rgba(255,236,224,0.2)" }} />;
            })}
          </div>
        </div>
      </div>

      <StaticOverlay opacity={staticLevel(t) * 0.55} frame={frame} />
      <Scanlines opacity={0.22 * (1 - idIn * 0.6)} />

      {/* station ident */}
      {locked && (
        <AbsoluteFill>
          <Rings t={sinceLock} cx={225} cy={380} color={theme.accentSoft} count={4} period={2.2} max={1100} opacity={0.5 * idIn} />
          <div style={{ position: "absolute", left: 130, top: 270, width: 1060, fontFamily: SERIF, color: theme.nightInk, whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 34, transform: `scale(${lerp(1.5, 1, easeOut(idIn))})`, transformOrigin: "0% 50%", opacity: clamp(idIn * 2) }}>
              <Img src={staticFile("brand/logo.png")} style={{ width: 190, height: 190, filter: "drop-shadow(0 0 40px rgba(198,90,105,0.7))" }} />
              <div>
                <div style={{ fontSize: 26, letterSpacing: 12, color: theme.accentSoft, fontWeight: 700 }}>信号锁定 · SIGNAL LOCKED</div>
                <div style={{ fontSize: 124, fontWeight: 900, letterSpacing: 6, lineHeight: 1.15, textShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>东方音乐电台</div>
              </div>
            </div>
            <div style={{ marginTop: 22, marginLeft: 224, fontSize: 34, letterSpacing: 12, color: theme.mutedOnNight, opacity: prog(t, T_LOCK + 0.7, 0.5) }}>
              TOUHOU MUSIC RADIO <span style={{ color: theme.accentSoft, fontWeight: 900 }}>THMR</span>
            </div>
          </div>
          <Sprite who="sanae" expr="cheer" x={1570 + (1 - backOut(prog(t, T_LOCK + 0.2, 0.5))) * 700} y={170 - Math.sin(Math.PI * clamp((t - T_LOCK - 0.35) / 0.34)) * 40} h={1220} glow={`${CAST.sanae.color}66`} />
        </AbsoluteFill>
      )}

      <Dialogue t={t} />
      <Flash opacity={locked ? Math.exp(-sinceLock * 5) * 0.95 : prog(t, T_LOCK - 0.12, 0.12) * 0.5} color="#ffe6ec" />
    </AbsoluteFill>
  );
};
