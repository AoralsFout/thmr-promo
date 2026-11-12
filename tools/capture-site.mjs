// Capture real screenshots of the live THMR website with system Chrome.
// Produces 2x PNGs (3840x2160 for 1920x1080 viewport), element crops, bounding
// boxes for camera targeting, a playing-state flipbook and a mobile set.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'https://thmr.yunmoan.cn';
const OUT = path.resolve('captures', 'web');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const boxes = {};
const report = [];
const log = (...a) => {
  const line = a.join(' ');
  console.log(line);
  report.push(line);
};

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--force-color-profile=srgb',
    '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    '--hide-scrollbars',
    '--font-render-hinting=none',
  ],
});

async function makePage({ width, height, dpr, dark }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    colorScheme: dark ? 'dark' : 'light',
    locale: 'zh-CN',
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') log('[console.error]', m.text().slice(0, 160));
  });
  return { ctx, page };
}

async function boot(page, dark) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.evaluate((d) => {
    try {
      localStorage.setItem('radio-theme-mode', d ? 'dark' : 'light');
    } catch {}
  }, dark);
  await page.reload({ waitUntil: 'domcontentloaded' });
  // The app polls status; wait until the hero headline is there.
  await page.waitForSelector('text=东方音乐电台', { timeout: 45_000 });
  await sleep(3500);
}

async function shot(page, name, { full = false, clipEl } = {}) {
  const file = path.join(OUT, `${name}.png`);
  if (clipEl) {
    await clipEl.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: full });
  }
  log('shot', name);
}

async function box(page, name, textOrLocator, { nth = 0 } = {}) {
  try {
    const loc = typeof textOrLocator === 'string' ? page.getByText(textOrLocator, { exact: false }).nth(nth) : textOrLocator;
    await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    const b = await loc.boundingBox({ timeout: 5000 });
    if (b) boxes[name] = b;
  } catch (e) {
    log('box miss', name, String(e).slice(0, 120));
  }
}

async function tryClick(page, label, { nth = 0, timeout = 6000 } = {}) {
  const candidates = [
    page.getByRole('button', { name: label }).nth(nth),
    page.getByRole('link', { name: label }).nth(nth),
    page.getByText(label, { exact: true }).nth(nth),
    page.getByText(label, { exact: false }).nth(nth),
  ];
  for (const c of candidates) {
    try {
      await c.click({ timeout, trial: false });
      log('clicked', label);
      return true;
    } catch {}
  }
  log('click MISS', label);
  return false;
}

// ---------- desktop dark ----------
{
  const { page } = await makePage({ width: 1920, height: 1080, dpr: 2, dark: true });
  await boot(page, true);
  await shot(page, 'dark_home');
  await shot(page, 'dark_home_full', { full: true });
  await box(page, 'hero', '东方音乐电台 THMR');
  await box(page, 'player_panel', '当前曲目');
  await box(page, 'listener_card', '本频道实时在线听众');
  await box(page, 'footer', '播放内容版权归原作者所有');

  // start playback
  const clicked = await tryClick(page, '点击播放');
  if (!clicked) await tryClick(page, '播放');
  await sleep(9000);
  await shot(page, 'dark_playing');

  // flipbook of the player card while playing (real progress/time motion)
  const card = page.getByText('当前曲目', { exact: false }).first();
  const cardBox = await card.boundingBox().catch(() => null);
  if (cardBox) {
    const clip = {
      x: Math.max(0, cardBox.x - 40),
      y: Math.max(0, cardBox.y - 60),
      width: Math.min(1920 - Math.max(0, cardBox.x - 40), 1100),
      height: Math.min(1080 - Math.max(0, cardBox.y - 60), 620),
    };
    for (let i = 0; i < 20; i++) {
      await page.screenshot({ path: path.join(OUT, `flip_player_${String(i).padStart(3, '0')}.png`), clip });
      await sleep(600);
    }
    log('flipbook done');
  }
  await shot(page, 'dark_playing_full', { full: true });
  await box(page, 'now_playing_card', '当前曲目');

  // queue
  if (await tryClick(page, '队列')) {
    await sleep(1500);
    await shot(page, 'dark_queue');
    await box(page, 'queue_panel', '播放队列');
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(600);
  }

  // vote page
  if (await tryClick(page, '投票')) {
    await sleep(2500);
    await shot(page, 'dark_vote');
    await box(page, 'vote_panel', '投票');
  }

  // yesterday playlist (scroll to it on home)
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(4000);
  try {
    const y = page.getByText('昨日歌单', { exact: false }).first();
    await y.scrollIntoViewIfNeeded({ timeout: 5000 });
    await sleep(1200);
    await shot(page, 'dark_yesterday');
    await box(page, 'yesterday_section', '昨日歌单');
  } catch (e) {
    log('yesterday miss', String(e).slice(0, 120));
  }

  // download dialog/page
  if (await tryClick(page, '下载客户端')) {
    await sleep(2500);
    await shot(page, 'dark_download');
    await box(page, 'download_dialog', '下载 THMR 客户端');
  }

  // api docs
  if (await tryClick(page, 'API 文档')) {
    await sleep(2500);
    await shot(page, 'dark_api');
  }

  await page.context().close();
}

// ---------- desktop light ----------
{
  const { page } = await makePage({ width: 1920, height: 1080, dpr: 2, dark: false });
  await boot(page, false);
  await shot(page, 'light_home');
  const clicked = await tryClick(page, '点击播放');
  if (!clicked) await tryClick(page, '播放');
  await sleep(8000);
  await shot(page, 'light_playing');
  await shot(page, 'light_home_full', { full: true });
  await page.context().close();
}

// ---------- mobile ----------
{
  const { page } = await makePage({ width: 390, height: 844, dpr: 3, dark: true });
  await boot(page, true);
  await shot(page, 'm_home');
  await shot(page, 'm_home_full', { full: true });
  const clicked = await tryClick(page, '点击播放');
  if (!clicked) await tryClick(page, '播放');
  await sleep(8000);
  await shot(page, 'm_playing');
  if (await tryClick(page, '队列')) {
    await sleep(1500);
    await shot(page, 'm_queue');
  }
  await page.context().close();
}

fs.writeFileSync(path.join(OUT, 'boxes.json'), JSON.stringify(boxes, null, 2));
fs.writeFileSync(path.join(OUT, 'report.txt'), report.join('\n'));
await browser.close();
console.log('capture-site done');
