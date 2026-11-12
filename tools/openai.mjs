// Minimal OpenAI API helpers for the THMR promo pipeline.
// The API key is read from key.txt at the project root and is NEVER logged.
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';
import net from 'node:net';

// On this network the IPv6 route to api.openai.com is dead. curl falls back to
// IPv4 by itself; Node's happy-eyeballs gives up too early. Prefer IPv4 and
// give each connection attempt a realistic timeout.
dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamilyAttemptTimeout(5000);

const KEY_PATH = path.resolve(process.cwd(), 'key.txt');
const key = fs.readFileSync(KEY_PATH, 'utf8').trim();
const API = 'https://api.openai.com/v1';

async function postJson(endpoint, body, timeoutMs = 600_000) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI ${endpoint} -> ${res.status}: ${text.slice(0, 600)}`);
  }
  return res;
}

async function postForm(endpoint, form, timeoutMs = 900_000) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI ${endpoint} -> ${res.status}: ${text.slice(0, 600)}`);
  }
  return res;
}

const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gpt-image-2.6-sunburst';

/** Text-to-image. Returns { images: Buffer[], usage }. */
export async function genImage({
  prompt,
  model = IMAGE_MODEL,
  size = '1536x1024',
  quality = 'high',
  background = 'auto',
  output_format = 'png',
  n = 1,
}) {
  const res = await postJson('/images/generations', { model, prompt, size, quality, background, output_format, n });
  const data = await res.json();
  return { images: data.data.map((d) => Buffer.from(d.b64_json, 'base64')), usage: data.usage };
}

/** Image edit (reference-guided). One or more input PNGs (<=16), returns { images, usage }. */
export async function editImage({
  imagePaths,
  prompt,
  model = IMAGE_MODEL,
  size,
  quality = 'high',
  background = 'auto',
  output_format = 'png',
  n = 1,
  input_fidelity,
}) {
  const form = new FormData();
  form.set('model', model);
  form.set('prompt', prompt);
  if (size && size !== 'auto') form.set('size', size);
  form.set('quality', quality);
  form.set('background', background);
  form.set('output_format', output_format);
  form.set('n', String(n));
  if (input_fidelity) form.set('input_fidelity', input_fidelity);
  const field = imagePaths.length > 1 ? 'image[]' : 'image';
  for (const p of imagePaths) {
    const buf = fs.readFileSync(p);
    form.append(field, new Blob([buf], { type: 'image/png' }), path.basename(p));
  }
  const res = await postForm('/images/edits', form);
  const data = await res.json();
  return { images: data.data.map((d) => Buffer.from(d.b64_json, 'base64')), usage: data.usage };
}

/** Text-to-speech. Returns Buffer in the requested format (default wav 24k? -> API default 24kHz mono). */
export async function tts({ text, voice, instructions, model = 'gpt-4o-mini-tts', format = 'wav', speed }) {
  const body = { model, input: text, voice, response_format: format };
  if (instructions) body.instructions = instructions;
  if (speed) body.speed = speed;
  const res = await postJson('/audio/speech', body);
  return Buffer.from(await res.arrayBuffer());
}

/** Speech-to-text (used to verify synthesized lines). Returns text. */
export async function transcribe({ audioPath, model = 'gpt-4o-transcribe', language = 'zh' }) {
  const form = new FormData();
  form.set('model', model);
  if (language) form.set('language', language);
  const ext = path.extname(audioPath).slice(1).toLowerCase();
  const mime = ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : 'application/octet-stream';
  form.append('file', new Blob([fs.readFileSync(audioPath)], { type: mime }), path.basename(audioPath));
  const res = await postForm('/audio/transcriptions', form, 180_000);
  return (await res.json()).text;
}

/**
 * "Ears" — ask an audio-capable chat model to listen to a clip and answer in text.
 * Used as QC for TTS voices and for describing music tracks we cannot listen to ourselves.
 */
export async function audioUnderstand({ audioPath, prompt, model = 'gpt-audio-1.5' }) {
  const b64 = fs.readFileSync(audioPath).toString('base64');
  const ext = path.extname(audioPath).slice(1).toLowerCase();
  const fmt = ['wav', 'mp3'].includes(ext) ? ext : 'wav';
  const res = await postJson(
    '/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: '你是一位专业的音频审听员，请用中文、具体、简洁地回答。' },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'input_audio', input_audio: { data: b64, format: fmt } },
          ],
        },
      ],
    },
    300_000,
  );
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? JSON.stringify(data).slice(0, 600);
}
