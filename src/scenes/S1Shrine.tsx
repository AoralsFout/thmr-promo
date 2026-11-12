// S1 神社的午后 — a visual-novel skit, until the danmaku give the game away:
// the whole thing is a stream, and "the listeners on the other side" are watching.
// The camera cuts in on whoever is speaking; every gag lands on an AF beat.
import React, { useMemo } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { AF_BEAT, DANMAKU_TEXT, FPS, LINES, STAT_HITS, T1, T2, T_AF_STOP, T_END, lineById, pulse } from "../timeline";
import { backOut, clamp, easeIn, easeInOut, easeOut, hash, lerp, prog, useT } from "../lib/anim";
import { DANMAKU_FONT, SERIF, theme } from "../theme";
import { Cam, camAt, CamKey, punch, shake } from "../components/Beat";
import { Dialogue } from "../components/Dialogue";
import { Danmaku, makeDanmaku, Shot } from "../components/Danmaku";
import { Badge, Egg, Emote, Flash, Petals, SpeedLines } from "../components/Fx";
import { perform, Sprite } from "../components/Sprite";

const L = (id: string) => lineById(id);
const B = AF_BEAT;
const SCENE_LINES = LINES.filter((l) => l.id.startsWith("s1_"));
const tSigh = L("s1_reimu_1").t0;
const tMarisa = L("s1_marisa_1").t0;
const tWave = L("s1_reimu_2").t0;
const tSanae = L("s1_sanae_1").t0;
const tStats = L("s1_marisa_2").t0;
const tGreedy = L("s1_reimu_3").t0;
const tWhat = L("s1_reimu_4").t0;
const tReveal = L("s1_marisa_3").t0;
const tGo = L("s1_sanae_2").t0;
const tBox = tSigh + 3 * B;

// Camera: stage coordinates of where we look and how tight (cut-ins per line).
const CAM: CamKey[] = [
  { t: T1, x: 900, y: 520, z: 1.1 },
  { t: T1 + 0.05, x: 760, y: 500, z: 1.03, dur: 1.4 }, // settle on the sighing shrine maiden
  { t: tBox - 0.1, x: 1080, y: 470, z: 1.1, dur: 0.5 }, // …and her empty box
  { t: tMarisa - 0.1, x: 1130, y: 490, z: 1.05, dur: 0.3 }, // Marisa crashes in
  { t: tWave - 0.05, x: 520, y: 430, z: 1.2, dur: 0.35 }, // close on Reimu's "?"
  { t: tSanae - 0.05, x: 960, y: 430, z: 1.16, dur: 0.35 },
  { t: tStats - 0.05, x: 960, y: 520, z: 1.0, dur: 0.4 }, // wide for the three stamps
  { t: tGreedy - 0.05, x: 500, y: 420, z: 1.22, dur: 0.35 }, // greedy eyes
  { t: tWhat - 0.05, x: 860, y: 520, z: 1.04, dur: 0.3 },
  { t: tReveal - 0.12, x: 960, y: 540, z: 1.0, dur: 0.5 },
  { t: tGo, x: 960, y: 500, z: 1.0, dur: 0.3 },
];
const HITS = [tMarisa, ...STAT_HITS, tWhat];

export const S1Shrine: React.FC = () => {
  const t = useT();
  const frame = Math.round(t * FPS);

  const shots: Shot[] = useMemo(() => {
    const s = makeDanmaku({
      texts: DANMAKU_TEXT, t0: tGreedy + 2 * B, t1: T2 + 0.2, lanes: 9, seed: 3,
      rate: (x) => (x < tWhat - 0.4 ? 1.2 : x < tReveal ? 5 : 7),
    });
    // egg #2 rides along with the crowd
    s.push({ text: <Egg n={2} />, len: 1, t: tWhat + 1.1, lane: 4, color: "#7ec9ff", size: 52, speed: 430 });
    return s;
  }, []);

  // pull back to reveal the "player", then punch back in for the hand-off
  const k = easeInOut(prog(t, tReveal - 0.12, 0.6)) * (1 - easeIn(prog(t, tGo + 0.1, 0.4)));
  const SC = 1 - 0.25 * k;
  const goZoom = easeIn(prog(t, tGo + 0.2, T2 - tGo - 0.2));
  const zoom = 0.45 * goZoom; // extra scale, applied about the frame centre

  const cam = camAt(t, CAM);
  const drift = 0.018 * Math.sin((t - T1) * 0.5); // the camera never sits perfectly still
  const [sx, sy] = shake(t, [tMarisa, tWhat], 18);
  const bump = 0.022 * punch(t, HITS, 8) + 0.004 * pulse(t, 6);

  const reimu = perform("reimu", t, SCENE_LINES, "bored");
  const marisa = perform("marisa", t, SCENE_LINES, "laugh");
  const sanae = perform("sanae", t, SCENE_LINES, "wink");
  const marisaIn = backOut(prog(t, tMarisa - 0.12, 0.38));
  const sanaeIn = backOut(prog(t, tSanae - 0.08, 0.36));
  const reimuX = lerp(lerp(640, 420, easeOut(prog(t, tMarisa - 0.1, 0.35))), 350, easeOut(prog(t, tSanae - 0.1, 0.35)));
  const marisaX = lerp(1500, 1570, easeOut(prog(t, tSanae - 0.1, 0.35))) + (1 - marisaIn) * 900;
  const light = (p: { speaking: boolean }) => (p.speaking ? 1 : 0.8);
  const boxIn = backOut(prog(t, tBox, 0.3));
  const boxOut = easeIn(prog(t, tMarisa - 0.1, 0.28));

  return (
    <AbsoluteFill style={{ background: theme.night }}>
      {/* ── player chrome (only visible once we pull back) ── */}
      <AbsoluteFill style={{ opacity: clamp(k * 1.6), fontFamily: SERIF, color: theme.nightInk }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(90% 90% at 20% 0%, #2a151b 0%, ${theme.night} 70%)` }} />
        <div style={{ position: "absolute", left: 70, top: 34, display: "flex", alignItems: "center", gap: 18 }}>
          <Img src={staticFile("brand/logo.png")} style={{ width: 54, height: 54 }} />
          <div style={{ fontSize: 34, fontWeight: 900 }}>【幻想乡放送局】神社的午后</div>
          <div style={{ marginLeft: 14, padding: "4px 16px", borderRadius: 8, background: "#e0364f", fontSize: 22, fontWeight: 900, letterSpacing: 3, transform: `scale(${1 + 0.12 * pulse(t, 5)})` }}>● LIVE</div>
        </div>
        <div style={{ position: "absolute", left: 1556, top: 156, width: 320, height: 764, borderRadius: 16, border: `1.5px solid ${theme.borderOnNight}`, background: theme.panelOnNight, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", fontSize: 24, fontWeight: 900, borderBottom: `1.5px solid ${theme.borderOnNight}` }}>弹幕列表</div>
          {shots.filter((s) => s.t <= t && typeof s.text === "string").slice(-14).map((s, i) => (
            <div key={i} style={{ padding: "9px 20px", fontSize: 21, fontFamily: DANMAKU_FONT, color: theme.mutedOnNight, display: "flex", gap: 14, whiteSpace: "nowrap" }}>
              <span style={{ opacity: 0.55, fontVariantNumeric: "tabular-nums" }}>00:{String(Math.floor(s.t)).padStart(2, "0")}</span>
              <span style={{ color: theme.nightInk, overflow: "hidden", textOverflow: "ellipsis" }}>{s.text}</span>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 70, top: 940, width: 1440, height: 64, display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 0, height: 0, borderLeft: "24px solid #f8edf0", borderTop: "15px solid transparent", borderBottom: "15px solid transparent" }} />
          <div style={{ flex: 1, height: 8, borderRadius: 8, background: "rgba(255,255,255,0.16)" }}>
            <div style={{ width: `${(t / T_END) * 100}%`, height: "100%", borderRadius: 8, background: theme.accent }} />
          </div>
          <div style={{ fontSize: 22, color: theme.mutedOnNight, fontVariantNumeric: "tabular-nums" }}>
            00:{String(Math.floor(t)).padStart(2, "0")} / {String(Math.floor(T_END / 60)).padStart(2, "0")}:{String(Math.floor(T_END % 60)).padStart(2, "0")}
          </div>
          <div style={{ padding: "6px 18px", borderRadius: 20, border: `1.5px solid ${theme.accent}`, color: theme.accentSoft, fontSize: 21, fontWeight: 900 }}>弹幕 ON</div>
        </div>
        <div style={{ position: "absolute", left: 70, top: 1014, width: 1440, fontSize: 21, color: theme.mutedOnNight, opacity: 0.8 }}>发条弹幕，和幻想乡同频 ▏</div>
      </AbsoluteFill>

      {/* ── the "video" ── */}
      <div
        style={{
          position: "absolute", left: 0, top: 0, width: 1920, height: 1080, overflow: "hidden", transformOrigin: "0 0",
          transform: `translate(${70 * k - 960 * zoom}px, ${110 * k - 500 * zoom}px) scale(${SC + zoom})`,
          borderRadius: 26 * k, boxShadow: k > 0.01 ? "0 30px 80px rgba(0,0,0,0.6)" : undefined,
        }}
      >
        {/* stage: everything in the world moves with the camera */}
        <Cam cam={cam} extraZ={drift + bump} dx={sx} dy={sy}>
          <div style={{ position: "absolute", left: -330, top: -190, width: 2580, height: 1460 }}>
            <Img src={staticFile("img/bg_shrine_day.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(255,246,236,0.12) 0%, rgba(255,240,236,0.0) 45%, rgba(60,20,30,0.28) 100%)" }} />
          <Petals t={t} count={22} />

          {t >= tSanae - 0.1 && (
            <Sprite who="sanae" expr={sanae.expr} x={960} y={(sanae.speaking ? 190 : 240) + (1 - sanaeIn) * 900 + sanae.dy} h={1150} light={light(sanae)} scale={sanae.scale * (sanae.speaking ? 1.05 : 0.97)} z={sanae.speaking ? 3 : 1} />
          )}
          <Sprite who="reimu" expr={reimu.expr} x={reimuX} y={170 + reimu.dy} h={1240} light={light(reimu)} scale={reimu.scale * (reimu.speaking ? 1 : 0.97)} z={2} />
          {t >= tMarisa - 0.15 && (
            <Sprite who="marisa" expr={marisa.expr} x={marisaX} y={200 + marisa.dy} h={1150} light={light(marisa)} scale={marisa.scale * (marisa.speaking ? 1 : 0.97)} rot={(1 - marisaIn) * 8} z={2} />
          )}

          <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
            {/* the empty offering box */}
            {t >= tBox && boxOut < 1 && (
              <div
                style={{
                  position: "absolute", left: 1090 + boxOut * 1000, top: 150 - boxOut * 300, width: 620, padding: "22px 22px 18px", background: "#fffaf6", borderRadius: 8,
                  transform: `rotate(${5 + boxOut * 40 + Math.sin(t * 2.2) * 1.2}deg) scale(${boxIn})`, boxShadow: "0 24px 60px rgba(40,10,18,0.45)", fontFamily: SERIF,
                }}
              >
                <Img src={staticFile("img/bg_offering_box.png")} style={{ width: "100%", height: 384, objectFit: "cover", borderRadius: 4, display: "block" }} />
                <div style={{ position: "absolute", left: 22, top: 22, right: 22, height: 384, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 240, fontWeight: 900, color: "rgba(255,255,255,0.3)", transform: `scale(${1 + 0.06 * pulse(t, 5)})` }}>空</div>
                <div style={{ marginTop: 14, fontSize: 32, fontWeight: 900, color: theme.paperInk, display: "flex", justifyContent: "space-between" }}>
                  <span>赛钱箱 · 本日进账 <span style={{ color: theme.accentDeep }}>0</span> 円</span>
                  <span style={{ fontSize: 22, color: theme.mutedOnPaper, alignSelf: "center" }}>累计 <Egg n={3} /> 円</span>
                </div>
              </div>
            )}
            <Emote t={t} t0={tSigh + 0.3} x={reimuX + 250} y={170} text="…" dur={1.5} color="#6f5960" />

            {/* Marisa bursts in */}
            <SpeedLines opacity={Math.exp(-Math.max(0, t - tMarisa) * 3.5) * (t >= tMarisa - 0.1 ? 0.75 : 0)} cx={72} cy={42} frame={frame} />
            <Badge t={t} t0={tMarisa + 0.08} until={tWave - 0.12} x={700} y={120} rot={-7} bg="#ffd23e" fg="#2a161b" size={96}>大新闻！！</Badge>
            <Emote t={t} t0={tMarisa + B} x={reimuX + 240} y={170} text="!" dur={1.1} />
            <Emote t={t} t0={tWave + 0.1} x={reimuX + 250} y={170} text="?" color="#4e7fb0" dur={1.5} />

            {/* 常识 gets crossed out */}
            {t >= tSanae + B && t < tStats && (
              <div style={{ position: "absolute", left: 1120, top: 90, transform: `rotate(-6deg) scale(${backOut(prog(t, tSanae + B, 0.25)) * (1 - prog(t, tStats - 0.15, 0.15))})`, fontFamily: SERIF }}>
                <div style={{ padding: "8px 44px", background: "#fffafb", border: "5px solid #2a161b", borderRadius: 12, fontSize: 96, fontWeight: 900, color: "#2a161b", letterSpacing: 10 }}>常识</div>
                {t >= tSanae + 2 * B && (
                  <div style={{ position: "absolute", inset: -30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 250, fontWeight: 900, color: theme.accentDeep, lineHeight: 1, transform: `scale(${lerp(2.2, 1, easeOut(prog(t, tSanae + 2 * B, 0.14)))}) rotate(8deg)`, opacity: 0.92 }}>✕</div>
                )}
              </div>
            )}

            {/* the three selling points, one per beat-pair */}
            <Badge t={t} t0={STAT_HITS[0]} until={tGreedy - 0.2} x={560} y={70} rot={-5} size={74}>130,000+ 首同人曲</Badge>
            <Badge t={t} t0={STAT_HITS[1]} until={tGreedy - 0.14} x={660} y={220} rot={3} bg={theme.accentDeep} size={74}>24 小时不停播</Badge>
            <Badge t={t} t0={STAT_HITS[2]} until={tGreedy - 0.08} x={600} y={370} rot={-3} bg="#ffd23e" fg="#2a161b" size={92}>全部免费 ¥0</Badge>

            {/* coins rain on the greedy shrine maiden */}
            {t >= tGreedy + 2 * B && t < tWhat + 1 && Array.from({ length: 22 }, (_, i) => {
              const u = (t - tGreedy - 2 * B - hash(i) * 0.9) / 1.1;
              if (u < 0 || u > 1) return null;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute", left: 120 + hash(i + 3) * 720, top: -80 + u * u * 1200, width: 58, height: 58, borderRadius: 58,
                    background: "radial-gradient(circle at 35% 30%, #fff3b0, #f0b429 60%, #b97a10)", border: "3px solid #8a5a08", boxSizing: "border-box",
                    transform: `scaleX(${Math.cos(t * 9 + i)})`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 30, fontWeight: 900, color: "#8a5a08", fontFamily: SERIF,
                  }}
                >
                  円
                </div>
              );
            })}
            <Emote t={t} t0={tGreedy + 0.15} x={reimuX + 240} y={170} text="￥" color="#c98a10" dur={1.4} />
            <Emote t={t} t0={tWhat + 0.05} x={reimuX + 240} y={170} text="!?" size={130} dur={1.4} />
          </div>
        </Cam>

        {/* UI layer of the "video": not affected by the stage camera */}
        <Dialogue t={t} />
        <Danmaku shots={shots} t={t} top={30} laneH={60} />
        {t >= T_AF_STOP && (
          <div
            style={{
              position: "absolute", left: 960 - 260, top: 64, width: 520, height: 130, borderRadius: 18, background: "#1b0f13", border: "6px solid #ff4d63",
              display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 84, fontWeight: 900, letterSpacing: 14, color: "#ff5c70",
              textShadow: "0 0 30px #ff3d57, 0 0 70px #ff3d57", boxShadow: "0 0 80px rgba(255,61,87,0.75)",
              transform: `scale(${backOut(prog(t, T_AF_STOP, 0.25))})`, opacity: hash(frame) > 0.12 || t > T_AF_STOP + 0.35 ? 1 : 0.35,
            }}
          >
            ON AIR
          </div>
        )}
      </div>

      <Flash opacity={easeIn(prog(t, T2 - 0.9, 0.9))} />
    </AbsoluteFill>
  );
};
