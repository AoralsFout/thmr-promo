import { continueRender, delayRender, staticFile } from "remotion";

// Load the brand typeface (思源宋体 / Noto Serif SC variable font) once, and
// block rendering until it is ready so no frame ever falls back to a system font.
const handle = delayRender("Loading Noto Serif SC", { timeoutInMilliseconds: 180_000 });

const face = new FontFace("Noto Serif SC", `url(${staticFile("fonts/NotoSerifSC-VF.ttf")}) format("truetype")`, {
  weight: "200 900",
  style: "normal",
});

face
  .load()
  .then((loaded) => {
    document.fonts.add(loaded);
    continueRender(handle);
  })
  .catch((err) => {
    console.error("font load failed", err);
    continueRender(handle);
  });
