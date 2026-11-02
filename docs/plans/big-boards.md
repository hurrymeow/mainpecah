# Big boards: arrivals and fewer, brainier swipes

Agreed with Hari 2026-11-01 (planning thread "Make big boards less tedious"). Go given 2026-11-02.
Full analysis: `/mnt/project-files/big-boards/arrivals-deep-dive.md` (project files).

## Goal

From stage 47, a stage feels like thinking, not just doing steps. Each stage takes fewer swipes, and new fights arrive mid-stage so the player has to re-plan.

## Why

- Measured at b3e5ebb: stages 47–100 are all 7x8 boards with 27–31 swipes (Normal) and 23–26 (Casual), about 2.5 min each.
- Each fight fills about 3 cells, so a board is a dozen small local puzzles. About 45% of swipes can only go one way.
- Every board is fixed and fully visible. Once you see the plan, the rest is just carrying it out. 2048 and Candy Crush show something new each move, so the player keeps re-planning.

## Decisions and why

- **Arrivals.** A seeded queue per stage. A "Next" chip shows the next fight and its landing cell. Seeded so everyone gets the same stage, and the scorecard can still prove it solvable and unique (M18).
- **Generator.** Arrivals are fights removed during the existing backward build. The recorded solution then includes the landings, so no solver is needed.
- **Trigger: net splits** (splits minus rejoins). Rejoining can't pull arrivals in early, and a rejoin never undoes an arrival.
- **Landing cell taken: the arrival waits** in Next until the cell is free. Rejoin can always free it. Landing elsewhere could make the board unsolvable.
- **Start at stage 47** (k = 46). That's where the board stops growing and where the tedium starts. It also helps M16.
- **Combine** with a swipe cap (about 18 Normal and 15 Casual on stages 47+), and boards built around one or two 8s or 16s, so big fights compete for space.
- **"Brainy" metric** replaces wrong options per swipe in fair-picks and M10. Today's measure rises with board size, so big boards score "hard" even when every wrong move is obviously wrong.
- **M15 lowered** to Casual 1.5–2.5 h and Normal 2–3 h. Shorter stages suit the commute (S1). Normal stays about 1.25x Casual (M20).
- **Kept:** 60 s fuse cap, focus rule, S2 retired. Arrivals get a fresh fuse, and the focus rule holds them when they land away from the last swipe.
- **Parked:** 32 boss stages (need `MAX_TILE` above 16), Endless mode, daily-board arrivals, runtime hint solver.

## Tasks

Order matters: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9. Executor-ready tasks are tagged (Haiku). The rest need code reading and go to Sonnet threads.

### T1. Add the arrivals start constant (Haiku)
- Files: `index.html`, `test/selftest.cjs`
- Exact changes: In `index.html`, replace the line `const DAILY_FROM = 10;` with two lines: `const DAILY_FROM = 10;` and `const ARRIVALS_FROM = 46; // stage 47 (0-based): new fights arrive mid-stage from here`. In `index.html`, replace `DAILY_FROM, FOCUS_FROM,` with `DAILY_FROM, ARRIVALS_FROM, FOCUS_FROM,`. In `test/selftest.cjs`, replace `process.exit(fail ? 1 : 0);` with two lines: `if (mod.exports.ARRIVALS_FROM !== 46) { console.log('ARRIVALS_FROM should be 46'); fail = true; }` and `process.exit(fail ? 1 : 0);`.
- Done when: `node test/selftest.cjs` exits 0 and `node test/e2e.cjs` exits 0.
- Don't touch: everything except `index.html`, `test/selftest.cjs`, `decisions/big-boards-T1.md` and `progress/big-boards-T1.md`.

### T2. Generator emits arrivals (Sonnet, executor trial)
- Files: `index.html`, `test/selftest.cjs`, `test/e2e.cjs`
- Where to look: `index.html` (`generate`, `stageBoard`, `shapeKey`, `keyOf`, `selfTest`), `test/selftest.cjs`, `test/e2e.cjs` (solution replay, ~line 621–628).
- Exact changes: in the backward build for stages `>= ARRIVALS_FROM`, remove some merged fights and record `board.arrivals = [{ at, cell, v }]`, where `at` is the net split count. Add `applyArrivals(cells, arrivals, splits)`. `shapeKey` includes arrivals. Path keys include the queue index, so hints still match. Stages below 47 stay byte-identical.
- Done when: selftest and e2e replay every stage including arrivals; stages 1–46 boards unchanged (compare `shapeKey` before and after).
- Don't touch: UI, fuses, scorecard.
- Call (executor stopped, answered 2026-11-02): T2 stays generator-only. Do not add any game-loop arrival placement. To keep e2e green, change the interactive hint-solve in the e2e test 'Oblong boards' from stage 100 to stage 31 (6x7). T3 restores stage-100 interactive coverage.

### T3. Game loop, win, save (Sonnet, executor trial)
- Files: `index.html`, `test/e2e.cjs`
- Where to look: `index.html` (`move`, `merge`, `isWin`, `restart`, `packCells`, `saveBoard`, `restoreSaved`, `nextHint`), `test/e2e.cjs`.
- Exact changes: state gets a net split counter and queue index. After each split, drop the due arrival if its cell is free, otherwise it waits. Rejoin lowers the counter but never removes a landed fight. Win also requires an empty queue. Save and restore keep the counter and queue (S3). Restart resets them (S4). A landed fight gets a fresh fuse in Normal.
- Done when: an e2e test plays a stage-47 board by its solution and wins; a kill and reload mid-stage restores the queue.
- Don't touch: generator, scorecard.

### T4. Next chip, marked cell, teach stage (Sonnet, executor trial)
- Files: `index.html`, `test/e2e.cjs`
- Where to look: `index.html` (markup, CSS, `render`, `TEACH`), `test/e2e.cjs`.
- Exact changes: a "Next" chip showing the arriving fight and the splits left, in thumb reach (S5, UI.md). The landing cell is outlined. A clear waiting state when the cell is taken. Drop animation and sound. Authored teach board for stage 47 where filling the marked cell fails (M8).
- Done when: e2e passes; screenshot of stage 47 posted before shipping; ui-check passes.
- Don't touch: generator logic beyond the teach board, scorecard.
- Call (2026-11-02, Hari away): the executor cannot take screenshots or run ui-check, so for the executor run the done-check is `node test/selftest.cjs` and `node test/e2e.cjs` passing with a new e2e test that stage 47 shows the Next chip and an outlined landing cell, and shows the waiting state when the cell is taken. The executor thread takes the screenshot and runs ui-check after merge. Chip placement: above the board, left aligned, under the header, so it sits in thumb reach on a phone (S5). Teach board for stage 47: pick the simplest authored board where the first arrival's marked cell is empty at the start and filling it makes the stage unwinnable; if none is found by reading how `TEACH` entries are built, skip the teach board and say so in the report summary.

### T5. Scorecard bots play arrivals (Sonnet, executor trial)
- Files: `tools/scorecard/lib.cjs`, `tools/scorecard/checks-model.cjs`
- Where to look: `tools/scorecard/lib.cjs` (`play`, `builder`, `urgentBuilder`, `rookie`, `builderStage`), `tools/scorecard/checks-model.cjs`.
- Exact changes: every bot applies arrivals in its playthrough, using the same rule as the game. The time model counts arrival kittens' swipes.
- Done when: `npm run scorecard` runs end to end; rows other than S1, M10, M12, M15 and M20 keep their current state.
- Don't touch: `index.html`.
- Call (2026-11-02, Hari away): the executor may only run `node test/selftest.cjs` and `node test/e2e.cjs`, so it cannot run the scorecard. Done-check for the executor run: both pass and `node -e "require('./tools/scorecard/lib.cjs')"` is not allowed either, so read the code carefully instead. The executor thread runs `npm run scorecard` after merge and fixes breakage in a follow-up. Use `applyArrivals` and the `arrivals` array exactly as `index.html` does in `landArrivals` (net splits `at`, wait if the landing cell is taken).

### T6. Brainy metric and row (Sonnet, executor trial)
- Files: `tools/scorecard/lib.cjs`, `tools/scorecard/checks-model.cjs`, `tools/scorecard/fair-picks.cjs`, `GAME-DESIGN.md`
- Where to look: `tools/scorecard/lib.cjs`, `tools/scorecard/checks-model.cjs`, `tools/scorecard/fair-picks.cjs`, `GAME-DESIGN.md`.
- Exact changes: a delayed-trap measure: the share of solution swipes where a sensible-looking split leaves the board solvable for 1–2 swipes, then dead-ends 3 or more swipes later. Use bounded look-ahead so 7x8 stays fast. Calibrate on today's boards first. Then add a row (proposed: at least 30% on stages 47+) and use it in place of wrong options per swipe in fair-picks and M10.
- Done when: the row reports for both modes in under about 2 min; GAME-DESIGN.md records the threshold and the calibration numbers.
- Don't touch: `index.html`.

### T7. How to play page for arrivals (Haiku)
- Files: `index.html`
- Exact changes: In `index.html`, replace `<p><b class="warn">Big boards:</b> only fights near your last swipe burn. The rest wait.</p></li>` with two lines: the same text unchanged, then `      <li id="howtoArrive" data-from="46"><div class="pics"><span class="cot" data-kit="fight4"></span><i>›</i><span class="cot"><span class="box"></span></span></div><p><b>New fights:</b> a marked cell shows where the next fight lands. Keep it free.</p></li>`.
- Done when: `node test/selftest.cjs` exits 0 and `node test/e2e.cjs` exits 0.
- Don't touch: everything except `index.html`, `decisions/big-boards-T7.md` and `progress/big-boards-T7.md`. Run only after T4 has merged.

### T8. Tune stages 47+ and rerun (Sonnet, executor trial)
- Files: `index.html`, `tools/scorecard/tile-table.cjs`, `tools/scorecard/fair-picks.cjs`, `tools/scorecard/fuse-table.cjs`, `GAME-DESIGN.md`
- Where to look: `index.html` (`STAGES`, `LADDER`, `CASUAL_TILES`, `FUSES`, `EARLY_PICK`, picks tables), `tools/scorecard/tile-table.cjs`, `tools/scorecard/fair-picks.cjs`, `tools/scorecard/fuse-table.cjs`, `GAME-DESIGN.md`.
- Exact changes: swipe cap of about 18 Normal and 15 Casual including arrivals. Boards built around one or two 8s or 16s. An arrival schedule per 10-stage band (sawtooth, M10). Then the rerun order: early-picks, `MODE=challenge` fair-picks, tile-table, `MODE=casual` fair-picks, fuse-table.
- Done when: full scorecard is Pass for every row except S1 stages 1–3 (on purpose) and M15 (fixed in T9); 60 s fuse cap holds; dawdler loses 10–30% (M20).
- Don't touch: stages 1–46 boards.

### T9. Lower the M15 band (Haiku)
- Files: `tools/scorecard/checks-model.cjs`, `GAME-DESIGN.md`
- Exact changes: In `tools/scorecard/checks-model.cjs`, replace `inBand(h[0], [2.5, 4]) && inBand(h[1], [3, 5])` with `inBand(h[0], [1.5, 2.5]) && inBand(h[1], [2, 3])`, and replace `'Casual 2.5-4 h, Normal 3-5 h'` with `'Casual 1.5-2.5 h, Normal 2-3 h'`. In `GAME-DESIGN.md`, replace `- Test: builder finishes in **2.5–4 h** Casual and **3–5 h** Normal.` with `- Test: builder finishes in **1.5–2.5 h** Casual and **2–3 h** Normal. Lowered 2026-11-02 (Hari go): shorter stages suit the commute, and arrivals keep each one brainy.`
- Done when: `node test/selftest.cjs` exits 0. Run only after T8 has merged.
- Don't touch: everything except `tools/scorecard/checks-model.cjs`, `GAME-DESIGN.md`, `decisions/big-boards-T9.md` and `progress/big-boards-T9.md`.

## Open questions

- Auto-sleep: should a 2 with exactly one free neighbour sleep on its own? Not yet approved. Ask after T8 if the stages still feel too long.
- Brainy threshold: is 30% right? T6 calibrates and reports the number before the row goes live.
- Hints: arrivals push players off the solution path more often. Is "off the path" acceptable, or do we build a runtime solver?
- Casual: do arrivals start at stage 47 in Casual too? The plan assumes yes.
