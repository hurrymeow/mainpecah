// Pre-flight for the DeepSeek executor. Runs before any model call.
// Env: PLAN (slug), TASK (e.g. T9), OUT (dir for task.md and files.json).
// Exits 1 with a one-line reason when the task is not safe to hand to the executor.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const { PLAN = '', TASK = '', OUT = '.' } = process.env;

function refuse(reason) {
  console.error(`PREFLIGHT REFUSED: ${reason}`);
  process.exit(1);
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(PLAN)) refuse(`plan "${PLAN}" is not a slug (a-z, 0-9, -)`);
if (!/^T\d{1,2}$/.test(TASK)) refuse(`task "${TASK}" is not of the form T<number>`);

let text;
try {
  text = readFileSync(`docs/plans/${PLAN}.md`, 'utf8');
} catch {
  refuse(`docs/plans/${PLAN}.md not found on main`);
}

const lines = text.split('\n');
const start = lines.findIndex((l) => l.startsWith(`### ${TASK}. `));
if (start < 0) refuse(`no heading "### ${TASK}. ..." in docs/plans/${PLAN}.md`);
let end = lines.length;
for (let i = start + 1; i < lines.length; i++) {
  if (/^#{1,3} /.test(lines[i])) {
    end = i;
    break;
  }
}
const heading = lines[start];
// Haiku is the default tier. "Sonnet, executor trial" is an explicit one-off opt-in (Hari, 2026-11-01).
if (!/\((Haiku|Sonnet, executor trial)\)\s*$/.test(heading)) refuse(`${TASK} is not tagged (Haiku) or (Sonnet, executor trial) in its heading`);

const body = lines.slice(start + 1, end);
const field = (name) => body.find((l) => new RegExp(`^\\s*(?:[-*]\\s*)?${name}:`, 'i').test(l));
const filesLine = field('Files');
for (const [name, line] of [
  ['Files', filesLine],
  ['Exact changes', field('Exact changes')],
  ['Done when', field('Done when')],
  ["Don't touch", field("Don't touch")],
]) {
  if (!line) refuse(`${TASK} has no "${name}:" line`);
}

if (/grep/i.test(filesLine)) refuse(`${TASK} Files: line says grep; Haiku-tier tasks must list exact paths`);
const tokens = [...filesLine.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
if (tokens.length === 0) refuse(`${TASK} Files: line has no backticked paths`);
const files = [];
for (const t of tokens) {
  if (!/^[A-Za-z0-9_./@-]+$/.test(t) || t.endsWith('/') || t.includes('..') || t.startsWith('/') || !/\.[A-Za-z0-9]+$/.test(t)) {
    refuse(`${TASK} Files: entry \`${t}\` is not an exact file path`);
  }
  files.push(t);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/task.md`, [heading, ...body].join('\n').trimEnd() + '\n');
writeFileSync(`${OUT}/files.json`, JSON.stringify([...new Set(files)], null, 2));
console.log(`preflight ok: ${PLAN} ${TASK}, ${files.length} file(s)`);
