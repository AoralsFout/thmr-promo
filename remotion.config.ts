import { Config } from "@remotion/cli/config";

// 1080p60 master settings. The soundtrack is pre-mixed by tools/build-audio.mjs
// and included by src/Promo.tsx, so the rendered video already contains audio.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(96);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(14);
Config.setChromiumOpenGlRenderer("angle");
Config.setOverwriteOutput(true);
