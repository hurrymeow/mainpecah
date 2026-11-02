// Run: node test/selftest.cjs  — extracts the game script from index.html and checks 1000 boards per size.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const mod = { exports: {} };
vm.runInNewContext(src, { module: mod, Math, console });
const r = mod.exports.selfTest(1000);
let fail = false;
for (const [n, x] of Object.entries(r)) {
  console.log(`${n}x${n}: sum ${x.sum}/${x.boards}, max<=16 ${x.cap}/${x.boards}, solution reaches all-1s ${x.solved}/${x.boards} (hit exact tile target ${x.hitTarget}/${x.boards})`);
  if (x.sum !== x.boards || x.cap !== x.boards || x.solved !== x.boards) fail = true;
}
if (mod.exports.ARRIVALS_FROM !== 46) { console.log('ARRIVALS_FROM should be 46'); fail = true; }

// Every stage must replay its recorded solution, landing arrivals at their net split count.
let boardsFail = false;
for (const mode of ['casual', 'challenge']) {
  for (let k = 0; k < mod.exports.STAGES.length; k++) {
    const b = mod.exports.stageBoard(mode, k), ar = b.arrivals || [];
    if (k < mod.exports.ARRIVALS_FROM) {
      if (ar.length || mod.exports.shapeKey(b.n, b.cells, b.arrivals) !== mod.exports.shapeKey(b.n, b.cells)) {
        console.log(`${mode} stage ${k + 1}: arrivals changed a stage below 47`); boardsFail = true;
      }
    } else if (!ar.length) {
      console.log(`${mode} stage ${k + 1}: no arrivals`); boardsFail = true;
    }
    let cur = b.cells, q = 0;
    for (let i = 0; i < b.solution.length; i++) {
      while (q < ar.length && ar[q].at <= i) {
        const next = mod.exports.applyArrivals(cur, ar.slice(q), i);
        if (next === cur) break; // landing cell taken: waits
        cur = next; q++;
      }
      cur = mod.exports.applyStep(cur, b.n, b.solution[i]);
      if (!cur) break;
    }
    if (!cur || q !== ar.length || !mod.exports.isWin(cur, b.n)) {
      console.log(`${mode} stage ${k + 1}: solution replay failed (${q}/${ar.length} arrivals)`); boardsFail = true;
    }
  }
}
if (boardsFail) fail = true;
process.exit(fail ? 1 : 0);
