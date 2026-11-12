// S3 号外 — the spinning-newspaper gag with the station's real numbers.
// v2: four bars. The paper lands on the downbeat, the three numbers slam in on
// beats 4 / 6 / 8 with the camera punching in on each, then it pulls back while
// the five platform chips rattle off on eighth notes.
import React from "react";
import { AbsoluteFill } from "remotion";
import { LINES, NEWS_CHIPS, NEWS_HITS, pulse, T3, T4 } from "../timeline";
import { backOut, easeIn, easeOut5, lerp, prog, useT } from "../lib/anim";
import { SERIF, theme } from "../theme";
import { Cam, camAt, CamKey, punch, shake } from "../components/Beat";
import { Dialogue } from "../components/Dialogue";
import { Egg, Flash } from "../components/Fx";
import { perform, Sprite } from "../components/Sprite";
import { Cover, TRACKS } from "../components/Ui";

const SCENE_LINES = LINES.filter((l) => l.id.startsWith("s3_"));
/** Library size reported by the station API while this film was being made. */
const LIBRARY = 130854;
const INK = "#24161a";
const W = 1250;
const CHIP_NAMES = ["网页", "Windows", "macOS", "Linux", "Android"];

// camera: full page → punch in on each number → back out for the platforms
const T_BACK = NEWS_CHIPS[0] - 0.08;
const CAM: CamKey[] = [
  { t: T3, x: 960, y: 540, z: 1.0 },
  { t: NEWS_HITS[0] - 0.07, x: 470, y: 455, z: 1.62, dur: 0.22 },
  { t: NEWS_HITS[1] - 0.07, x: 820, y: 455, z: 1.62, dur: 0.22 },
  { t: NEWS_HITS[2] - 0.07, x: 1110, y: 455, z: 1.62, dur: 0.22 },
  { t: T_BACK, x: 960, y: 540, z: 1.0, dur: 0.45 },
];

const Stat: React.FC<{ t: number; t0: number; big: React.ReactNode; unit: string; label: string; w: number }> = ({ t, t0, big, unit, label, w }) => {
  const u = prog(t, t0, 0.16);
  const on = t >= t0;
  return (
    <div style={{ width: w, borderTop: `6px solid ${INK}`, paddingTop: 14, opacity: on ? 1 : 0.1 }}>
      <div style={{ transform: `scale(${on ? lerp(2.8, 1, easeOut5(u)) * (1 + 0.035 * pulse(t, 6)) : 1})`, transformOrigin: "30% 60%" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, color: theme.accentDeep, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 110, fontWeight: 900, lineHeight: 1, letterSpacing: -2, fontVariantNumeric: "tabular-nums" }}>{big}</span>
          <span style={{ fontSize: 44, fontWeight: 900 }}>{unit}</span>
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, color: INK, marginTop: 4, letterSpacing: 2 }}>{label}</div>
      </div>
    </div>
  );
};

export const S3News: React.FC = () => {
  const t = useT();
  const spin = easeOut5(prog(t, T3 - 0.22, 0.42));
  const sanae = perform("sanae", t, SCENE_LINES, "cheer");
  const count = Math.round(LIBRARY * easeOut5(prog(t, NEWS_HITS[0], 0.55)));
  const cam = camAt(t, CAM);
  const [kx, ky] = shake(t, [T3, ...NEWS_HITS], 20, 10);
  const bump = 0.03 * punch(t, [...NEWS_HITS, ...NEWS_CHIPS], 10);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: theme.paper }}>
      <Cam cam={cam} extraZ={bump + 0.02 * prog(t, T3, T4 - T3)} dx={kx} dy={ky}>
        <div style={{ position: "absolute", left: -500, top: -400, width: 2920, height: 1880, background: `radial-gradient(70% 70% at 50% 45%, #fff8f9 0%, ${theme.paper} 55%, #f1dfe3 100%)` }} />
        <div style={{ position: "absolute", left: -500, top: -400, width: 2920, height: 1880, backgroundImage: "radial-gradient(rgba(84,34,46,0.07) 1.4px, transparent 1.4px)", backgroundSize: "22px 22px" }} />
        <div
          style={{
            position: "absolute", left: 56, top: 28, width: W, height: 784, background: "#fffdfb", boxShadow: "0 40px 90px rgba(60,20,30,0.35)", fontFamily: SERIF, color: INK,
            transform: `scale(${lerp(0.05, 1, spin)}) rotate(${lerp(-900, -1.6, spin)}deg)`, transformOrigin: "50% 50%", padding: "28px 50px", boxSizing: "border-box",
          }}
        >
          {/* masthead */}
          <div style={{ display: "flex", alignItems: "flex-end", borderBottom: `10px double ${INK}`, paddingBottom: 12 }}>
            <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.3, width: 210 }}>幻想乡放送局<br />特别发行</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: 136, fontWeight: 900, letterSpacing: 60, lineHeight: 1, paddingLeft: 60 }}>号外</div>
            <div style={{ fontSize: 24, fontWeight: 700, textAlign: "right", lineHeight: 1.4, width: 210 }}>全天候 · 不休刊<br />thmr.yunmoan.cn</div>
          </div>
          <div style={{ fontSize: 58, fontWeight: 900, letterSpacing: 4, marginTop: 16, whiteSpace: "nowrap" }}>
            东方音乐电台 <span style={{ color: theme.accentDeep }}>THMR</span> 正在放送中！
          </div>
          <div style={{ display: "flex", gap: 34, marginTop: 20 }}>
            <Stat t={t} t0={NEWS_HITS[0]} big={count.toLocaleString("en-US")} unit="首" label="东方同人曲库" w={520} />
            <Stat t={t} t0={NEWS_HITS[1]} big="24" unit="小时" label="不间断放送" w={300} />
            <Stat t={t} t0={NEWS_HITS[2]} big="5" unit="端" label="全平台覆盖" w={260} />
          </div>
          {/* "photo" strip: covers that really aired, bouncing along */}
          <div style={{ display: "flex", gap: 12, marginTop: 22, filter: "sepia(0.35) saturate(0.85)" }}>
            {Array.from({ length: 10 }, (_, i) => (
              <Cover key={i} id={TRACKS[(i * 11 + 5) % TRACKS.length].id} size={104} radius={2} style={{ boxShadow: "none", border: `2px solid ${INK}`, transform: `translateY(${-10 * pulse(t - i * 0.03, 5)}px)` }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 16, fontSize: 24, color: "#5a444a", lineHeight: 1.5 }}>
            <div style={{ flex: 1, borderTop: `2px solid ${INK}`, paddingTop: 8 }}>
              {CHIP_NAMES.map((p, i) => {
                const on = t >= NEWS_CHIPS[i];
                return (
                  <span key={p} style={{ display: "inline-block", marginRight: 10, marginTop: 6, padding: "2px 16px", border: `2.5px solid ${INK}`, borderRadius: 30, fontWeight: 900, fontSize: 26, color: on ? "#fffdfb" : INK, background: on ? INK : "transparent", opacity: on ? 1 : 0.15, transform: `scale(${on ? backOut(prog(t, NEWS_CHIPS[i], 0.16)) : 1})` }}>{p}</span>
                );
              })}
            </div>
            <div style={{ width: 270, border: `2.5px solid ${INK}`, padding: "6px 14px", fontSize: 21, textAlign: "center", fontWeight: 700 }}>
              【广告】<Egg n={6} /> 算术教室 · 招生中
              <br />
              博丽神社 · 诚征香火
            </div>
          </div>
          {/* red seal */}
          <div
            style={{
              position: "absolute", right: 44, top: 172, width: 150, height: 150, borderRadius: 16, border: `9px solid ${theme.accentDeep}`, color: theme.accentDeep,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54, fontWeight: 900, lineHeight: 1.05, textAlign: "center", opacity: 0.86,
              transform: `rotate(12deg) scale(${t >= T3 + 0.4 ? lerp(3, 1, easeOut5(prog(t, T3 + 0.4, 0.16))) : 0})`, boxSizing: "border-box", mixBlendMode: "multiply",
            }}
          >
            免费<br />收听
          </div>
        </div>
        <Sprite who="sanae" expr={sanae.expr} x={1650 + (1 - backOut(prog(t, T3 + 0.05, 0.32))) * 600} y={250 + sanae.dy} h={1060} scale={sanae.scale} />
      </Cam>
      <Dialogue t={t} bottom={50} />
      <Flash opacity={Math.exp(-(t - T3) * 7) * 0.7} color="#fbf2f4" />
      <Flash opacity={easeIn(prog(t, T4 - 0.2, 0.2))} color={theme.night} />
    </AbsoluteFill>
  );
};
