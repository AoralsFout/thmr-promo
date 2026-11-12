// THMR 幻想乡放送局 design tokens — mirrors the official site / app palette.
export const theme = {
  accent: "#c65a69", // 绯红 brand accent
  accentDeep: "#9e1b2d", // seal red
  accentSoft: "#e0899a",
  paper: "#fbf2f4", // 粉纸白
  paperInk: "#24161a",
  night: "#160d10", // 酒红黑
  nightInk: "#f8edf0",
  ink: "#24161a",
  mutedOnPaper: "#6f5960",
  mutedOnNight: "#d7c1c8",
  panelOnPaper: "rgba(255,251,252,0.92)",
  panelOnNight: "rgba(31,19,23,0.90)",
  borderOnPaper: "rgba(84,34,46,0.16)",
  borderOnNight: "rgba(255,228,236,0.13)",
  gold: "#d9a441",
  danmakuColors: ["#ffffff", "#ffd94a", "#ff8a3d", "#7ec9ff", "#ff9dc0", "#a5f3a5"],
} as const;

export const SERIF = '"Noto Serif SC", "Microsoft YaHei", serif';
/** Danmaku comments on Chinese video sites use a plain sans (SimHei-family). */
export const DANMAKU_FONT = 'SimHei, "Microsoft YaHei", sans-serif';

export const FPS = 60;

/** Convert seconds to frames (rounded). */
export const s = (sec: number) => Math.round(sec * FPS);
