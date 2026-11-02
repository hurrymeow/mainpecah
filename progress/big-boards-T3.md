# Big boards T3 — progress

`node test/selftest.cjs` passes. `node test/e2e.cjs` passes 21/21: "Oblong boards" again hint-solves stage 47 and stage 100 (7x8, with arrivals) to a win, and the new "Arrivals survive a kill" test plays Normal stage 47 until a fight lands, checks its fresh fuse, reloads mid-stage, and confirms the split counter and queue index come back with the board. The daily-board reload check passed on the final run as well.
