# Big-boards calls made while Hari was away

Recorded by the executor thread. Hari: "stop asking me and just go" (2026-11-02).

- **T2 scope (2026-11-02).** Executor stopped on whether T2 takes part of T3's game loop. Call: T2 stays generator-only. The e2e test 'Oblong boards' plays stage 31 interactively until T3 lands, then T3 restores stage 100. Why: keeps tasks one-concern each, matches the plan, and avoids half-built loop code that T3 would rewrite.
- **T4 done-check (2026-11-02).** Executor cannot screenshot or run ui-check. Call: executor ships with an e2e test for the chip and marked cell. The screenshot and ui-check run after merge. Chip sits above the board, left aligned. Teach board is best-effort, skipped if no simple authored board exists.
- **T5 done-check (2026-11-02).** Executor cannot run the scorecard. Call: executor edits and reads carefully, the executor thread runs `npm run scorecard` after merge and patches breakage.
