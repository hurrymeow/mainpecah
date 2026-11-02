# Big-tiles calls made while Hari was away

Hari: "stop asking me and just go" (2026-11-02). Recorded by the big-tiles thread.

- **Where big tiles come from (2026-11-02).** A new `growBig` step in `generate` builds the big tile before the random merges, by splitting it in halves and claiming free neighbours. Why: the old random merge reaches an 8 about 4% of the time per board. Letting random merges grow 8s would need a bias that also changes small boards. Prototype: 8 builds on 100% of tries, 16 on 98%.
- **Counter-argument.** A fixed 8 on every stage may feel samey. Accepted: its position is random per seed, and arrivals can pick it, so it can land mid-stage.
- **Which stages (2026-11-02).** One 8 from stage 48, two 8s every tenth stage, a 16 on Normal stages 60, 80 and 100. Casual has no 16 because its stages are about 16 swipes and a 16 takes 15.
- **Executor limits.** T1 and T2 go to the DeepSeek executor. T3 needs the scorecard and is done by hand.
