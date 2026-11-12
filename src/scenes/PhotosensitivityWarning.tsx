import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeInOut, easeOut, lerp, prog } from "../lib/anim";
import { FPS, WARNING_SECONDS } from "../timeline";
import { SERIF, theme } from "../theme";

/** A quiet station notice: one gentle entrance and exit, without flashing. */
export const PhotosensitivityWarning: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const enter = easeOut(prog(t, 0, 0.24));
  const exit = easeInOut(prog(t, WARNING_SECONDS - 0.3, 0.3));
  const opacity = lerp(0.75, 1, enter) * (1 - exit);

  return (
    <AbsoluteFill style={{ background: "#05030a", overflow: "hidden", fontFamily: SERIF }}>
      <AbsoluteFill style={{ background: theme.night, opacity: 1 - exit }} />
      <AbsoluteFill
        style={{
          opacity,
          background: "radial-gradient(ellipse at 50% 45%, rgba(198,90,105,0.13), transparent 65%)",
        }}
      />
      {/* The film's radio-wave motif, opening slowly once behind the notice. */}
      <svg width={1920} height={1080} style={{ position: "absolute", opacity: opacity * 0.15 }}>
        {[350, 470, 590].map((r) => (
          <circle key={r} cx={960} cy={510} r={r + 16 * easeOut(prog(t, 0, WARNING_SECONDS))} fill="none" stroke={theme.accentSoft} strokeWidth={1} />
        ))}
      </svg>
      <div style={{ position: "absolute", inset: "80px 110px", opacity }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28, color: theme.accentSoft, fontSize: 23, letterSpacing: 6 }}>
          <span>THMR</span>
          <div style={{ height: 1, flex: 1, background: theme.borderOnNight }} />
          <span style={{ color: theme.mutedOnNight, fontSize: 21, letterSpacing: 4 }}>观看提示</span>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 252, textAlign: "center", transform: `translateY(${8 * (1 - enter)}px)` }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 32 }}>
            <svg width={84} height={84} viewBox="0 0 84 84" fill="none">
              <path d="M37 12 Q42 3 47 12 L78 67 Q83 76 73 76 H11 Q1 76 6 67 Z" stroke={theme.accentSoft} strokeWidth={3} strokeLinejoin="round" />
              <path d="M42 29 V49" stroke={theme.accentSoft} strokeWidth={4} strokeLinecap="round" />
              <circle cx={42} cy={61} r={2.8} fill={theme.accentSoft} />
            </svg>
            <div style={{ color: theme.nightInk, fontSize: 86, fontWeight: 800, letterSpacing: 8, lineHeight: 1.3 }}>光敏性癫痫警告</div>
          </div>
          <div style={{ marginTop: 21, color: theme.accentSoft, fontSize: 21, letterSpacing: 7 }}>PHOTOSENSITIVITY WARNING</div>
          <div style={{ width: 80, height: 2, background: theme.accent, margin: "40px auto 32px", transform: `scaleX(${lerp(0.4, 1, enter)})` }} />
          <div style={{ color: theme.nightInk, fontSize: 40, fontWeight: 600, letterSpacing: 3, lineHeight: 1.85 }}>
            本片含闪光与快速切换画面
          </div>
          <div style={{ color: theme.mutedOnNight, fontSize: 34, letterSpacing: 2, lineHeight: 1.85 }}>
            请与屏幕保持距离，谨慎观看
            <br />
            如有不适，请立即停止观看并及时就医
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: theme.borderOnNight }} />
      </div>
    </AbsoluteFill>
  );
};
