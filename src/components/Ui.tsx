// Recreations of the real THMR client UI (see captures/app/look7.png), built
// from the official design tokens so they can be animated and re-themed.
import React from "react";
import { Img, staticFile } from "remotion";
import tracksJson from "../data/tracks.json";
import { backOut, clamp, hash, prog } from "../lib/anim";
import { SERIF } from "../theme";

export type Track = { id: string; title: string; artist: string; circle: string; dur: number };
const EXCLUDE = new Set(["5b4a0c30bebcd2bd", "d6749904d9a60aaa", "5778f3bee1d9e442", "108c08ca0ba84bf8", "17ee6ce8bcbb2522"]);
/** Real tracks (with real covers) that aired on THMR while we were recording. */
export const TRACKS: Track[] = (tracksJson as Track[]).filter((t) => !EXCLUDE.has(t.id));
export const trackById = (id: string): Track => TRACKS.find((t) => t.id === id) ?? TRACKS[0];
export const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

export type Skin = { accent: string; bg: string; ink: string; muted: string; panel: string; border: string; dark: boolean };
export const skin = (accent: string, bg: string, dark = true): Skin =>
  dark
    ? { accent, bg, ink: "#f8edf0", muted: "#d7c1c8", panel: "rgba(255,240,245,0.055)", border: "rgba(255,228,236,0.14)", dark }
    : { accent, bg, ink: "#24161a", muted: "#6f5960", panel: "rgba(255,255,255,0.78)", border: "rgba(84,34,46,0.16)", dark };

export const Cover: React.FC<{ id: string; size: number; radius?: number; style?: React.CSSProperties }> = ({ id, size, radius = 10, style }) => (
  <Img
    src={staticFile(`covers/${id}.jpg`)}
    style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flex: "none", boxShadow: "0 6px 16px rgba(0,0,0,0.35)", ...style }}
  />
);

export const Panel: React.FC<{ s: Skin; style?: React.CSSProperties; children?: React.ReactNode }> = ({ s, style, children }) => (
  <div
    style={{
      background: s.panel, border: `1.5px solid ${s.border}`, borderRadius: 18, boxSizing: "border-box", color: s.ink, fontFamily: SERIF,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Chip: React.FC<{ s: Skin; on?: boolean; children: React.ReactNode; style?: React.CSSProperties; size?: number }> = ({ s, on, children, style, size = 26 }) => (
  <div
    style={{
      display: "inline-flex", alignItems: "center", gap: 8, height: size * 1.9, padding: `0 ${size * 0.8}px`, borderRadius: size, fontSize: size, fontWeight: 700,
      border: `1.5px solid ${on ? s.accent : s.border}`, background: on ? `${s.accent}38` : "transparent", color: on ? s.ink : s.muted, whiteSpace: "nowrap",
      boxSizing: "border-box", ...style,
    }}
  >
    {on && <span style={{ color: s.accent, fontSize: size * 0.9 }}>✓</span>}
    {children}
  </div>
);

/** The segmented live progress bar from the client. */
export const SegBar: React.FC<{ s: Skin; value: number; width: number; height?: number; t: number }> = ({ s, value, width, height = 30, t }) => {
  const n = Math.floor(width / 12);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", height, width }}>
      {Array.from({ length: n }, (_, i) => {
        const on = i / n < value;
        const wob = on ? 0.72 + 0.28 * Math.abs(Math.sin(t * 5 + i * 0.7)) : 0.12;
        return <div key={i} style={{ flex: 1, height: on ? height * wob : 2, borderRadius: 2, background: s.accent, opacity: on ? 0.95 : 0.5 }} />;
      })}
    </div>
  );
};

export const PlayerCard: React.FC<{ s: Skin; track: Track; t: number; progress: number; fav?: boolean; favPulse?: number; width: number; compact?: boolean }> = ({
  s, track, t, progress, fav, favPulse = 0, width, compact,
}) => {
  const btn = (label: React.ReactNode, on = false, pulse = 0): React.ReactNode => (
    <div
      style={{
        height: 46, padding: "0 20px", borderRadius: 10, display: "inline-flex", alignItems: "center", fontSize: 22, fontWeight: 700,
        border: `1.5px solid ${on ? s.accent : s.border}`, background: on ? s.accent : s.panel, color: on ? "#fffafb" : s.ink,
        transform: `scale(${1 + 0.22 * pulse})`, boxShadow: on ? `0 0 ${24 * (0.4 + pulse)}px ${s.accent}` : undefined,
      }}
    >
      {label}
    </div>
  );
  return (
    <Panel s={s} style={{ width, padding: 26 }}>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <Cover id={track.id} size={compact ? 120 : 150} radius={14} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 20, letterSpacing: 6, color: s.muted, fontWeight: 700 }}>当前曲目</div>
          <div style={{ fontSize: compact ? 38 : 44, fontWeight: 900, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
          <div style={{ fontSize: 24, color: s.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
            {btn(fav ? "★ 已收藏" : "收藏", !!fav, favPulse)}
            {btn("反馈")}
            {btn("复制信息")}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 22, padding: "12px 18px", borderRadius: 12, background: s.dark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{mmss(progress * track.dur)}</div>
        <SegBar s={s} value={progress} width={width - 52 - 36 - 220} t={t} />
        <div style={{ fontSize: 22, color: s.accent, fontWeight: 700, whiteSpace: "nowrap" }}>正在播放</div>
      </div>
    </Panel>
  );
};

export const QueueRow: React.FC<{ s: Skin; track: Track; index: React.ReactNode; eta: string; hot?: boolean; width: number; h?: number }> = ({ s, track, index, eta, hot, width, h = 96 }) => (
  <div
    style={{
      width, height: h, display: "flex", alignItems: "center", gap: 20, padding: "0 20px", boxSizing: "border-box", borderRadius: 14,
      background: hot ? `${s.accent}30` : "transparent", border: `1.5px solid ${hot ? s.accent : "transparent"}`, color: s.ink, fontFamily: SERIF,
    }}
  >
    <Cover id={track.id} size={h - 24} radius={10} />
    <div style={{ width: 54, fontSize: 24, color: s.accent, fontWeight: 900 }}>{index}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 30, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
      <div style={{ fontSize: 21, color: s.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
    </div>
    <div style={{ textAlign: "right", fontSize: 21, color: s.muted, fontVariantNumeric: "tabular-nums", lineHeight: 1.35 }}>
      <div style={{ color: s.ink, fontWeight: 700 }}>{mmss(track.dur)}</div>
      <div>预计 {eta}</div>
    </div>
  </div>
);

/** Audio spectrum (decorative, driven by time). `bars` low = chunky ⑨ mode. */
export const Spectrum: React.FC<{ s: Skin; t: number; bars: number; width: number; height: number; energy?: number }> = ({ s, t, bars, width, height, energy = 1 }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: bars > 20 ? 5 : 14, width, height }}>
    {Array.from({ length: bars }, (_, i) => {
      const u = i / bars;
      const shape = 0.35 + 0.65 * Math.exp(-u * 2.2);
      const v = 0.5 + 0.5 * Math.sin(t * (7 + hash(i) * 9) + i * 1.7) * Math.sin(t * 2.3 + i * 0.4);
      const stepped = bars > 20 ? v : Math.round(v * 4) / 4;
      return (
        <div
          key={i}
          style={{
            flex: 1, height: `${clamp(0.08 + stepped * shape * energy) * 100}%`, borderRadius: bars > 20 ? 4 : 0,
            background: `linear-gradient(180deg, ${s.accent}, ${s.accent}55)`,
          }}
        />
      );
    })}
  </div>
);

export const VotePanel: React.FC<{ s: Skin; votes: number; threshold: number; width: number; pulse?: number; done?: boolean }> = ({ s, votes, threshold, width, pulse = 0, done }) => (
  <Panel s={s} style={{ width, padding: "24px 28px", display: "flex", alignItems: "center", gap: 26 }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 34, fontWeight: 900 }}>投票切歌</div>
      <div style={{ fontSize: 26, color: s.muted, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: s.accent, fontWeight: 900, fontSize: 40, display: "inline-block", transform: `scale(${1 + 0.4 * pulse})` }}>{votes}</span> / {threshold} 票
      </div>
      <div style={{ height: 10, borderRadius: 10, background: s.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)", marginTop: 12, overflow: "hidden" }}>
        <div style={{ width: `${(votes / threshold) * 100}%`, height: "100%", background: s.accent, borderRadius: 10 }} />
      </div>
    </div>
    <div
      style={{
        height: 76, padding: "0 34px", borderRadius: 14, display: "flex", alignItems: "center", fontSize: 30, fontWeight: 900, whiteSpace: "nowrap",
        background: done ? "transparent" : s.accent, color: done ? s.accent : "#fffafb", border: `2px solid ${s.accent}`,
        transform: `scale(${1 - 0.08 * pulse})`,
      }}
    >
      {done ? "已切歌 ▶▶" : "投一票"}
    </div>
  </Panel>
);

/** The Windows mini player (always-on-top compact window). */
export const MiniPlayer: React.FC<{ s: Skin; track: Track; t: number; width?: number }> = ({ s, track, t, width = 420 }) => (
  <div
    style={{
      width, height: 132, borderRadius: 16, background: s.dark ? "rgba(31,19,23,0.97)" : "#fffafb", border: `1.5px solid ${s.border}`, boxSizing: "border-box",
      display: "flex", alignItems: "center", gap: 16, padding: 16, color: s.ink, fontFamily: SERIF, boxShadow: "0 18px 44px rgba(0,0,0,0.55)",
    }}
  >
    <Cover id={track.id} size={100} radius={12} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 25, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
      <div style={{ fontSize: 18, color: s.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 34, background: s.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <span style={{ width: 4, height: 14, background: "#fff", borderRadius: 2 }} />
          <span style={{ width: 4, height: 14, background: "#fff", borderRadius: 2 }} />
        </div>
        <Spectrum s={s} t={t} bars={22} width={width - 100 - 16 * 3 - 60} height={30} />
      </div>
    </div>
  </div>
);

const NAV = ["收听", "曲库", "收藏", "我的"];

/**
 * The desktop client, recreated: nav rail, channel header, player, quality +
 * vote row, upcoming queue, and the selected mascot's art pinned bottom-left.
 */
export const AppWindow: React.FC<{
  s: Skin; who: string; t: number; width: number; height: number; themeName: string; listeners?: React.ReactNode; track: Track; queue: Track[]; switchPulse?: number;
}> = ({ s, who, t, width, height, themeName, listeners = 7, track, queue, switchPulse = 0 }) => {
  const railW = 96;
  const rightW = Math.round(width * 0.3);
  const mainW = width - railW - rightW - 20 * 3;
  return (
    <div
      style={{
        position: "relative", width, height, borderRadius: 18, overflow: "hidden", background: s.bg, color: s.ink, fontFamily: SERIF,
        boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 0 1.5px ${s.border}, 0 0 ${90 * switchPulse}px ${s.accent}`,
      }}
    >
      {/* mascot art pinned bottom-left, as in the real client */}
      <Img src={staticFile(`art/${who}.png`)} style={{ position: "absolute", left: railW - 30, bottom: -60, height: height * 0.92, opacity: s.dark ? 0.3 : 0.38 }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${s.bg}00 0%, ${s.bg}cc 62%, ${s.bg} 100%)` }} />
      {/* title bar */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 44, display: "flex", alignItems: "center", padding: "0 18px", gap: 12, fontSize: 18, fontWeight: 700, background: s.dark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)" }}>
        <Img src={staticFile("brand/logo.png")} style={{ width: 24, height: 24 }} />
        东方音乐电台 THMR
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 15, color: s.muted, marginRight: 14 }}>{themeName}</span>
        {["—", "☐", "✕"].map((c) => (<span key={c} style={{ width: 34, textAlign: "center", color: s.muted, fontSize: 16 }}>{c}</span>))}
      </div>
      {/* nav rail */}
      <div style={{ position: "absolute", left: 0, top: 44, bottom: 0, width: railW, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, paddingTop: 20, borderRight: `1.5px solid ${s.border}` }}>
        <Img src={staticFile("brand/logo.png")} style={{ width: 52, height: 52, marginBottom: 6 }} />
        {NAV.map((n, i) => (
          <div key={n} style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: i === 0 ? s.accent : s.muted }}>
            <div style={{ width: 58, height: 34, borderRadius: 18, background: i === 0 ? `${s.accent}40` : "transparent", margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 20, height: 16, borderRadius: i === 3 ? 10 : 4, border: `2.5px solid ${i === 0 ? s.accent : s.muted}`, boxSizing: "border-box" }} />
            </div>
            {n}
          </div>
        ))}
      </div>
      {/* main column */}
      <div style={{ position: "absolute", left: railW + 20, top: 60, width: mainW }}>
        <Panel s={s} style={{ padding: "16px 22px", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 900 }}>东方音乐电台精选频道</div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Chip s={s} on size={15}>放送中</Chip>
              <Chip s={s} size={15}>东方综合频道</Chip>
              <Chip s={s} size={15} style={{ background: `${s.accent}30`, color: s.ink }}>东方综合精选频道</Chip>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, color: s.muted }}>全站实时在线听众</div>
            <div style={{ fontSize: 46, fontWeight: 900, color: s.accent, lineHeight: 1 }}>{listeners}</div>
          </div>
        </Panel>
        <div style={{ height: 16 }} />
        <PlayerCard s={s} track={track} t={t} progress={0.42 + (t % 60) / 400} width={mainW} compact />
        <div style={{ height: 16 }} />
        <div style={{ display: "flex", gap: 16 }}>
          <Panel s={s} style={{ flex: 1, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: s.muted }}>音质</span>
            <Chip s={s} on size={17}>320k</Chip>
            <Chip s={s} size={17}>128k</Chip>
            <Chip s={s} size={17}>96k</Chip>
          </Panel>
          <Panel s={s} style={{ flex: 1, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 19, fontWeight: 900 }}>投票切歌</div>
              <div style={{ fontSize: 15, color: s.muted }}>0 / 3 票</div>
            </div>
            <div style={{ padding: "8px 18px", borderRadius: 10, background: s.accent, color: "#fffafb", fontSize: 18, fontWeight: 900 }}>投一票</div>
          </Panel>
        </div>
      </div>
      {/* queue column */}
      <div style={{ position: "absolute", right: 20, top: 60, width: rightW }}>
        <div style={{ fontSize: 22, fontWeight: 900, borderLeft: `4px solid ${s.accent}`, paddingLeft: 12, marginBottom: 10 }}>接下来 <span style={{ fontSize: 15, color: s.muted, fontWeight: 600, marginLeft: 8 }}>队列 200 首</span></div>
        <Panel s={s} style={{ padding: 8 }}>
          {queue.slice(0, Math.floor((height - 130) / 70)).map((q, i) => (
            <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 8px" }}>
              <Cover id={q.id} size={54} radius={8} />
              <span style={{ fontSize: 15, color: s.accent, fontWeight: 900, width: 26 }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.title}</div>
                <div style={{ fontSize: 14, color: s.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.artist}</div>
              </div>
              <span style={{ fontSize: 14, color: s.muted }}>{mmss(q.dur)}</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
};

/** White arrow cursor that glides to a point and "clicks". */
export const Cursor: React.FC<{ t: number; t0: number; tClick: number; from: [number, number]; to: [number, number] }> = ({ t, t0, tClick, from, to }) => {
  if (t < t0 || t > tClick + 0.7) return null;
  const u = backOut(prog(t, t0, tClick - t0)) * 0.0 + (1 - Math.pow(1 - prog(t, t0, tClick - t0), 3));
  const x = from[0] + (to[0] - from[0]) * u;
  const y = from[1] + (to[1] - from[1]) * u;
  const click = Math.exp(-Math.max(0, t - tClick) * 12) * (t >= tClick ? 1 : 0);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${1 - 0.25 * click})`, transformOrigin: "0 0", opacity: 1 - prog(t, tClick + 0.45, 0.25) }}>
      {t >= tClick && (
        <div style={{ position: "absolute", left: -40, top: -40, width: 80, height: 80, borderRadius: 80, border: "4px solid #fff", opacity: click, transform: `scale(${1.4 - click})` }} />
      )}
      <svg width="44" height="52" viewBox="0 0 22 26">
        <path d="M2 1 L2 20 L7 15.5 L10.5 24 L14 22.5 L10.5 14.5 L17.5 14.5 Z" fill="#fff" stroke="#1b0f13" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
};
