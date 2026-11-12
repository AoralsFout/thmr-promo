// S2 放送局巡礼 — six mascots, five real features, 16 bars of Bad Apple.
// v2: each feature gets 2–3 bars and something happens on (almost) every beat.
import React from "react";
import { AbsoluteFill } from "remotion";
import { BA_BEAT, bar, barPulse, CAST, CharId, LINES, pulse, T2, T3, T_CIRNO, TOUR } from "../timeline";
import { backOut, clamp, easeIn, easeOut, easeOut5, hash, lerp, prog, useT } from "../lib/anim";
import { SERIF, theme } from "../theme";
import { Cam, camAt, punch, shake } from "../components/Beat";
import { Dialogue } from "../components/Dialogue";
import { Badge, Egg, Flash, Rings } from "../components/Fx";
import { perform, Sprite } from "../components/Sprite";
import { Chip, Cover, Cursor, MiniPlayer, Panel, PlayerCard, QueueRow, skin, Skin, Spectrum, TRACKS, VotePanel } from "../components/Ui";

const BEAT = BA_BEAT;
const SCENE_LINES = LINES.filter((l) => l.id.startsWith("s2_"));
// deterministic picks from the tracks that really aired
const pick = (i: number) => TRACKS[(i * 7 + 3) % TRACKS.length];
const QUEUE = [pick(1), pick(2), pick(3), pick(4), pick(5), pick(6)];

type Seg = { who: CharId; side: "L" | "R"; a: number; b: number; no: string; title: string; sub: string; fallback: string; hits: number[] };
const beats = (a: number, ks: number[]) => ks.map((k) => a + k * BEAT);
const SEGS: Seg[] = [
  { who: "remilia", side: "L", ...TOUR.remilia, no: "01", title: "播放队列", sub: "接下来放什么，一眼看到底", fallback: "smirk", hits: beats(TOUR.remilia.a, [1, 2, 3, 4, 6, 8]) },
  { who: "marisa", side: "R", ...TOUR.marisa, no: "02", title: "收藏夹", sub: "一键收藏 · 可分享 · 可导出", fallback: "wink", hits: beats(TOUR.marisa.a, [3, 5, 7, 8]) },
  { who: "tenshi", side: "L", ...TOUR.tenshi, no: "03", title: "三档码率", sub: "320k / 128k / 96k · 播放中热切换", fallback: "haughty", hits: [...beats(TOUR.tenshi.a, [2, 6]), ...beats(T_CIRNO, [0, 2, 4])] },
  { who: "satori", side: "R", ...TOUR.satori, no: "04", title: "投票切歌", sub: "不想听？票数够了自动切歌", fallback: "gaze", hits: beats(TOUR.satori.a, [2, 3, 4, 5, 8]) },
  { who: "koishi", side: "L", ...TOUR.koishi, no: "05", title: "迷你播放器", sub: "贴边隐藏 · 托盘常驻 · 后台播放", fallback: "shh", hits: beats(TOUR.koishi.a, [2, 5, 6]) },
];

const PW = 1010; // feature panel width
const TOP = 338; // content top

const Backdrop: React.FC<{ t: number; color: string; night: string; no?: string; side: "L" | "R" }> = ({ t, color, night, no, side }) => {
  const p = pulse(t, 5);
  const gx = side === "L" ? 22 : 78;
  return (
    <div style={{ position: "absolute", left: -300, top: -200, width: 2520, height: 1480, background: night }}>
      <AbsoluteFill style={{ background: `radial-gradient(60% 80% at ${gx}% 55%, ${color}${Math.round(70 + 60 * p).toString(16)} 0%, ${color}00 70%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(rgba(255,236,240,${0.08 + 0.1 * p}) ${1.6 + 1.2 * p}px, transparent ${1.6 + 1.2 * p}px)`, backgroundSize: "44px 44px",
          backgroundPosition: `${(t * 26) % 44}px ${(t * 13) % 44}px`,
        }}
      />
      <Rings t={t - T2} cx={(side === "L" ? 420 : 1500) + 300} cy={840} color={color} count={3} period={BEAT * 4} max={1000} width={2} opacity={0.4} />
      {no && (
        <div
          style={{
            position: "absolute", [side === "L" ? "right" : "left"]: 330, bottom: 110, fontFamily: SERIF, fontSize: 620, fontWeight: 900, lineHeight: 1,
            color: "transparent", WebkitTextStroke: `3px ${color}55`, letterSpacing: -10, transform: `scale(${1 + 0.035 * barPulse(t, 4)})`, transformOrigin: "50% 80%",
          } as React.CSSProperties}
        >
          {no}
        </div>
      )}
    </div>
  );
};

const Header: React.FC<{ t: number; seg: Seg; x: number; s: Skin }> = ({ t, seg, x, s }) => {
  const u = easeOut5(prog(t, seg.a, 0.3));
  return (
    <div style={{ position: "absolute", left: x, top: 146, width: PW, fontFamily: SERIF, color: s.ink, opacity: clamp(u * 2), transform: `translateX(${(1 - u) * (seg.side === "L" ? 180 : -180)}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28, letterSpacing: 10, color: s.accent, fontWeight: 900 }}>
        <span style={{ padding: "2px 16px", background: s.accent, color: "#fffafb", borderRadius: 8, letterSpacing: 4, transform: `scale(${1 + 0.14 * pulse(t, 6)})` }}>{seg.no}</span>
        放送局巡礼
        <span style={{ flex: 1, height: 2 + 3 * pulse(t, 6), background: `${s.accent}88` }} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 30, marginTop: 6 }}>
        <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: 6, lineHeight: 1.2, whiteSpace: "nowrap", textShadow: "0 6px 30px rgba(0,0,0,0.5)" }}>{seg.title}</div>
        <div style={{ fontSize: 32, color: s.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{seg.sub}</div>
      </div>
    </div>
  );
};

// ── feature panels ───────────────────────────────────────────────────────────
const QueuePanel: React.FC<{ t: number; a: number; s: Skin }> = ({ t, a, s }) => {
  // beats 1-4: rows drop in · beat 6: "fate is sealed" · beat 8: #1 goes on air, the list moves up
  const adv = easeOut5(prog(t, a + BEAT * 8, 0.35));
  const H = 92;
  let eta = 6 * 60 + 6;
  return (
    <Panel s={s} style={{ width: PW, padding: "18px 14px", background: "rgba(27,15,19,0.82)" }}>
      <div style={{ display: "flex", alignItems: "baseline", padding: "0 20px 10px", gap: 16 }}>
        <div style={{ fontSize: 34, fontWeight: 900, borderLeft: `6px solid ${s.accent}`, paddingLeft: 16 }}>接下来</div>
        <div style={{ fontSize: 24, color: s.muted }}>队列 200 首</div>
      </div>
      <div style={{ position: "relative", height: H * 4, overflow: "hidden" }}>
        {QUEUE.slice(0, 5).map((q, i) => {
          const tIn = i < 4 ? a + BEAT * (1 + i) : a + BEAT * 9;
          const u = easeOut5(prog(t, tIn, 0.28));
          const label = `${String(Math.floor(eta / 60)).padStart(2, "0")}:${String(eta % 60).padStart(2, "0")}`;
          eta += Math.round(q.dur / 60) + 1;
          const hot = (i === 0 && t >= a + BEAT * 6 && adv < 0.5) || (i === 1 && adv >= 0.5);
          const gone = i === 0 ? adv : 0;
          return (
            <div key={q.id} style={{ position: "absolute", left: 0, top: (i - adv) * H, opacity: clamp(u * 2) * (1 - gone), transform: `translateX(${(1 - u) * 260 - gone * 400}px)` }}>
              <QueueRow s={s} track={q} index={`#${i + 1 - (adv >= 0.5 ? 1 : 0)}`} eta={label} hot={hot} width={PW - 28} h={H} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

const FavPanel: React.FC<{ t: number; a: number; s: Skin; x: number }> = ({ t, a, s, x }) => {
  // beat 3: click 收藏 · beat 5: the cover lands in the shelf · beat 7: 分享 · beat 8: 导出
  const tClick = a + BEAT * 3;
  const tLand = a + BEAT * 5;
  const tShare = a + BEAT * 7;
  const tExport = a + BEAT * 8;
  const fav = t >= tClick;
  const pulseFav = fav ? Math.exp(-(t - tClick) * 7) : 0;
  const fly = easeOut(prog(t, tClick + 0.08, tLand - tClick - 0.08));
  const landed = t >= tLand;
  const shelf = [pick(11), pick(12), pick(13), pick(14)];
  const pop = (t0: number) => (t >= t0 ? 1 + 0.35 * Math.exp(-(t - t0) * 8) : 1);
  return (
    <>
      <div style={{ position: "absolute", left: x, top: TOP }}>
        <PlayerCard s={s} track={pick(8)} t={t} progress={0.36 + (t - a) / 90} fav={fav} favPulse={pulseFav} width={PW} />
      </div>
      <Panel s={s} style={{ position: "absolute", left: x, top: TOP + 330, width: PW, height: 132, padding: "0 26px", display: "flex", alignItems: "center", gap: 18, background: "rgba(27,15,19,0.82)" }}>
        <div style={{ width: 210, flex: "none" }}>
          <div style={{ fontSize: 30, fontWeight: 900, whiteSpace: "nowrap" }}>我的收藏夹</div>
          <div style={{ fontSize: 22, color: s.muted }}>
            共 <span style={{ color: s.accent, fontWeight: 900, fontSize: 30, display: "inline-block", transform: `scale(${pop(tLand)})` }}>{landed ? 13 : 12}</span> 首
          </div>
        </div>
        <div style={{ width: 96, height: 96, flex: "none", borderRadius: 12, border: `2px dashed ${s.accent}`, boxSizing: "border-box", opacity: landed ? 0 : 0.8 }} />
        {shelf.map((q) => (<Cover key={q.id} id={q.id} size={96} radius={12} />))}
        <div style={{ flex: 1 }} />
        <Chip s={s} size={22} on={t >= tShare} style={{ transform: `scale(${pop(tShare)})` }}>分享</Chip>
        <Chip s={s} size={22} on={t >= tExport} style={{ transform: `scale(${pop(tExport)})` }}>导出</Chip>
      </Panel>
      {/* the cover that gets "borrowed" */}
      {fav && (
        <Cover
          id={pick(8).id}
          size={lerp(150, 96, fly)}
          radius={12}
          style={{ position: "absolute", left: lerp(x + 28, x + 26 + 210 + 18 + 1.5, fly), top: lerp(TOP + 28, TOP + 330 + 18, fly) - Math.sin(Math.PI * fly) * 90, transform: `rotate(${Math.sin(Math.PI * fly) * -14}deg)`, zIndex: 5 }}
        />
      )}
      {/* a little burst of stars when the heart is given */}
      {fav && t < tClick + 0.7 && Array.from({ length: 9 }, (_, i) => {
        const u = prog(t, tClick, 0.6);
        const ang = (i / 9) * Math.PI * 2 + 0.4;
        return <div key={i} style={{ position: "absolute", left: x + 262 + Math.cos(ang) * 130 * easeOut(u), top: TOP + 196 + Math.sin(ang) * 100 * easeOut(u), fontSize: 34, color: s.accent, opacity: 1 - u, transform: `rotate(${u * 180}deg)` }}>★</div>;
      })}
      <Cursor t={t} t0={a + BEAT * 0.5} tClick={tClick} from={[x + 760, TOP + 420]} to={[x + 262, TOP + 196]} />
    </>
  );
};

const QualityPanel: React.FC<{ t: number; a: number; s: Skin; x: number }> = ({ t, a, s, x }) => {
  const tHi = a + BEAT * 2;
  const tBaka = T_CIRNO + BEAT * 2;
  const sel = t >= tBaka ? 2 : t >= tHi ? 0 : 1;
  const chunky = sel === 2;
  const hit = Math.max(t >= tHi ? Math.exp(-(t - tHi) * 7) : 0, t >= tBaka ? Math.exp(-(t - tBaka) * 7) : 0);
  const cs = chunky ? skin(CAST.cirno.color, CAST.cirno.night) : s;
  const chip = (i: number, label: React.ReactNode) => (
    <Chip s={cs} on={sel === i} size={46} style={{ transform: `scale(${sel === i ? 1 + 0.16 * hit + 0.04 * pulse(t, 6) : 1})`, boxShadow: sel === i ? `0 0 ${40 * (0.3 + hit)}px ${cs.accent}` : undefined }}>{label}</Chip>
  );
  return (
    <div style={{ position: "absolute", left: x, top: TOP, width: PW }}>
      <Panel s={cs} style={{ padding: "26px 30px", background: "rgba(20,12,18,0.84)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: cs.muted, marginRight: 8 }}>音质</span>
          {chip(0, "320k")}
          {chip(1, "128k")}
          {chip(2, chunky ? <span><Egg n={4} />6k</span> : "96k")}
        </div>
        <div style={{ marginTop: 26 }}>
          <Spectrum s={cs} t={t} bars={chunky ? 9 : 64} width={PW - 60} height={210} energy={(sel === 0 ? 0.8 : sel === 1 ? 0.55 : 0.7) + 0.35 * pulse(t, 4)} />
        </div>
        <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 18, fontVariantNumeric: "tabular-nums" }}>
          <span style={{ fontSize: 64, fontWeight: 900, color: cs.accent, display: "inline-block", transform: `scale(${1 + 0.25 * hit})`, transformOrigin: "0 80%" }}>{sel === 0 ? "320" : sel === 1 ? "128" : "96"}</span>
          <span style={{ fontSize: 32, fontWeight: 700 }}>kbps / 44100 Hz</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 28, color: cs.muted }}>{sel === 0 ? "原汁原味的高码率" : sel === 1 ? "均衡之选" : "省流量也能听"}</span>
        </div>
      </Panel>
    </div>
  );
};

const VoteFeature: React.FC<{ t: number; a: number; s: Skin; x: number }> = ({ t, a, s, x }) => {
  // beats 2,3,4: three votes · beat 5: the track is skipped · beat 8: a fresh round opens
  const hits = [a + BEAT * 2, a + BEAT * 3, a + BEAT * 4];
  const tSkip = a + BEAT * 5;
  const tReset = a + BEAT * 8;
  const votes = t >= tReset ? 0 : hits.filter((h) => t >= h).length;
  const last = t >= tReset ? tReset : hits.filter((h) => t >= h).pop();
  const hit = last != null ? Math.exp(-(t - last) * 8) : 0;
  const u = easeOut5(prog(t, tSkip, 0.35));
  return (
    <div style={{ position: "absolute", left: x, top: TOP, width: PW }}>
      <div style={{ position: "relative", height: 300, overflow: "hidden", borderRadius: 18 }}>
        <div style={{ position: "absolute", left: 0, top: 0, transform: `translateX(${-u * (PW + 60)}px)`, opacity: 1 - u }}>
          <PlayerCard s={s} track={pick(21)} t={t} progress={0.3 + (t - a) / 60} width={PW} compact />
        </div>
        {t >= tSkip && (
          <div style={{ position: "absolute", left: 0, top: 0, transform: `translateX(${(1 - u) * (PW + 60)}px)` }}>
            <PlayerCard s={s} track={pick(22)} t={t} progress={(t - tSkip) / 200} width={PW} compact />
          </div>
        )}
      </div>
      <div style={{ height: 22 }} />
      <VotePanel s={{ ...s, panel: "rgba(27,15,19,0.82)" }} votes={votes} threshold={3} width={PW} pulse={hit} done={t >= tSkip && t < tReset} />
      {hits.map((h, i) => t >= h && t < tSkip + 0.35 && (
        <div
          key={i}
          style={{
            position: "absolute", left: 330 + i * 86, top: 222, width: 68, height: 68, borderRadius: 68, background: s.accent, border: "4px solid #fffafb",
            boxSizing: "border-box", transform: `scale(${backOut(prog(t, h, 0.2)) * (1 - prog(t, tSkip + 0.15, 0.2))})`, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fffafb", fontSize: 34, fontWeight: 900, fontFamily: SERIF,
          }}
        >
          +1
        </div>
      ))}
    </div>
  );
};

const MiniFeature: React.FC<{ t: number; a: number; s: Skin; x: number }> = ({ t, a, s, x }) => {
  // beat 2: docks to the screen edge and hides · beat 5: peeks back out
  const hide = easeOut(prog(t, a + BEAT * 2, 0.28)) - easeOut(prog(t, a + BEAT * 5, 0.28));
  const H = 470;
  return (
    <div style={{ position: "absolute", left: x, top: TOP, width: PW, height: H, borderRadius: 18, overflow: "hidden", border: `1.5px solid ${s.border}`, background: "linear-gradient(140deg, #2a2140 0%, #15101f 60%, #0d0a14 100%)", fontFamily: SERIF }}>
      {[
        { l: 40, tp: 34, w: 560, h: 330, c: "#1f2937" },
        { l: 330, tp: 120, w: 520, h: 290, c: "#262033" },
      ].map((w, i) => (
        <div key={i} style={{ position: "absolute", left: w.l, top: w.tp, width: w.w, height: w.h, borderRadius: 10, background: w.c, border: "1.5px solid rgba(255,255,255,0.1)", overflow: "hidden", opacity: 0.9 }}>
          <div style={{ height: 30, background: "rgba(255,255,255,0.07)" }} />
          {Array.from({ length: 9 }, (_, k) => (
            <div key={k} style={{ height: 10, margin: "14px 22px 0", width: `${30 + hash(i * 20 + k) * 55}%`, borderRadius: 6, background: "rgba(255,255,255,0.11)" }} />
          ))}
        </div>
      ))}
      <div style={{ position: "absolute", right: 18 - hide * 404, top: 22, transform: `scale(${1 + 0.03 * pulse(t, 6)})`, transformOrigin: "100% 0%" }}>
        <MiniPlayer s={s} track={pick(31)} t={t} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 56, background: "rgba(8,6,12,0.86)", display: "flex", alignItems: "center", padding: "0 22px", gap: 16, color: "#d9d2e6", fontSize: 21 }}>
        {[0, 1, 2, 3].map((i) => (<div key={i} style={{ width: 30, height: 30, borderRadius: 7, background: "rgba(255,255,255,0.16)" }} />))}
        <div style={{ flex: 1 }} />
        <div style={{ width: 34, height: 34, borderRadius: 8, background: s.accent, boxShadow: `0 0 ${14 + 26 * pulse(t, 5)}px ${s.accent}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 20, transform: `scale(${1 + 0.25 * pulse(t, 6)})` }}>♪</div>
        <div style={{ fontVariantNumeric: "tabular-nums" }}><Egg n={5} />:09</div>
      </div>
      <div
        style={{
          position: "absolute", right: 60, bottom: 70, padding: "10px 20px", borderRadius: 10, background: "rgba(255,250,251,0.96)", color: theme.paperInk, fontSize: 24, fontWeight: 800,
          transform: `scale(${backOut(prog(t, a + BEAT * 2.5, 0.22)) * (1 - prog(t, a + BEAT * 5, 0.18))})`, transformOrigin: "85% 100%",
        }}
      >
        THMR · 正在后台播放 ♪
      </div>
    </div>
  );
};

export const S2Tour: React.FC = () => {
  const t = useT();
  const seg = SEGS.find((s) => t >= s.a && t < s.b);
  const sanae = perform("sanae", t, SCENE_LINES, "cheer");

  // intro card (bar 0): the drop
  if (!seg) {
    const u = easeOut5(prog(t, T2, 0.4));
    const cam = camAt(t, [{ t: T2, x: 960, y: 540, z: 1.25 }, { t: T2 + 0.01, x: 960, y: 540, z: 1.0, dur: 0.5 }]);
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Cam cam={cam} extraZ={0.03 * prog(t, T2, bar(1) - T2)}>
          <Backdrop t={t} color={theme.accent} night={theme.night} side="R" />
          <div style={{ position: "absolute", left: 110, top: 270, fontFamily: SERIF, color: theme.nightInk, transform: `scale(${lerp(1.35, 1, u)})`, transformOrigin: "0% 50%" }}>
            <div style={{ fontSize: 40, letterSpacing: 22, color: theme.accentSoft, fontWeight: 900 }}>THMR FEATURE TOUR</div>
            <div style={{ fontSize: 188, fontWeight: 900, letterSpacing: 8, lineHeight: 1.2, textShadow: `0 0 ${60 + 60 * pulse(t, 5)}px ${theme.accent}`, whiteSpace: "nowrap" }}>放送局巡礼</div>
            <div style={{ fontSize: 44, color: theme.mutedOnNight, letterSpacing: 8 }}>六位看板娘 · 带你逛一圈</div>
          </div>
          <Sprite who="sanae" expr={sanae.expr} x={1610} y={170 + sanae.dy} h={1240} scale={sanae.scale} glow={`${CAST.sanae.color}88`} />
        </Cam>
        <Dialogue t={t} />
        <Flash opacity={Math.exp(-(t - T2) * 4.5)} />
        <Flash opacity={easeIn(prog(t, bar(1) - 0.08, 0.08)) * 0.5} color={CAST.remilia.color} />
      </AbsoluteFill>
    );
  }

  const c = CAST[seg.who];
  const s = skin(c.color, c.night);
  const local = t - seg.a;
  const u = prog(t, seg.a, seg.b - seg.a);
  const px = seg.side === "L" ? 820 : 90; // panel x
  const sx = seg.side === "L" ? 400 : 1520; // sprite x
  const dir = seg.side === "L" ? 1 : -1;
  const p = perform(seg.who, t, SCENE_LINES, seg.fallback);
  const enter = backOut(prog(local, 0, 0.32));
  const panelIn = easeOut5(prog(local, 0.03, 0.36));
  const panelStyle: React.CSSProperties = { opacity: clamp(panelIn * 2), transform: `translateX(${(1 - panelIn) * dir * 260}px)` };

  // camera: snap-zoom out on the cut, then a slow push that drifts from the mascot towards the UI
  const cam = camAt(t, [
    { t: seg.a, x: 960 - dir * 150, y: 500, z: 1.18 },
    { t: seg.a + 0.01, x: 960 - dir * 40, y: 540, z: 1.0, dur: 0.4 },
  ]);
  const push = 0.045 * u;
  const pan = dir * 70 * u;
  const bump = 0.016 * punch(t, seg.hits, 9);
  const [kx, ky] = shake(t, seg.who === "tenshi" ? [T_CIRNO, T_CIRNO + 4 * BEAT] : [], 14);

  // per-feature acting
  let expr = p.expr;
  let spriteOpacity = 1;
  const cirnoIn = backOut(prog(t, T_CIRNO - 0.05, 0.3));
  if (seg.who === "tenshi" && t >= T_CIRNO + BEAT * 2) expr = "shock";
  if (seg.who === "koishi") {
    spriteOpacity = 1 - 0.85 * (easeOut(prog(t, seg.a + BEAT * 2, 0.4)) - easeOut(prog(t, seg.a + BEAT * 5, 0.4)));
    if (t >= seg.a + BEAT * 6) expr = "wink";
  }
  const cirno = perform("cirno", t, SCENE_LINES, "proud");

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Cam cam={{ ...cam, x: cam.x + pan }} extraZ={push + bump} dx={kx} dy={ky}>
        <Backdrop t={t} color={c.color} night={c.night} no={seg.no} side={seg.side} />
        {/* the mascot drifts against the camera for a little parallax */}
        <Sprite
          who={seg.who} expr={expr} x={sx + (1 - enter) * -dir * 700 - dir * 46 * u} y={190 + p.dy} h={1300} scale={p.scale} opacity={spriteOpacity}
          light={seg.who === "tenshi" && t >= T_CIRNO ? 0.82 : 1} glow={`${c.color}77`} flip={seg.side === "R" && seg.who !== "marisa"}
        />
        <Header t={t} seg={seg} x={px} s={s} />
        <div style={{ position: "absolute", inset: 0, ...panelStyle }}>
          {seg.who === "remilia" && (<div style={{ position: "absolute", left: px, top: TOP }}><QueuePanel t={t} a={seg.a} s={s} /></div>)}
          {seg.who === "marisa" && <FavPanel t={t} a={seg.a} s={s} x={px} />}
          {seg.who === "tenshi" && <QualityPanel t={t} a={seg.a} s={s} x={px} />}
          {seg.who === "satori" && <VoteFeature t={t} a={seg.a} s={s} x={px} />}
          {seg.who === "koishi" && <MiniFeature t={t} a={seg.a} s={s} x={px} />}
        </div>
        {seg.who === "remilia" && (
          <Badge t={t} t0={seg.a + BEAT * 6} x={px + 610} y={TOP + 56} rot={4} bg={c.color} size={40}>下一首 · 命运已定</Badge>
        )}
        {seg.who === "tenshi" && t >= T_CIRNO - 0.1 && (
          <>
            <Sprite who="cirno" expr={cirno.expr} x={1700} y={330 + (1 - cirnoIn) * 900 + cirno.dy} h={940} scale={cirno.scale} glow={`${CAST.cirno.color}aa`} />
            <Badge t={t} t0={T_CIRNO + BEAT * 4} x={1120} y={600} rot={-8} bg={CAST.cirno.color} size={84}>最强！</Badge>
          </>
        )}
      </Cam>
      <Dialogue t={t} />
      <Flash opacity={Math.exp(-local * 10) * 0.6} color={c.color} />
      <Flash opacity={seg.who === "tenshi" && t >= T_CIRNO ? Math.exp(-(t - T_CIRNO) * 9) * 0.5 : 0} color={CAST.cirno.color} />
      <Flash opacity={easeIn(prog(t, T3 - 0.12, 0.12)) * 0.8} color="#fbf2f4" />
    </AbsoluteFill>
  );
};
