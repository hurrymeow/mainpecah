# Big boards T9 — progress

`node test/selftest.cjs` exits 0. `node test/e2e.cjs` passes 22/22 on the final run; the first run failed "Arrivals survive a kill" on a board-after-reload mismatch unrelated to this change, and the same suite passed on rerun including that test.
