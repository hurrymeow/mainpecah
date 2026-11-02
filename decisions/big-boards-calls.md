# Big-boards calls made while Hari was away

Recorded by the executor thread. Hari: "stop asking me and just go" (2026-11-02).

- **T2 scope (2026-11-02).** Executor stopped on whether T2 takes part of T3's game loop. Call: T2 stays generator-only. The e2e test 'Oblong boards' plays stage 31 interactively until T3 lands, then T3 restores stage 100. Why: keeps tasks one-concern each, matches the plan, and avoids half-built loop code that T3 would rewrite.
