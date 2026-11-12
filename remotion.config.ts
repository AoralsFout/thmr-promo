import { Config } from "@remotion/cli/config";

// 1080p60 master settings. Audio is mastered separately with ffmpeg and muxed
// after the picture render, so the Remotion output only has to be a clean
// high-bitrate picture.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(96);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(14);
Config.setChromiumOpenGlRenderer("angle");
Config.setOverwriteOutput(true);
