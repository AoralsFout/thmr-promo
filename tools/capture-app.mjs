// Capture the real THMR Flutter client (Windows build) in arbitrary window
// sizes and mascot themes — including a portrait "phone" window, which gives
// the same responsive layout the mobile app uses.
//
//   node tools/capture-app.mjs test            one portrait still (layout check)
//   node tools/capture-app.mjs all             every still + video used by the film
//
// Safety: the client's shared_preferences.json holds the user's own settings
// and login session. It is backed up byte-for-byte next to the original before
// anything is touched, only three keys (theme / dark mode / autoplay) are ever
// modified, and the backup is restored when the script ends (also on failure).
// System audio is muted while the client plays and restored afterwards.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = path.resolve('.');
const EXE = path.join(ROOT, 'captures', 'app', 'win', 'thmr_app.exe');
const OUT = path.join(ROOT, 'captures', 'app2');
const PREFS = path.join(process.env.APPDATA, 'cn.yunmoan.thmr', 'thmr_app', 'shared_preferences.json');
const BACKUP = PREFS + '.promo-bak';
const THEMES = ['reimu', 'marisa', 'cirno', 'tenshi', 'sanae', 'koishi', 'remilia', 'satori']; // AccentTheme enum order
const SRC = 'gfxcapture=window_exe=thmr_app:capture_cursor=0:max_framerate=60,hwdownload,format=bgra';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const ps = (...args) => spawnSync('pwsh', ['-NoProfile', '-File', path.join(ROOT, 'tools', 'win.ps1'), ...args], { encoding: 'utf8' }).stdout?.trim();
const kill = () => spawnSync('taskkill', ['/F', '/IM', 'thmr_app.exe'], { stdio: 'ignore' });

function setPrefs({ theme, dark }) {
  const j = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
  j['flutter.accentTheme'] = THEMES.indexOf(theme);
  j['flutter.themeMode'] = dark ? 2 : 1; // ThemeMode: system 0 / light 1 / dark 2
  j['flutter.autoPlay'] = true;
  fs.writeFileSync(PREFS, JSON.stringify(j));
}

async function launch({ theme, dark, x, y, w, h, settle = 9000 }) {
  kill();
  await sleep(500);
  setPrefs({ theme, dark });
  spawn(EXE, [], { cwd: path.dirname(EXE), detached: true, stdio: 'ignore' }).unref();
  await sleep(3500);
  console.log('  ', ps('-Action', 'move', '-Match', 'thmr_app', '-X', String(x), '-Y', String(y), '-W', String(w), '-H', String(h)));
  spawnSync('pwsh', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(1900, 1070)']);
  await sleep(settle);
}

function grab(name) {
  const out = path.join(OUT, `${name}.png`);
  fs.rmSync(out, { force: true });
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', SRC, '-frames:v', '1', out], { timeout: 12000 });
  const ok = fs.existsSync(out) && fs.statSync(out).size > 1000;
  console.log(`  grab ${name}: ${ok ? 'ok' : 'FAILED ' + (r.stderr?.toString().slice(0, 200) ?? '')}`);
  return ok;
}

async function record(name, seconds) {
  const out = path.join(OUT, `${name}.mkv`);
  const p = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `${SRC},crop=trunc(iw/2)*2:trunc(ih/2)*2`, '-t', String(seconds), '-r', '60', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '12', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  await new Promise((r) => p.on('exit', r));
  console.log(`  rec ${name}: ${fs.existsSync(out) ? (fs.statSync(out).size / 1e6).toFixed(1) + ' MB' : 'FAILED'}`);
}

const PORTRAIT = { x: 60, y: 20, w: 450, h: 1000 };
const LANDSCAPE = { x: 60, y: 40, w: 1600, h: 900 };

async function main() {
  const mode = process.argv[2] ?? 'test';
  if (!fs.existsSync(PREFS)) throw new Error('client prefs not found');
  if (spawnSync('tasklist', ['/FI', 'IMAGENAME eq thmr_app.exe'], { encoding: 'utf8' }).stdout.includes('thmr_app.exe')) throw new Error('THMR client is already running — close it first');
  if (!fs.existsSync(BACKUP)) fs.copyFileSync(PREFS, BACKUP);
  console.log(ps('-Action', 'mute', '-On', '1'));
  try {
    if (mode === 'test') {
      await launch({ theme: 'reimu', dark: true, ...PORTRAIT });
      grab('test_portrait');
    } else {
      // portrait: phone layout — video in the brand theme, stills for every mascot
      await launch({ theme: 'reimu', dark: true, ...PORTRAIT, settle: 11000 });
      grab('p_reimu_dark');
      await record('p_reimu_dark', 14);
      for (const th of THEMES.slice(1)) { await launch({ theme: th, dark: true, ...PORTRAIT }); grab(`p_${th}_dark`); }
      await launch({ theme: 'reimu', dark: false, ...PORTRAIT });
      grab('p_reimu_light');
      // landscape: desktop layout — video in the brand theme, stills for every mascot × dark/light
      await launch({ theme: 'reimu', dark: true, ...LANDSCAPE, settle: 11000 });
      grab('l_reimu_dark');
      await record('l_reimu_dark', 14);
      for (const th of THEMES) for (const dark of [true, false]) {
        if (th === 'reimu' && dark) continue;
        await launch({ theme: th, dark, ...LANDSCAPE });
        grab(`l_${th}_${dark ? 'dark' : 'light'}`);
      }
    }
  } finally {
    kill();
    await sleep(800);
    fs.copyFileSync(BACKUP, PREFS);
    const same = fs.readFileSync(BACKUP).equals(fs.readFileSync(PREFS));
    console.log(`prefs restored: ${same}`);
    if (same) fs.rmSync(BACKUP);
    console.log(ps('-Action', 'mute', '-On', 'restore'));
  }
}
await main();
