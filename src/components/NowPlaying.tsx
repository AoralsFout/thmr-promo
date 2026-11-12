import React from "react";
import { AF, BA, T6, T_AF_STOP, T_LOCK, T2 } from "../timeline";
import { backOut, clamp, prog } from "../lib/anim";
import { SERIF, theme } from "../theme";
import { Cover } from "./Ui";

const SLOTS = [
  { ...AF, t0: T_LOCK + 1.4, t1: T_AF_STOP + 0.1 },
  { ...BA, t0: T2 + 0.5, t1: T6 + 7.2 },
];

/**
 * "NOW ON AIR" chip: the film's music is whatever the station is playing, so the
 * real title / artist / cover of the current track is always credited on screen.
 */
export const NowPlaying: React.FC<{ t: number }> = ({ t }) => {
  const s = SLOTS.find((x) => t >= x.t0 && t < x.t1 + 0.4);
  if (!s) return null;
  const enter = backOut(prog(t, s.t0, 0.45));
  const exit = prog(t, s.t1, 0.35);
  const beat = 60 / s.bpm;
  return (
    <div
      style={{
        position: "absolute", right: 44, top: 40, height: 96, padding: "0 26px 0 12px", display: "flex", alignItems: "center", gap: 18, borderRadius: 20,
        background: "rgba(27,15,19,0.88)", border: "1.5px solid rgba(255,228,236,0.2)", boxShadow: "0 14px 36px rgba(0,0,0,0.45)", fontFamily: SERIF,
        color: theme.nightInk, transform: `translateX(${(1 - enter) * 560 + exit * 560}px)`, opacity: clamp(enter * 2) * (1 - exit), zIndex: 50,
      }}
    >
      <Cover id={s.id} size={72} radius={12} />
      <div style={{ maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, letterSpacing: 5, color: theme.accentSoft, fontWeight: 900 }}>
          <span style={{ width: 11, height: 11, borderRadius: 11, background: "#ff5468", opacity: 0.45 + 0.55 * Math.abs(Math.sin(t * 3.2)) }} />
          NOW ON AIR
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>{s.title}</div>
        <div style={{ fontSize: 18, color: theme.mutedOnNight, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.artist}</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 44, marginLeft: 6 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const ph = ((t + i * beat * 0.37) % beat) / beat;
          return <div key={i} style={{ width: 6, borderRadius: 3, background: theme.accent, height: 10 + 34 * Math.exp(-3.5 * ph) * (0.6 + 0.4 * Math.sin(i * 2.1 + t)) }} />;
        })}
      </div>
    </div>
  );
};
