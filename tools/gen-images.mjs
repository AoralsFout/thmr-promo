// Generate backgrounds (text-to-image) and character expression variants
// (reference-guided edits of the project's own character art).
// Resume-friendly: existing outputs are skipped. Pass names to force a subset.
import fs from 'node:fs';
import path from 'node:path';
import { genImage, editImage } from './openai.mjs';

const ART = path.resolve('_refs', 'thmr-app', 'assets', 'brand');
const BG_OUT = path.resolve('public', 'img');
const EXPR_OUT = path.resolve('public', 'art', 'expr');
fs.mkdirSync(BG_OUT, { recursive: true });
fs.mkdirSync(EXPR_OUT, { recursive: true });

const STYLE =
  '日式幻想风格动画背景美术，水彩与薄涂质感，柔和细腻的笔触与光影，色彩通透，带一点怀旧的纸张颗粒感，' +
  '画面中不要出现任何人物、不要出现任何文字或水印。';

const EXPR_RULE =
  '这是一张动漫角色立绘（透明背景）。请保持角色的身份、发型、发色、服装、姿势、构图、线条风格和水彩上色完全不变，' +
  '画面范围与比例也保持不变，只修改面部表情。输出必须保持透明背景，不要添加任何文字、特效或其他物体。新的表情是：';

const art = (name) => path.join(ART, name);

const JOBS = [
  // ---------- backgrounds ----------
  {
    name: 'bg_shrine_day',
    out: BG_OUT,
    type: 'gen',
    size: '2560x1440',
    prompt:
      STYLE +
      '场景：初夏午后的山间神社。红色鸟居、石阶和拜殿屋檐位于画面上半部远处，一只古旧的木质赛钱箱放在拜殿前，' +
      '阳光透过树叶洒下斑驳的光斑，远处有淡淡的樱花与新绿，天空是带暖意的淡蓝色与柔软的白云。' +
      '氛围宁静、慵懒、明亮。构图：主体建筑居中偏上，画面下方三分之一保持简洁（石板地面），便于叠加对话框。',
  },
  {
    name: 'bg_offering_box',
    out: BG_OUT,
    type: 'gen',
    size: '1536x1024',
    prompt:
      STYLE +
      '场景：从正上方俯视一只古旧木质赛钱箱的内部特写。木格栅下面是空荡荡的深色箱底，只有一片落叶和一点灰尘，' +
      '一束午后的阳光斜照进箱子里。画面中央的箱底保持空旷、平整，便于之后叠加一张小贴纸。带一点幽默的冷清感。',
  },
  {
    name: 'bg_gensokyo_night',
    out: BG_OUT,
    type: 'gen',
    size: '2560x1440',
    prompt:
      STYLE +
      '场景：幻想乡的夜空全景。巨大的满月悬在画面中央偏上，下方是连绵的群山剪影，远处山顶有一座小小的神社鸟居亮着灯火，' +
      '漫天星河，樱花瓣随风飘散。色调是深酒红、绯红与深紫的渐变，梦幻而壮丽。' +
      '构图：画面中央（月亮下方）留出大片干净的夜空，便于叠加标题与角色。',
  },

  // ---------- expression variants ----------
  { name: 'reimu_bored', out: EXPR_OUT, type: 'edit', src: 'background.png', expr: '无聊到叹气：眼睛半闭、无精打采，嘴巴微微张开在叹气。' },
  { name: 'reimu_surprised', out: EXPR_OUT, type: 'edit', src: 'background.png', expr: '非常惊讶：眼睛睁得很大、瞳孔缩小，嘴巴张开，有点慌张。' },
  { name: 'reimu_greedy', out: EXPR_OUT, type: 'edit', src: 'background.png', expr: '见钱眼开的星星眼：双眼闪闪发光、瞳孔里有星星光芒，嘴角上扬、满脸期待。' },
  { name: 'reimu_smug', out: EXPR_OUT, type: 'edit', src: 'background.png', expr: '得意的坏笑：眼睛眯起，嘴角一侧上扬，自信满满。' },
  { name: 'marisa_laugh', out: EXPR_OUT, type: 'edit', src: 'marisa_background.png', expr: '开怀大笑：张大嘴露出牙齿，眼睛弯成月牙，非常得意。' },
  { name: 'marisa_wink', out: EXPR_OUT, type: 'edit', src: 'marisa_background.png', expr: '俏皮地眨一只眼（wink），咧嘴露齿笑。' },
  { name: 'sanae_cheer', out: EXPR_OUT, type: 'edit', src: 'sanae_background.png', expr: '元气满满的灿烂笑容：张嘴大笑，眼睛明亮有神，充满热情。' },
  { name: 'sanae_wink', out: EXPR_OUT, type: 'edit', src: 'sanae_background.png', expr: '俏皮地眨一只眼（wink），自信地微笑。' },
  { name: 'cirno_proud', out: EXPR_OUT, type: 'edit', src: 'baka_background.png', expr: '得意忘形地哈哈大笑：闭着眼睛，张大嘴，非常骄傲。' },
  { name: 'cirno_confused', out: EXPR_OUT, type: 'edit', src: 'baka_background.png', expr: '完全没听懂的困惑表情：眼睛变成蚊香一样的漩涡圈，嘴巴呈波浪形。' },
  { name: 'remilia_smirk', out: EXPR_OUT, type: 'edit', src: 'remilia_background.png', expr: '高傲的冷笑：眼睛微眯，嘴角勾起，露出一颗小尖牙。' },
  { name: 'tenshi_haughty', out: EXPR_OUT, type: 'edit', src: 'tenshi_background.png', expr: '傲慢地俯视：下巴微微抬起，眼睛半睁，嘴角带着得意的微笑。' },
  { name: 'tenshi_shock', out: EXPR_OUT, type: 'edit', src: 'tenshi_background.png', expr: '被打断后的震惊与恼火：瞪大眼睛、张着嘴，眉毛竖起。' },
  { name: 'satori_smile', out: EXPR_OUT, type: 'edit', src: 'satori_background.png', expr: '闭着眼睛温柔地微笑，一副看穿一切的从容。' },
  { name: 'satori_gaze', out: EXPR_OUT, type: 'edit', src: 'satori_background.png', expr: '意味深长地注视着观众：眼睛半睁，嘴角带着浅浅的笑。' },
  { name: 'koishi_wink', out: EXPR_OUT, type: 'edit', src: 'koishi_background.png', expr: '调皮地眨一只眼，并微微吐出舌头。' },
  { name: 'koishi_shh', out: EXPR_OUT, type: 'edit', src: 'koishi_background.png', expr: '神秘地微笑，同时把一只手抬到嘴边、食指竖在唇前比出"嘘"的手势（允许为此调整这只手臂的姿势）。' },
];

const only = process.argv.slice(2);
const jobs = JOBS.filter((j) => (only.length ? only.includes(j.name) : !fs.existsSync(path.join(j.out, `${j.name}.png`))));
console.log(`jobs to run: ${jobs.length}/${JOBS.length}`);

const CONCURRENCY = 3;
let outputTokens = 0;

async function run(job) {
  const t0 = Date.now();
  const file = path.join(job.out, `${job.name}.png`);
  let result;
  if (job.type === 'gen') {
    result = await genImage({ prompt: job.prompt, size: job.size, quality: 'high', output_format: 'png' });
  } else {
    result = await editImage({
      imagePaths: [art(job.src)],
      prompt: EXPR_RULE + job.expr,
      size: '1024x1536',
      quality: 'high',
      background: 'transparent',
      output_format: 'png',
    });
  }
  fs.writeFileSync(file, result.images[0]);
  outputTokens += result.usage?.output_tokens ?? 0;
  console.log(`${job.name.padEnd(18)} ok ${((Date.now() - t0) / 1000).toFixed(0)}s out_tokens=${result.usage?.output_tokens ?? '?'}`);
}

const queue = [...jobs];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const job = queue.shift();
      if (!job) break;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await run(job);
          break;
        } catch (e) {
          console.error(`${job.name} attempt ${attempt + 1} failed: ${String(e).slice(0, 300)}`);
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }
  }),
);
console.log(`all done, output tokens ≈ ${outputTokens} (~$${((outputTokens * 30) / 1e6).toFixed(2)})`);
