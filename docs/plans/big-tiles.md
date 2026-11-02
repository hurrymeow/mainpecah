# Big tiles: boards built around 8s and 16s

Follow-up to `docs/plans/big-boards.md` (the one item left: "boards built around one or two 8s or 16s"). Go given by Hari 2026-11-02 ("go do using ds"). Design calls are in `decisions/big-tiles-calls.md`.

## Goal

From stage 48, every board has at least one 8, and some have a 16, so big fights compete for space with the small ones.

## Why

Measured on main: stages 47-100 average 0.04 tiles of 8 or more per board, and no 16s. The backward build merges random neighbours, so nearly every final tile is a 1, 2 or 4.

## Decisions and why

- **Seed big tiles first.** Before the random merges, build one tile of the wanted size from a blob of free 1-cells. The build splits the tile in two, then splits each half, claiming one free neighbour cell per split. Those cells become empty, so the big fight has room to split. Merges are recorded in order, so the replayed solution still works.
- **Same swipe budget.** A big tile just uses up part of the merges the target already asks for. Stages below 47 are untouched (no `big` key, no extra rand calls).
- **Which stages.** Stages 48-100 (0-based 47-99): one 8. Every tenth stage (0-based `k % 10 === 9`): two 8s. Normal stages 60, 80 and 100 (`k % 20 === 19`): one 16 instead. Casual never gets a 16, its stages are too short (about 16 swipes, a 16 alone needs 15).
- **Stage 47** is an authored teach board and stays as it is.
- **Arrivals** may pick a big tile. That is fine and makes a big fight land mid-stage.

## Tasks

Order: T1 → T2 → T3. T3 is done by hand because it runs the scorecard.

### T1. Generator builds big tiles first (Sonnet, executor trial)
- Files: `index.html`, `test/selftest.cjs`
- Exact changes: in `index.html`, insert this function directly above the comment line `// Pick final fights to hold back as mid-stage arrivals.`:
```js
// Build one tile of `size` (8 or 16) from free 1-cells: split it in two, then split each half,
// claiming a free neighbour per split. Claimed cells end up empty. Merges are pushed in forward order.
function growBig(v, n, h, size, rand, merges) {
  for (let tries = 0; tries < 40; tries++) {
    const free = [];
    for (let i = 0; i < n * h; i++) if (v[i] === 1) free.push(i);
    if (!free.length) return false;
    const root = free[Math.floor(rand() * free.length)];
    const claimed = new Set([root]), made = [];
    const build = (cell, s) => {
      if (s === 1) return true;
      const opts = [];
      for (const j of [cell % n ? cell - 1 : -1, cell % n < n - 1 ? cell + 1 : -1, cell - n, cell + n]) {
        if (j >= 0 && j < n * h && v[j] === 1 && !claimed.has(j)) opts.push(j);
      }
      if (!opts.length) return false;
      const j = opts[Math.floor(rand() * opts.length)];
      claimed.add(j);
      if (!build(cell, s / 2) || !build(j, s / 2)) return false;
      made.push({ keep: cell, gone: j });
      return true;
    };
    if (!build(root, size)) continue;
    for (const i of claimed) v[i] = 0;
    v[root] = size;
    merges.push(...made);
    return true;
  }
  return false;
}
```
  In `generate`, replace the line `    let tiles = n * h - locked.length;` with these two lines: `    let tiles = n * h - locked.length;` and `    for (const size of extra.big || []) if (growBig(v, n, h, size, rand, merges)) tiles -= size - 1;`. Also change the comment line `// extra = { cracks, grumpy, cushions }: how many of each to add once the board is built.` to `// extra = { cracks, grumpy, cushions, arrivals, big }: how many of each to add; big is a list of tile sizes to build first, e.g. [8, 8].`.
  In `test/selftest.cjs`, replace the line `if (mod.exports.ARRIVALS_FROM !== 46) { console.log('ARRIVALS_FROM should be 46'); fail = true; }` with itself followed by this block (and add `generate` and `seeded` to the `module.exports` object in `index.html` only if they are not exported already; they are):
```js
for (const [sizes, want] of [[[8], 8], [[16], 16], [[8, 8], 8]]) {
  let miss = 0;
  for (let s = 0; s < 100; s++) {
    const b = mod.exports.generate(7, 38, mod.exports.seeded(900 + s), 8, 0, { big: sizes });
    const vals = b.cells.map(t => (t ? t.v : 0));
    if (vals.filter(v => v >= want).length < sizes.length) miss++;
  }
  if (miss > 5) { console.log(`big ${JSON.stringify(sizes)}: ${miss}/100 boards missing a big tile`); fail = true; }
}
```
- Done when: `node test/selftest.cjs` and `node test/e2e.cjs` exit 0. Boards of stages 1-46 are unchanged (selftest replay stays green).
- Don't touch: `stageBoard`, `stageExtras`, `EARLY_PICK`, the UI, `tools/scorecard/`, `docs/`.

### T2. Stages 48-100 ask for big tiles (Sonnet, executor trial)
- Files: `index.html`, `test/selftest.cjs`
- Exact changes: in `index.html`, inside `stageBoard`, replace the line `    const extra = j >= ARRIVALS_FROM ? { ...ex, arrivals: 2 } : ex;` with these two lines: `    const big = j % 20 === 19 && mode !== 'casual' ? [16] : j % 10 === 9 ? [8, 8] : [8]; // big tiles to build first (stages 48+)` and `    const extra = j >= ARRIVALS_FROM ? { ...ex, arrivals: 2, big } : ex;`.
  In `test/selftest.cjs`, directly after the `let boardsFail = false;` line, insert:
```js
for (const mode of ['casual', 'challenge']) {
  for (let k = mod.exports.ARRIVALS_FROM + 1; k < mod.exports.STAGES.length; k++) {
    const b = mod.exports.stageBoard(mode, k);
    const vals = b.cells.map(t => (t ? t.v : 0)).concat((b.arrivals || []).map(a => a.v));
    const want = k % 20 === 19 && mode !== 'casual' ? 16 : 8;
    if (!vals.some(v => v >= want)) { console.log(`${mode} stage ${k + 1}: no tile of ${want} or more`); boardsFail = true; }
  }
}
```
- Done when: `node test/selftest.cjs` and `node test/e2e.cjs` exit 0. If e2e fails only because a test relied on one specific board, fix the test to pick the board by its own data, not by changing the generator.
- Don't touch: `EARLY_PICK`, `CASUAL_TILES`, `generate`, `tools/scorecard/`, `docs/`.

### T3. Rerun picks, tables and the scorecard (Sonnet, by hand)
- Files: `index.html` (`EARLY_PICK`, `CASUAL_TILES`, fuse table), `GAME-DESIGN.md`, `decisions/big-tiles-calls.md`
- Exact changes: rerun in the order from GAME-DESIGN.md: `MODE=challenge` fair-picks, tile-table, `MODE=casual` fair-picks, fuse-table, then `npm run scorecard`. Paste the printed tables into `index.html`. Note the new big-tile share in GAME-DESIGN.md.
- Done when: scorecard shows Pass 24 and only S1 failing (by design); selftest and e2e pass.
- Don't touch: stages 1-46 boards.
