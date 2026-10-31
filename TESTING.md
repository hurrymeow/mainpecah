# Kaboom Kitty: testing

What agents test and when. Agreed with Hari on 2026-10-31. Linked from [AGENTS.md](AGENTS.md).

## What runs when

| When | What | Where |
|---|---|---|
| Before every push | `node test/selftest.cjs`, `node test/e2e.cjs` | Agent, locally |
| Every push to main | Same two tests | `ci.yml` (exists) |
| Nightly, 02:00 SGT | `npm run scorecard` (GAME-DESIGN.md), `npm run ui-check` (UI.md) | New `nightly.yml` |
| Visual change | One screenshot per screen touched, shown to Hari before shipping | Agent |

No recurring agent loops. Nightly checks run in GitHub Actions, not in an agent session.

## What agents test

- **Logic:** generator, solvability, split and rejoin rules. Covered by selftest and e2e.
- **Game quality:** each GAME-DESIGN.md item has one scorecard row: Pass, Fail or Unknown, with the measured value.
- **UI:** each UI.md item has one ui-check row, same format.
- **Regressions:** an agent that changes game rules or the stage table runs the scorecard locally before pushing.

## Rules

- Keep every element id the tests use.
- Never loosen a threshold or skip a test to get green. Fix the cause.
- A Fail is fixed in its own PR, linked to its row.
- Same seed, same output. A flaky row is a bug in the harness.

## Nightly results

- Results go to the Actions job summary.
- One rolling GitHub issue, "Nightly scorecard", is updated only when a row changes state (Pass, Fail or Unknown).
- Run locally: `npm run scorecard` (about 1 min) and `npm run ui-check` (about 30 s). Both print a Markdown table.
- Code: `tools/scorecard/`. Same seed, same output. Default seed is in `lib.cjs`; override with `--seed N`.

## How the scorecard measures

- Time is modeled, never read from the clock: 0.8 s per swipe, 0.4 s per option, 4 words/s, 2 s per tap.
- An "option" is a fight that can move, not each (tile, direction) pair. Counting pairs puts a 7x8 stage at 8+ min.
- **builder** replays the generator's recorded solution (an upper bound on the shortest). Under Normal fuses it reorders by urgency.
- **rookie** picks a random split that does not leave the board stuck, and rejoins when no split is left. 200 seeds per stage.
- **hint-follower** is the builder driven through the hint path.
- Difficulty (S2, M10) is wrong turns on offer per solution swipe: legal splits minus the one the solution takes. It stands in for dead-end branches, which are too costly to search on 7x8.
- Page rows (M1, M2, S3, S4, S5, M12, M13, M17, M19) and every ui-check row run in Playwright on a fake clock.
- A row is Unknown when part of its test is not built yet. The row's note says which part.
