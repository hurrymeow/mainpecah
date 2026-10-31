# Plan: game-quality baseline and scorecard

Owner: **Hari**. Written 2026-10-31.

## Goal

Set a baseline for what makes Kaboom Kitty good for a commuter. Then measure the game against it automatically, and fix what fails.

- Baseline: [GAME-DESIGN.md](../../GAME-DESIGN.md), section "Mechanics checklist". Items S1–S5 and M1–M21 (no M11).
- Research: [research/reference-games.md](../../research/reference-games.md).

## Decisions and why

All picked by Hari on 2026-10-31 ("ok with your reco").

| # | Decision | Why |
|---|---|---|
| Frame | Player plays 4–5 min sittings on a commute. References are recent short-session hits. | Hari: "no one is going to sit down play puzzle for hours". GameAnalytics median session is 4.45 min. |
| D1 | Create GAME-DESIGN.md at repo root. | It did not exist. One file holds the baseline. |
| D2 | Time model: 0.8 s per swipe, plus 0.4 s per movable fight, plus reading at 4 words/s. (First picked 2 s and 0.7 s; Hari chose to recalibrate on 2026-10-31 because that pace cleared only 3/100 Normal stages. Hari to validate against his own times on 3 stages.) | Hard boards cost more time than easy ones. A flat rate hides that. |
| D3 | Shift rule arrivals off new board sizes: blocked **14**, cracked **24**, cushions **44**. | One change at a time, so a failure teaches. |
| D4 | Stages 42–100 get scheduled first-time combos of existing rules. Each combo counts as a twist. | Novelty without new rules to teach. Keeps M16 (≤ 15 stages without something new). |
| D5 | Author one intro board per rule, like stage 12 for rejoin. | A generated intro may let the player ignore the rule. |
| D6 | Hint: first tap highlights the fight, second shows the direction. | A full free answer removes the "aha". |
| D7 | Replace first-run How to play with in-board cues on stages 1–3. Page stays behind its link. | 81 words is too much for a standing reader. Target ≤ 50 before the first swipe. |
| D8 | Daily board for players past stage 100. Normal counts as NG+. | A small reason to open the game each day. |
| D9 | Loop length: Casual 2.5–4 h, Normal 3–5 h. | Two to four weeks of commutes. |
| D10 | Dropped (kitten reactions). | Matters less on a commute. |
| D11 | Keep late-stage length. After stage 60, alternate long (≤ 4 min) and short stages. | Big 7x8 boards stay, and every other stage still fits one stop. |
| D12 | Save the board in progress. Pause fuses while the app is hidden. | An interruption must cost nothing. |
| D13 | No hard-stage label. M11 dropped. | Hari removed stars and scores. A label adds chrome. |

## Tasks

### Phase 1: checklist (done)

- T1. Research notes. Files: `research/reference-games.md`. Done: on main.
- T2. Mechanics checklist. Files: `GAME-DESIGN.md`. Done: on main, decisions applied.

### Phase 2: UI and testing checklists (done)

Hari took all recommended picks (P1–P7) on 2026-10-31.
P1: files at repo root, CLAUDE.md points to AGENTS.md. P2: density rule covers How to play. P3: the board is the Game screen's primary target.
P4: one rolling issue, updated only on a state change. P5: nightly at 02:00 SGT. P6: settings and volume exempt from thumb reach (S5, U6). P7: ui-check ships in the T5 PR.

- T3. UI review checklist with quoted "what good looks like". Includes the density rule: max ~50 words in view, 20 per block, 1 primary button, 2 levels deep. Files: `UI.md`. Done: Hari approves draft, pushed to main.
- T4. What agents test, and when. Nightly CI is fine. No recurring agent loops. Files: `TESTING.md`, `AGENTS.md` (new, links TESTING.md). Done: Hari approves, pushed to main.

### Phase 3: scorecard harness (Sonnet execution thread, via PR)

- T5. Build `npm run scorecard`.
  - Files: `package.json` (new; `scripts.scorecard`), `tools/scorecard/` (new), `index.html` (export only what the harness needs, such as `stageBoard`, `STAGES`, `CASUAL_TILES`, `stageExtras`, `applyStep`).
  - Load the game script with `vm`, as `test/selftest.cjs` does. Use Playwright only for items that need the page: M1, M2, S3, S4, S5, M12.
  - Bots from GAME-DESIGN.md "How to read it": builder, cheapskate, hint-follower, rookie, commuter, dawdler. All seeded. Default seed fixed.
  - Time comes only from the D2 model, never from the real clock.
  - Output: one row per checklist item (S1–S5, M1–M21 without M11). Columns: id, result (Pass / Fail / Unknown), measured value, target band.
  - Unknown is allowed where a measure is too costly, for example an exhaustive solve on 7x8. Say why in the row.
  - Also in this PR (P7): `npm run ui-check` with one row per UI.md item (U1–U14), and `.github/workflows/nightly.yml`. The workflow runs both at 18:00 UTC and updates one rolling "Nightly scorecard" issue only when a row changes state.
  - Done: two runs with the same seed print identical output. Run takes **≤ 5 min** locally. `node test/selftest.cjs` and `node test/e2e.cjs` still pass. PR opened, not pushed to main.
  - Don't touch: game rules, stage table, copy, styles. Don't change any test threshold to make a row pass.

### Phase 4: fix Fails (one PR each, after T5 merges)

Fix causes, never loosen tests. Each PR flips its rows to Pass and keeps the rest unchanged.

| Task | Fixes | Change | Model |
|---|---|---|---|
| T6 | M7 | Shift rule arrivals (D3) and their How to play `data-from` values. | Sonnet |
| T7 | M8 | Authored intro boards per rule (D5), using the `TEACH` pattern. | Sonnet |
| T8 | S3, M12 | Save board in progress, pause fuses while hidden (D12). | Sonnet |
| T9 | M17 | Two-step hint (D6). Screenshot before shipping. | Sonnet |
| T10 | M2, U1 | In-board cues on stages 1–3 (D7). How to play in pages of ≤ 50 words (P2). Screenshot before shipping. | Sonnet |
| T11 | S1, S2 | Alternate long and short stages after 60 (D11). | Sonnet |
| T12 | M16 | Combo schedule for 42–100 (D4). Needs the open question below answered first. | Planning first |
| T13 | M19 | Daily board (D8). Needs the open question below answered first. | Planning first |

Any other Fail the scorecard finds gets its own row here before work starts.

## Open questions

- D12 lets a player dodge a fuse by switching apps. Accept it, or resume fuses with a short grace?
- D4: which rule combos, at which stages?
- D8: where the daily board lives in the UI, and whether it is shareable like Wordle.
- D2 is a guess until checked against real play. Calibrate later from a local log of Hari's runs?
- Solver difficulty ("dead-end branches per move") needs a precise definition in T5. It must be cheap enough for 7x8.
