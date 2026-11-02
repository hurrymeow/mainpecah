# Big boards T2 — progress

`node test/selftest.cjs` passes, including a new replay of all 100 stages in both modes that lands every arrival and asserts stages 1-46 have no arrivals. `node test/e2e.cjs` passes 19/20: the stage-board replay check now applies arrivals and passes, but "Oblong boards" times out on its stage-100 hint play because the live loop still ignores arrivals. Work is stopped pending a decision on whether T2 should include minimal game-loop arrival placement or move that interactive stage below 47 until T3.
