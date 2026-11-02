# Progress — T2

Stopped before completion. The prescribed `big` lines and selftest block are in place, but `node test/selftest.cjs` exits 1 with "challenge stage 80: no tile of 16 or more", "casual stage 90: no arrivals" and "challenge stage 100: no arrivals", and `node test/e2e.cjs` fails test 15 with `missing: 1` in both modes. All three come from the `EARLY_PICK` attempt chosen for those stages, which T2 forbids changing and T3 is meant to rerun; no other files were touched.
