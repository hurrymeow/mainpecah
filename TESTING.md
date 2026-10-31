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
- Until `nightly.yml`, `npm run scorecard` and `npm run ui-check` exist, this section is the target. See [docs/plans/game-quality-baseline.md](docs/plans/game-quality-baseline.md) task T5.
