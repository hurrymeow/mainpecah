// npm run scorecard: one row per GAME-DESIGN.md checklist item. Seeded and deterministic: same seed, same output.
// Usage: node tools/scorecard/index.cjs [--json out.json] [--seed N]
const fs = require('fs');
const L = require('./lib.cjs');
const P = require('./page.cjs');
const Model = require('./checks-model.cjs');
const Page = require('./checks-page.cjs');
const { table } = require('./report.cjs');

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const ORDER = ['S1', 'S3', 'S4', 'S5', ...Array.from({ length: 21 }, (_, i) => 'M' + (i + 1)).filter(x => x !== 'M11')];

(async () => {
  const seed = +(arg('--seed') || process.env.SCORECARD_SEED || L.SEED);
  const g = L.loadGame();
  const pw = P.loadPlaywright();
  const browser = pw ? await pw.chromium.launch() : null;
  let intro = null;
  if (browser) intro = await Page.intro(browser, g);
  const model = Model.run(g, { seed, introS: intro ? { casual: intro.casual.introS, challenge: intro.challenge.introS } : {} });
  let rows = model.rows;
  if (browser) {
    rows = rows.concat(await Page.run(browser, g, model, intro));
    await browser.close();
  } else {
    for (const [id, title] of [['M1', 'First swipe fast'], ['M2', 'Few words before playing'], ['S3', 'An interruption costs nothing'], ['S4', 'Restart is instant'], ['S5', 'One thumb, one glance'], ['M12', 'Fair fuse'], ['M13', 'Stuck is never silent'], ['M17', "Hints help, they don't play"], ['M19', 'A reason to open it tomorrow']]) {
      rows.push({ id, title, result: 'Unknown', measured: 'Playwright not installed', target: '' });
    }
  }
  rows.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const missing = ORDER.filter(id => !rows.some(r => r.id === id));
  if (missing.length) throw new Error('no row for ' + missing.join(', '));
  console.log(table(rows, `Kaboom Kitty scorecard (seed ${seed})`));
  const out = arg('--json');
  if (out) fs.writeFileSync(out, JSON.stringify(rows.map(({ id, result, measured }) => ({ id, result, measured })), null, 2) + '\n');
})().catch(e => { console.error(e); process.exit(2); });
