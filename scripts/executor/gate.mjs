// Mechanical diff gate for the DeepSeek executor. Runs in the publish job; no model, no write to GitHub here.
// Env: PLAN, TASK, PF (preflight dir), ART (artifact dir with patch, report.json, usage.json), OUT (output dir),
//      KEY (DeepSeek key, only for the leak scan), RUN_URL, ACTOR.
// Writes OUT/verdict.json, OUT/pr-body.md, OUT/question.md. Leaves an applied, staged diff in the working tree when ok.
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { scanText } from './keyscan.mjs';

const { PLAN, TASK, PF, ART, OUT, KEY = '', RUN_URL = '', ACTOR = '' } = process.env;
mkdirSync(OUT, { recursive: true });

const MAX_FILES = 12;
const MAX_LINES = 400;
const HARD_DENY = [
  /^TODO\.md$/, /^DECISIONS\.md$/, /^PROGRESS\.md$/,
  /^\.github\//, /^scripts\/executor\//,
  /(^|\/)package(-lock)?\.json$/, /(^|\/)(yarn\.lock|pnpm-lock\.yaml)$/,
  /-snapshots\//,
  // Kaboom Kitty: PWA plumbing, art and project rules the model must never touch.
  /^sw\.js$/, /^manifest\.json$/,
  /^assets\//, /^icons\//,
  /\.(png|jpe?g|gif|webp|svg|ico|mp3|wav|ogg)$/i,
  /^(CLAUDE|AGENTS)\.md$/, /^\.gitignore$/,
];

const summary = (s) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + '\n');
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
function verdict(v, reason, extra = {}) {
  writeFileSync(`${OUT}/verdict.json`, JSON.stringify({ verdict: v, reason, ...extra }, null, 2));
  summary(`### Executor gate: ${v}\n${reason}`);
  console.log(`gate ${v}: ${reason}`);
  process.exit(0);
}

const allowed = new Set(JSON.parse(readFileSync(`${PF}/files.json`, 'utf8')));
allowed.add(`decisions/${PLAN}-${TASK}.md`);
allowed.add(`progress/${PLAN}-${TASK}.md`);

// 1. report.json
let report;
try {
  report = JSON.parse(readFileSync(`${ART}/report.json`, 'utf8'));
  if (!['done', 'stopped', 'failed'].includes(report.status)) throw new Error('bad status');
} catch {
  report = { status: 'failed', summary: 'report.json missing or invalid', checks: [] };
}
const patchPath = `${ART}/patch.diff`;
const patch = existsSync(patchPath) ? readFileSync(patchPath) : Buffer.alloc(0);

// 2. key scan over everything that can reach GitHub
const reportText = JSON.stringify(report);
if (KEY.length >= 8 && (scanText(patch.toString('latin1'), KEY) || scanText(patch.toString('utf8'), KEY) || scanText(reportText, KEY))) {
  verdict('reject', 'KEY LEAK in patch or report. No PR opened. Rotate DEEPSEEK_API_KEY now.');
}

// 3. no diff
if (patch.length === 0) {
  if (report.status === 'done') verdict('reject', 'status done but the patch is empty');
  writeFileSync(`${OUT}/question.md`, questionText());
  verdict('issue', `status ${report.status}, no diff`, { status: report.status });
}

// 4. apply and inspect
try {
  execFileSync('git', ['apply', '--index', '--binary', patchPath], { stdio: 'pipe' });
} catch (e) {
  verdict('reject', `patch does not apply to main: ${String(e.stderr || e.message).split('\n')[0]}`);
}
const rows = git('diff', '--cached', '--numstat', '--no-renames').trim().split('\n').filter(Boolean).map((l) => l.split('\t'));
const reject = (reason) => {
  git('reset', '-q', '--hard');
  verdict('reject', reason);
};
if (rows.some((r) => r[0] === '-')) reject('binary change in patch');
if (rows.length > MAX_FILES) reject(`${rows.length} files changed, cap is ${MAX_FILES}`);
const lines = rows.reduce((n, r) => n + Number(r[0]) + Number(r[1]), 0);
if (lines > MAX_LINES) reject(`${lines} changed lines, cap is ${MAX_LINES}`);
for (const [, , path] of rows) {
  if (HARD_DENY.some((re) => re.test(path))) reject(`hard-denied path: ${path}`);
  if (!allowed.has(path)) reject(`path not in the task's Files: list: ${path}`);
}
const modes = git('diff', '--cached', '--raw', '--no-renames').split('\n').filter(Boolean);
if (modes.some((l) => /^:\d+ 120000|^:120000 /.test(l) || / 120000 /.test(l))) reject('symlink in patch');

// 5. PR body
let usage = {};
try { usage = JSON.parse(readFileSync(`${ART}/usage.json`, 'utf8')); } catch { /* none */ }
const { input = 0, cacheRead = 0, cacheWrite = 0, output = 0, turns = 0 } = usage;
const missIn = Math.max(0, input) + Math.max(0, cacheWrite);
// $ per 1M tokens, DeepSeek Flash list prices: input miss 0.30/0.15, cache hit 0.006/0.003, output 1.20/0.60 (peak/off-peak)
const peak = (missIn * 0.30 + cacheRead * 0.006 + output * 1.20) / 1e6;
const off = (missIn * 0.15 + cacheRead * 0.003 + output * 0.60) / 1e6;
const fmt = (n) => `$${n.toFixed(3)}`;
const checks = Array.isArray(report.checks) ? report.checks : [];
const body = [
  `Executor run for \`${PLAN}\` ${TASK}. Plan: [docs/plans/${PLAN}.md](https://github.com/${process.env.GITHUB_REPOSITORY || ''}/blob/main/docs/plans/${PLAN}.md). Dispatched by @${ACTOR.replace(/[^A-Za-z0-9-]/g, '')}. [Run](${RUN_URL}).`,
  '',
  `**Status:** ${report.status}${report.status === 'done' ? '' : ' (draft PR; see first comment)'}`,
  '',
  '## Model summary',
  String(report.summary || '(none)').slice(0, 3000),
  '',
  `## Files (${rows.length}, ${lines} changed lines)`,
  ...rows.map((r) => `- \`${r[2]}\` +${r[0]} -${r[1]}`),
  '',
  '## Checks the model ran',
  ...(checks.length ? checks.map((c) => `- \`${String(c.cmd).slice(0, 200)}\`: exit ${Number(c.exit)}`) : ['- none reported']),
  '',
  '## Usage',
  `${turns} turns, ${input} input, ${cacheWrite} cache write, ${cacheRead} cache read, ${output} output tokens.`,
  `Computed spend: **${fmt(off)}** off-peak, **${fmt(peak)}** peak (DeepSeek Flash list prices; Claude Code's own cost figure is wrong for this backend).`,
  '',
  '## Review',
  'Auto-merge is **not** enabled. Review the full diff against the task\'s Exact changes and Don\'t touch, then merge.',
].join('\n');
if (KEY.length >= 8 && scanText(body, KEY)) reject('KEY LEAK in PR body. No PR opened. Rotate DEEPSEEK_API_KEY now.');
writeFileSync(`${OUT}/pr-body.md`, body + '\n');
if (report.status !== 'done') writeFileSync(`${OUT}/question.md`, questionText());
verdict('pr', `status ${report.status}, ${rows.length} files, ${lines} lines`, { status: report.status });

function questionText() {
  const opts = Array.isArray(report.options) ? report.options.map((o) => `- ${String(o).slice(0, 300)}`) : [];
  return [
    `Executor ${report.status} on \`${PLAN}\` ${TASK}.`,
    '',
    String(report.question || report.summary || '(no detail given)').slice(0, 3000),
    ...(opts.length ? ['', 'Options the model saw:', ...opts] : []),
    '',
    `[Run](${RUN_URL}). Answer in the plan file, then re-dispatch.`,
  ].join('\n');
}
