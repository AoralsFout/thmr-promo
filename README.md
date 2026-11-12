# 与幻想乡同频 · THMR 宣传片

## 前言

由 Claude Fable 5.2 + GPT 6 Astra + GPT Image 2.6 制作。可恶的中转站 Claude 只有 1token/s，只能忍忍让 Fable 先做好整体的框架，再由 Astra 接手了。

使用 React、TypeScript 和 Remotion 制作的[东方音乐电台 THMR](https://thmr.yunmoan.cn)宣传片工程。画面由代码生成，包含角色对话、弹幕、节拍动画、网站功能介绍和客户端实机录屏。

本仓库是宣传片制作工程。电台网站和客户端需要单独访问或获取。

## 预览与渲染

需要 Node.js 22.18+（或 24 LTS）和 npm。音频制作脚本使用 Node.js 原生 TypeScript 类型剥离；日常开发也建议使用同一版本环境。具体依赖以 `package-lock.json` 为准。

在仓库根目录运行：

```sh
npm ci
npm run studio
```

打开终端显示的本地地址，在 Remotion Studio 中选择 `Promo` 预览正片，或选择 `Cover` 查看封面。首次渲染可能需要联网下载 Remotion 使用的浏览器。

`public/` 已包含当前剪辑使用的图片、录屏、字体和混音音轨，预览与渲染不需要 API 密钥，也不需要先运行素材生成脚本。

| 命令 | 用途与输出 |
| --- | --- |
| `npm run studio` | 打开交互式预览 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run preview` | 半分辨率预览视频：`out/preview/thmr-promo-preview.mp4` |
| `npm run render` | 正式视频：`out/thmr-promo-video.mp4` |
| `npm run cover` | 封面：`out/thmr-promo-cover.png` |
| `npm run warning` | 独立的 2 秒光敏性癫痫警告片头：`out/thmr-photosensitivity-warning.mp4` |
| `npm run still -- out/still.png --frame=900` | 导出正片第 900 帧 |
| `npm run audio` | 从本地原始音乐重新混音，覆盖 `public/audio/soundtrack.wav` |

正片为 **1920 × 1080、60 fps**；默认视频编码为 H.264 / yuv420p，CRF 14。`preview` 将分辨率缩放为 960 × 540，CRF 23。时长、场景切点和音乐节拍由 `src/timeline.ts` 计算，视频会包含 `public/audio/soundtrack.wav`。

`Promo` 开头包含 2 秒静音光敏性癫痫警告，沿用原片配色、字体与电波圆环，使用缓慢展开和淡出动画。正片画面与音轨一起延后 2 秒，内部剪辑和卡点不变，无需为警告片头重新混音。警告画面位于 `src/scenes/PhotosensitivityWarning.tsx`；持续时间由 `src/timeline.ts` 的 `WARNING_SECONDS` 控制，也可在 Studio 中单独选择 `PhotosensitivityWarning` 预览。

给已有成片追加警告时，音轨必须包含实际的片头静音采样；仅移动音轨时间戳，部分播放器或剪辑软件会忽略起始偏移而提前播放。`tools/check-warning-sync.mjs` 会解码音频，检查片头静音以及原片六处关键位置的波形同步。第二个参数必须是**未加警告的原始成片**：

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/check-warning-sync.mjs out/thmr-promo-with-warning-synced.mp4 path/to/original-without-warning.mp4
```

渲染配置使用 `angle` 图形后端。仓库保留的是 Windows 制作环境配置；其他平台遇到浏览器或 GPU 初始化问题时，可按本机环境调整 `remotion.config.ts`。

## 目录与修改入口

```text
src/
  index.ts              Remotion 注册入口
  Root.tsx              Promo 正片与 Cover 封面定义
  Promo.tsx             场景编排、转场与音轨
  timeline.ts           时间轴、节拍、角色、台词与音效提示
  theme.ts              颜色与字体样式
  fonts.ts              本地字体加载
  scenes/               S0–S6 七段场景
  components/           对话框、立绘、弹幕、UI 和特效
  lib/anim.ts           时间上下文与动画函数
  data/tracks.json      曲目展示数据
public/
  app/                  客户端横竖屏截图与录屏
  art/                  角色立绘与表情
  audio/soundtrack.wav  当前成片的预混音轨
  brand/                品牌图片与默认封面
  covers/               曲目封面
  fonts/                Noto Serif SC 字体及许可
  img/                  场景背景
  ui/                   网站和客户端截图、录屏
tools/                  素材制作、采集、混音和检查脚本
remotion.config.ts      渲染参数
```

- 修改台词、角色、节奏与剪辑点：`src/timeline.ts`。
- 修改具体场景：`src/scenes/S0Intro.tsx` 至 `S6Outro.tsx`。
- 修改多端展示：`src/scenes/S4Devices.tsx` 与 `public/app/`。
- 修改高潮画面和标题：`src/scenes/S5Climax.tsx`；封面编排在 `src/Root.tsx`。
- 修改访问地址：检查 `src/scenes/S6Outro.tsx` 的二维码与链接，以及 `src/Root.tsx` 等位置的展示文案。

调整时间轴后，需同步重建音轨；仅修改台词也会影响打字提示音的时序。替换 `public/` 素材时，应保留引用路径，或同步修改代码中的 `staticFile()` 引用。

## 可选制作工具

以下脚本用于素材生产与制作实验，不属于运行项目前的安装步骤。`captures/`、`gen/`、`_refs/` 不随仓库分发，相关脚本需要自行准备输入。采集脚本会访问真实服务；生成脚本会调用外部 API。

### 音轨与画面检查

重建音轨需要 PATH 中可用的 **FFmpeg / FFprobe**，并准备以下原始音乐文件：

```text
gen/music/6399d6f7b36b6364.mp3  # in the afternoon
gen/music/f85fdc72afd7f312.mp3  # Bad Apple!! feat.nomico (2014 Refix)
```

片头还可使用 `3887b951db56f19f`、`1c00f174e991f07d`、`55ce4543697dd84a`、`528e988708be8404` 对应的同目录 MP3 片段；缺失时脚本会跳过这些片段。文件需与当前时间轴所用版本及起始位置一致。

```sh
npm run audio
node tools/audio-check.mjs
node tools/stills.mjs review 16 50 90 --scale=0.5
```

`audio-check.mjs` 输出音轨统计；`stills.mjs` 在 `gen/stills/` 输出指定秒数的画面，多帧时附带联系表。音轨由音乐、合成音效和打字提示音组成，当前正片未使用真人或 TTS 台词配音。

### 采集与素材整理

| 脚本 | 输入或环境要求 |
| --- | --- |
| `capture-site.mjs` | 实际网站与系统 Chrome；浏览器路径在脚本中配置 |
| `capture-app.mjs`、`rec.ps1`、`win.ps1` | Windows、PowerShell、THMR Windows 客户端，以及支持 `gfxcapture` 的 FFmpeg |
| `record-stream.mjs` | 电台服务连接；默认持续采集 12 小时，保存到 `captures/radio/` |
| `track-index.mjs`、`music-survey.mjs` | 已采集的事件、音乐和封面；后者还调用外部音频分析 API |
| `prep-assets.mjs`、`prep-app-captures.mjs` | 本地原始截图、录屏和曲目索引；输出会更新 `public/` 或 `src/data/` |

`capture-app.mjs` 会启动和关闭客户端、临时修改主题及自动播放设置，并静音系统音频；正常结束或捕获到异常时会尝试恢复原设置。运行前请关闭正在使用的客户端，先检查脚本中的路径和采集参数。

### 图像与语音实验

`gen-images.mjs` 使用 `_refs/thmr-app/assets/brand/` 中的参考立绘生成背景或表情；`gen-tts.mjs`、`voice-survey.mjs`、`qc-tts.mjs` 和 `gen-test.mjs` 保留了语音与模型实验流程。它们使用的模型和参数保留自制作环境，需要根据自己的账户可用性调整。`gen-tts.mjs` 使用独立的 `tools/script-lines.mjs` 台本，并非当前正片台词的自动配音入口。

这些脚本通过 `tools/openai.mjs` 读取仓库根目录的本地 `key.txt`。该文件已被忽略，请勿提交真实密钥。普通预览和渲染无需创建它；脚本目前不会自动读取 `.env`。语音实验另需自行创建 `public/data/`；Python 音高分析脚本 `f0.py` 另需 `librosa` 和 `numpy`。

## Git 收录范围

源码、工具脚本、锁文件和当前渲染依赖的 `public/` 素材随仓库保留。以下内容由 `.gitignore` 排除：

- 依赖、虚拟环境、Python 缓存、构建缓存和日志。
- `out/` 渲染结果、`gen/` 中间产物、`captures/` 原始采集及 `_refs/` 本地参考工程。
- `key.txt`、`.env` 等本地凭据，以及编辑器和系统临时文件。
- 可选语音实验产物 `public/audio/lines/` 和 `public/data/lines.json`。

不要整体忽略 `public/`，否则其他人克隆后将缺少渲染素材。发布前可用 `git status --short` 和 `git ls-files -ci --exclude-standard` 检查候选文件与误跟踪内容；忽略规则不会移除已经跟踪的文件或历史记录中的内容。

## 许可证与素材

本项目原创代码与文档采用 [MIT License](LICENSE)。`public/` 内的音乐、图片、字体、品牌标识，以及第三方依赖不包含在本项目 MIT 授权范围内，按各自许可或权利人的授权使用。

| 素材 | 来源记录与说明 |
| --- | --- |
| `public/fonts/NotoSerifSC-VF.ttf` | Noto Serif SC；字体内嵌版权标记为 Adobe 2017–2024，采用 SIL Open Font License 1.1，见随附 [OFL.txt](public/fonts/OFL.txt) 和 [Noto CJK 上游许可](https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE) |
| `public/art/`、`public/brand/` | 制作时使用的 THMR 角色及品牌素材；表情生成流程见 `tools/gen-images.mjs`，原始素材参考目录为 `_refs/thmr-app/assets/brand/` |
| `public/img/` | 背景图生成提示与流程保留在 `tools/gen-images.mjs` |
| `public/app/`、`public/ui/` | THMR 界面截图及录屏；采集和处理流程保留在 `tools/` |
| `public/covers/`、`src/data/tracks.json` | 采集期间播放曲目的封面与标题、作者、社团等展示数据 |
| `public/audio/soundtrack.wav` | 音乐片段与合成音效的混音；主要曲目为 ZuikakuP 的《in the afternoon》和 nomico · Alstroemeria Records 的《Bad Apple!! feat.nomico (2014 Refix)》，剪辑位置见 `src/timeline.ts` |

以上表格记录制作来源，不代表获得了这些素材的再分发或商用许可。仓库内尚未附齐音乐、封面及原始立绘的授权记录，公开发布前需由维护者确认可分发范围；需要调整时请同时处理所引用的文件和历史版本。东方 Project 相关角色及原作权利归原权利人所有。
