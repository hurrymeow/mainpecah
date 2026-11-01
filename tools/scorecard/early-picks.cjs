// Picks the generator attempt for each of the first three stages (M3, M4), per mode.
// A stage keeps the first attempt whose layout the rookie bot wins in >= 97% of 200 seeds. Stage 1 must also take 30-90 s.
// Usage: node tools/scorecard/early-picks.cjs   (prints the EARLY_PICK object for index.html)
const L = require('./lib.cjs');
const STAGES = 3, SEEDS = 200, ATTEMPTS = Number(process.env.ATTEMPTS || 60);
const picks = { casual: {}, challenge: {} };
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
for (const mode of ['casual', 'challenge']) {
  for (let k = 0; k < STAGES; k++) {
    let found = null, bestRate = -1, bestA = 0;
    for (let a = 0; a < ATTEMPTS && found == null; a++) {
      const g = L.loadGame();
      Object.assign(g.EARLY_PICK[mode], picks[mode], { [k]: a });
      const board = g.stageBoard(mode, k), fuseS = L.fuseSecondsFor(g, mode, k);
      let wins = 0; const times = [];
      for (let s = 0; s < SEEDS; s++) {
        const r = L.play(g, board, { fuseS, chooser: L.rookie(g, L.rng(1000 + s * 7919 + k)), maxSteps: 150 });
        if (r.won) { wins++; times.push(r.t); }
      }
      const rate = wins / SEEDS, med = median(times), okTime = k > 0 || (med >= 30 && med <= 90);
      if (okTime && rate > bestRate) { bestRate = rate; bestA = a; }
      if (rate >= 0.97 && okTime) found = a;
    }
    picks[mode][k] = found != null ? found : bestA;
    console.error(`${mode} stage ${k + 1}: attempt ${picks[mode][k]}${found != null ? ' ok' : ' best rate ' + bestRate.toFixed(2)}`);
  }
}
console.log(JSON.stringify(picks));
