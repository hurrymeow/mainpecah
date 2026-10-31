// Nightly step: compare today's scorecard and ui-check rows with the last run, and update one rolling issue
// ("Nightly scorecard") only when a row changes state (Pass, Fail or Unknown). The last state lives in the issue body.
// Usage: node tools/scorecard/nightly.cjs scorecard.json ui-check.json   (env: GITHUB_TOKEN, GITHUB_REPOSITORY, DRY_RUN=1)
const fs = require('fs');
const [, , scoreFile, uiFile] = process.argv;
const TITLE = 'Nightly scorecard';
const MARK = /<!-- state:(\{.*?\}) -->/;

const rows = [...JSON.parse(fs.readFileSync(scoreFile, 'utf8')), ...JSON.parse(fs.readFileSync(uiFile, 'utf8'))];
const state = Object.fromEntries(rows.map(r => [r.id, r.result]));
const cell = s => String(s).replace(/\|/g, '/').replace(/\s+/g, ' ');
const body = [
  'Updated only when a row changes state. Details are in the job summary of the latest [nightly run](' + (process.env.GITHUB_SERVER_URL || 'https://github.com') + '/' + (process.env.GITHUB_REPOSITORY || '') + '/actions/workflows/nightly.yml).',
  '',
  '| ID | Result | Measured |', '|---|---|---|',
  ...rows.map(r => `| ${r.id} | ${r.result} | ${cell(r.measured)} |`),
  '',
  `<!-- state:${JSON.stringify(state)} -->`,
].join('\n');

async function api(method, path, data) {
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    method,
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

(async () => {
  if (process.env.DRY_RUN) { console.log(body); return; }
  const issues = await api('GET', '/issues?state=all&per_page=100&creator=github-actions%5Bbot%5D');
  const issue = issues.find(i => !i.pull_request && i.title === TITLE);
  if (!issue) {
    await api('POST', '/issues', { title: TITLE, body });
    console.log('Created the rolling issue.');
    return;
  }
  const prev = (issue.body.match(MARK) || [])[1];
  const before = prev ? JSON.parse(prev) : {};
  const changed = Object.keys(state).filter(id => before[id] !== state[id]);
  if (!changed.length) { console.log('No row changed state. Issue left alone.'); return; }
  await api('PATCH', `/issues/${issue.number}`, { body, state: 'open' });
  await api('POST', `/issues/${issue.number}/comments`, { body: 'Changed: ' + changed.map(id => `${id} ${before[id] || 'new'} -> ${state[id]}`).join(', ') });
  console.log('Updated the rolling issue: ' + changed.join(', '));
})().catch(e => { console.error(e); process.exit(2); });
