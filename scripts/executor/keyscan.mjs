// Scans files for the DeepSeek key in plain, base64 (3 alignments), hex and URL-encoded form.
// Env: KEY. Args: files or directories to scan. Exits 1 on a match. Never prints the key.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function needles(key) {
  const out = new Set([key, encodeURIComponent(key), Buffer.from(key).toString('hex')]);
  const k = Buffer.from(key);
  for (let pad = 0; pad < 3; pad++) {
    const enc = Buffer.concat([Buffer.alloc(pad, 0x41), k]).toString('base64').replace(/=+$/, '');
    const drop = [0, 2, 3][pad];
    const core = enc.slice(drop, enc.length - 2);
    if (core.length >= 8) out.add(core);
  }
  return [...out].filter((s) => s.length >= 8);
}

export function scanText(text, key) {
  return needles(key).some((n) => text.includes(n));
}

function* walk(p) {
  const st = statSync(p, { throwIfNoEntry: false });
  if (!st) return;
  if (st.isDirectory()) for (const f of readdirSync(p)) yield* walk(join(p, f));
  else yield p;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const key = process.env.KEY || '';
  if (key.length < 8) {
    console.error('keyscan: KEY missing or too short, refusing to pass');
    process.exit(1);
  }
  let hit = false;
  for (const arg of process.argv.slice(2)) {
    for (const f of walk(arg)) {
      if (scanText(readFileSync(f).toString('latin1'), key) || scanText(readFileSync(f, 'utf8'), key)) {
        console.error(`KEY LEAK: match in ${f}. Rotate DEEPSEEK_API_KEY.`);
        hit = true;
      }
    }
  }
  process.exit(hit ? 1 : 0);
}
