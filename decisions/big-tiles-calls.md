# Big-tiles calls made while Hari was away

Hari: "stop asking me and just go" (2026-11-02). Recorded by the big-tiles thread.

- **Where big tiles come from (2026-11-02).** A new `growBig` step in `generate` builds the big tile before the random merges, by splitting it in halves and claiming free neighbours. Why: the old random merge reaches an 8 about 4% of the time per board. Letting random merges grow 8s would need a bias that also changes small boards. Prototype: 8 builds on 100% of tries, 16 on 98%.
- **Counter-argument.** A fixed 8 on every stage may feel samey. Accepted: its position is random per seed, and arrivals can pick it, so it can land mid-stage.
- **Which stages (2026-11-02).** One 8 from stage 48, two 8s every tenth stage, a 16 on Normal stages 60, 80 and 100. Casual has no 16 because its stages are about 16 swipes and a 16 takes 15.
- **Executor limits.** T1 and T2 go to the DeepSeek executor. T3 needs the scorecard and is done by hand.

## Results (2026-11-02, T2 and T3 done by hand)

- **T2 stopped on the executor.** The exact change turned selftest red on stages 80, 90 and 100, because the old picks no longer gave a 16 or arrivals. Call: finish T2 and T3 together by hand. `generate` now throws away an attempt that cannot hold its big tiles, and `stageBoard` skips boards without arrivals.
- **Final plan.** One 8 on every stage from 48. No doubles and no 16, because they made things worse (see below). Counter-argument: Hari asked for 8s and 16s. Doubles and 16s are in the generator (`big: [8, 8]`, `[16]`) but switched off.
- **Why no 16s or doubles.** A big fight is forced, so the stage plays faster and the band shape breaks. A 16 or two 8s at a band start dropped difficulty by 65% (limit 40%). At a band end they cut the climb. Mid-band they dipped M10 relief further.
- **Time dropped by 40%.** Fewer fights means fewer options to scan per swipe, so modeled time fell from 81 s to 48 s per Normal stage and M14, M15 and M21 failed. Call: peak swipes up from 25/22/20/18 to 30/27/25/23, and band starts from 0.76 to 0.88 of the peak after stage 60. Normal is about 24 swipes, Casual 20. This undoes part of the earlier "shorter big stages" gain.
- **Scorecard.** Pass 23, Fail 2 (S1 by design, M10). M10 relief holds at 7 of 9 band starts. Stage 91 drops 63% and stage 81 drops 8%. The picks cannot fix it, because more attempts (60) and a lower fuse weight gave the same picks.
