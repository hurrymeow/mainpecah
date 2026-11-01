# Kaboom Kitty: game design

This file holds the game's design baseline. Other sections may follow.

## Mechanics checklist

What makes this game good for its player, and a test a bot can run for each item.
Agreed with Hari on 2026-10-31. Plan: [docs/plans/game-quality-baseline.md](docs/plans/game-quality-baseline.md).
Sources and raw notes: [research/reference-games.md](research/reference-games.md).

References: Royal Match, Block Blast, NYT Games (Wordle, Connections), 2048, Threes, and King's 2024 GDC data on Candy Crush.
"Observed" means how the game behaves in play, not a quote. Quotes name their speaker.
M11 (hard-stage label) was considered and dropped. Numbers skip it on purpose so scorecard rows stay stable.

## The player this is for

- Plays on a train or bus, one hand, often standing.
- A sitting lasts about **4–5 min** (GameAnalytics median 4.45 min, 2024).
- Gets cut off without warning: a stop, a call, a notification.
- Has not played for a day or two. Has forgotten the last rule.
- Opens the game to fill dead time, not to be tested.

Most items below follow from one idea. Every second this player spends confused, waiting or redoing work is a second of their stop gone. A good commute game spends those seconds on deciding.

## How to read it

- Each item: rule, what good looks like, why, test.
- Time is **modeled wall time**: 0.8 s per swipe, plus 0.4 s per movable fight at that state, plus reading at 4 words/s (recalibrated 2026-10-31; Hari to check it against his own times on 3 stages). Targets are bands. Below the band and above it both fail.
- Bots (built in Phase 3 by `npm run scorecard`): **builder** (shortest solution), **cheapskate** (never hints), **hint-follower** (always hints), **rookie** (random split, one-move lookahead, rejoins when stuck), **commuter** (4–5 min sittings, random interruptions), **dawdler** (Normal only, waits 80% of each fuse).

## Session fit (every band)

**S1. A stage fits between two stops.**

- Looks like: Royal Match and Candy Crush levels end within a fixed move budget, usually a couple of minutes (observed). Wordle is six guesses at most (observed).
- Quote: "The longer the level is, the less likely it is to be fun," (Xavier Guardiola, King, GDC 2024).
- Why: a finished stage is the unit of reward. If the stop arrives mid-stage, the sitting ends with nothing banked. Two short wins beat one long win in a 5 min window.
- Why the band: 0.5 min is the floor because shorter stages feel like busywork. 3 min leaves room for one retry inside a sitting.
- Test: builder's modeled time is **0.5–3 min** for every stage up to 60. After 60, long stages (up to **4 min**) alternate with short ones: no two stages over 3 min in a row. Since PR 8, every second stage from 61 has about a tenth of the board more tiles.

**S2. Hard stages are short.**

- Looks like: King caps how long a level should run by how hard it is (King GDC 2024, summary).
- Quote: "Just because they're hard doesn't mean they're not fun" (Jan Wedekind, King).
- Why: a hard stage gets failed and retried. Retry cost is length times failure count. A long hard stage burns a whole sitting on one board. A short hard stage feels like a sharp puzzle.
- Test: the hardest 10% of stages by solver difficulty sit in the shortest half by moves.

**S3. An interruption costs nothing.**

- Looks like: Wordle and Block Blast keep the board exactly as you left it when you switch apps or close them (observed). The 2048 web original saves the game in the browser too (observed).
- Quote: none found. This is a platform norm, not a designer claim.
- Why: the commuter will be interrupted, often. If leaving loses progress, they learn not to start a stage near their stop. That shrinks the usable part of every sitting. A burning fuse while backgrounded is worse: the game punishes them for answering a message.
- Test: commuter backgrounds or kills the app mid-stage. On return the board is the same and no fuse has advanced. Today the board is lost on kill, and fuses burn in the background.

**S4. Restart is instant.**

- Looks like: 2048 shows "Try again" on the same screen as the loss. One tap and you are playing (observed).
- Quote: 2048 is "incredibly hard to win but somehow not discouraging" (BuzzFeed summary).
- Why: failing stings less when the next attempt starts before the sting lands. Any screen between loss and play is where the player decides to close the app.
- Test: lose to next first swipe is **≤ 1 tap** and **≤ 2 s**.

**S5. One thumb, one glance.**

- Looks like: Block Blast, Royal Match and Wordle play in portrait with every control in thumb reach (observed).
- Why: the commuter holds a rail with the other hand. A missed tap on a small cell is a wasted move they didn't choose.
- Test: every control used each stage (Restart, Hint, Next stage, Try again) is in the bottom two thirds in portrait. Settings and volume are exempt. Smallest cell on a 390 px phone is **≥ 44 px** (Apple's minimum touch target).

## Band 1: First sitting (first 5 min)

**M1. First swipe fast.**

- Looks like: Threes opens on a board with one instruction (observed). Royal Match puts a hand pointer on the first move (observed).
- Quote: Threes' only control instruction is "Swipe anywhere to move them" (critic John Teti, AV Club).
- Why: a new player hasn't decided to like the game yet. Everything before the first move is a cost with no reward. The first swipe is when they find out whether it feels good.
- Why the band: under 20 s means no context at all. Over 60 s and a 5 min sitting is a fifth gone.
- Test: cold load to first legal swipe is **20–60 s** modeled. Reading costs 4 words/s.

**M2. Few words before playing.**

- Looks like: Threes teaches its rules by having you play a scripted board, one rule per screen (observed).
- Quote: the tutorial "recasts cold numerals as cute characters" with "an understated rundown of the rules" (Teti).
- Why: words read are forgotten. Moves made are remembered. A standing reader on a moving train skims, and skimmed rules come back as "the game cheated me".
- Test: words shown before the first swipe are **≤ 50**. Teaching moves to in-board cues on stages 1–3. How to play stays behind its link. Today **81** words on a first-run page.

**M3. First win almost at once.**

- Looks like: Royal Match's and Candy Crush's first levels are nearly impossible to fail (observed).
- Quote: "crazy hard levels never pay off, at least in the long term" (Wedekind, King).
- Why: the first win shows the player what "done" looks like. Until then they don't know what they are aiming for, so every move is a guess.
- Test: rookie wins stage 1 in **≥ 95%** of seeds, in **30–90 s**.

**M4. Early stages are friendly.**

- Looks like: Royal Match's first labelled "Hard" level comes around level 39 (third-party analysis).
- Quote: "retention always wins" (Wedekind, King).
- Why: early on the player has invested nothing. One unfair loss there costs the player for good. Later, the same loss is a challenge.
- Test: rookie wins stages 1–3 in both modes in **≥ 90%** of seeds.

**M5. Progress in the first sitting.**

- Looks like: a new Royal Match player clears several levels in the first few minutes (observed).
- Why: the first sitting must end on a win and a visible step forward. That is the memory that decides whether they open the game on the next commute.
- Test: builder reaches stage **4–8** by 5 min.

## Band 2: First 15 min (about 3 sittings)

**M6. First new idea arrives.**

- Looks like: Candy Crush introduced its Sour Skull blocker with three tutorial levels before mixing it in (King case study).
- Quote: "First, you have to learn how to use that gameplay mechanic" (Koichi Hayashida, Nintendo).
- Why: by sitting three the core move is automatic. Without something new, stage 15 feels like stage 5 and the player concludes they have seen the game.
- Why the band: before 8 min the core move isn't settled, so a new rule muddies it. After 15 min, the "seen it all" verdict may already be in.
- Test: first new rule appears at **8–15 min**. Blocked cells arrive at stage 14.

**M7. One new thing at a time.**

- Looks like: Candy Crush gives a new blocker its own tutorial levels (case study above). Braid "changes one major rule in every single world" (blogger Adam Bishop).
- Why: when two things change at once and the player fails, they can't tell which one beat them. They blame the game. One change at a time makes every failure teach.
- Test: a rule's first stage keeps the previous board size. Target arrivals: blocked **14**, cracked **24**, cushions **44**. Arrivals are now 14, 24 and 44, each on a board size already met. Rejoining moved from stage 12 to 15, after blocked cells.

**M8. The new rule matters on its first stage.**

- Looks like: a Candy Crush tutorial level for a blocker can't be won without dealing with that blocker (observed pattern).
- Quote: "We only added a level if we had something new to say" (Ken Wong, Monument Valley).
- Why: if a rule can be ignored on its first stage, the player learns to ignore it. They meet it for real ten stages later, with no memory of how it works.
- Test: each rule's first stage is an authored board, like stage 12 for rejoin. Removing the rule changes the solver's solution.

**M9. Progress.**

- Why: the bands check the stage ladder against real time. If players reach stage 20 in 5 min the early stages are filler. If they reach stage 5 in 15 min the ramp is too steep.
- Test: builder reaches stage **12–20** Casual and **10–18** Normal by 15 min.

## Band 3: First hour (about 12 sittings)

**M10. Hard, then relief.**

- Looks like: Royal Kingdom keeps "a Hard and Super Hard level every 10 levels", followed by easier ones (third-party analysis). Royal Match adds a bonus level about every 10 (same source).
- Quote: Hayashida's steps: "the stage will offer you a slightly more complicated scenario", then "something crazy happens".
- Why: steady difficulty is either boring or tiring, never both satisfying. A peak gives a win that feels earned. The dip after it lets the player feel how much better they got.
- Test: solver difficulty rises inside each 10-stage band, then drops **10–40%** at the next band start.

**M12. Fair fuse.**

- Quote: "Lying to the player and arbitrarily changing rules is not clever, it is cheating." (Adam Bishop, on puzzle design).
- Why: a loss the player didn't see coming feels like the game's fault. A loss after a visible warning feels like their own call. Only the second makes them retry.
- Test: every explosion follows **≥ 3 s** of visible warning. No fuse runs while How to play or the app is hidden.

**M13. Stuck is never silent.**

- Looks like: Block Blast ends the game the moment no piece fits (observed). Candy Crush reshuffles when no match exists (observed).
- Quote: early levels are hard "because you don't yet understand how exactly things are going to work" (Arvi Teikari, Baba Is You).
- Why: a player who doesn't know they are stuck keeps swiping a dead board. That is the worst way to spend a sitting. Saying "stuck" turns the dead end into a clear choice: rejoin or restart.
- Test: when no win is reachable, the game says so within **1** move.

**M14. Progress.**

- Test: builder reaches stage **35–55** Casual and **30–50** Normal by 60 min.

## Band 4: Full loop (stage 1 to 100, about 30–50 sittings)

**M15. Loop length.**

- Looks like: Monument Valley finishes in about 1.5 h. Baba Is You's main path takes 7.5–8 h (HowLongToBeat via aggregators).
- Why: a commuter playing twice a day finishes 2.5–4 h in two to four weeks. That is long enough to form a habit and short enough to finish.
- Test: builder finishes in **2.5–4 h** Casual and **3–5 h** Normal.

**M16. Something new every so often.**

- Looks like: Candy Crush and Royal Match keep adding blockers and obstacles across thousands of levels (King slide deck: 18 blockers, 6 modes, about 3,000 levels).
- Quote: Royal Match's level design "inevitably starts to feel like remixing rather than discovery" (Orcz review).
- Why: the player keeps coming back to find out what's next. Once they think nothing new is coming, each stage is only a chore to clear.
- Why 15 stages: at 2–3 min a stage, that is about 30–45 min, or a week of commutes.
- Test: longest run without a new rule or a scheduled first-time combo of existing rules is **≤ 15** stages. Twists at stages 35, 55, 62, 70 and 86 (see `TWISTS` in index.html) keep the longest run at **15**.

**M17. Hints help, they don't play.**

- Looks like: Flow Free sells hints in packs of five, so each one is a choice (App Store listing).
- Quote: Teikari wants hints "more like helpful images than straight-up written hints."
- Why: a free full-answer hint turns a puzzle into instructions. Once the player knows the answer is one tap away, solving it alone feels pointless. A nudge keeps the "aha" theirs.
- Test: a hint's first tap highlights the fight only. A second tap shows the direction. Cheapskate and hint-follower both finish. Today one tap shows the exact move.

**M18. Every board solvable and unique.**

- Why: one unsolvable board breaks trust in all of them. Two identical boards tell the player the content is padded.
- Test: all 200 boards replay their solution. None match under rotation or mirror. Already in e2e.

## Band 5: Replay and NG+

**M19. A reason to open it tomorrow.**

- Looks like: Wordle and Connections give one puzzle a day, the same for everyone, in a few minutes (observed).
- Quote: "We're not trying to get you to spend 24/7 in our app" (Jonathan Knight, NYT Games).
- Why: after stage 100 nothing pulls the player back. A daily board is a small, fixed-size reason that fits one sitting and ends cleanly.
- Test: a new daily board is available each day once stage 10 is cleared (Hari, 2026-11-01, was stage 100), solvable in **1–3 min**. Same board for everyone on a date. Built: stage picker lists "Daily board" once stage 10 is cleared; 6x7, about 2 min, no fuse.

**M20. Normal is the NG+.**

- Quote: Threes players "haven't had time to understand all we've done with our game's system" (Vollmer and Wohlwend).
- Why: replaying known boards with fuses tests speed on puzzles the player already understands. That is a new skill on old content, which is what NG+ means.
- Test: Normal modeled time is **1.2–1.6x** Casual on the same stage. Dawdler loses **10–30%** of Normal stages 41–100.
- Tile sizing (2026-11-01, Hari go): Normal keeps its tiles. From stage 11 Casual starts with more tiles, about 1/1.3 of Normal's splits, so Normal runs about **1.4x** Casual. Making Normal longer instead pushed the dawdler loss to 38–48%, because the generator cannot go lower on late boards. Cost: Casual stages 11–30 run about 0.4–0.5 min, under the S1 floor. Table: `tools/scorecard/tile-table.cjs`.
- Fuse sizing (2026-11-01): from stage 22 Normal uses the focus rule (Hari). Only fights within 2 cells of the last swipe burn; the rest wait with a dim bar. Each fuse is the shortest a player at 1/1.5 of the modeled pace clears, rounded up to 5 s, capped at **60 s**. The dawdler then loses only where the cap binds.
- Known exploit: a player can freeze a fight by keeping their swipes more than 2 cells away from it. Rejoining still cannot refill a fuse, and every fight must be reached to win, so the freeze only defers the pressure.

**M21. Past 100 stays sound.**

- Why: the game keeps going past 100. Those boards must meet the same bar or the endgame feels broken.
- Test: stages 101–150 are solvable, unique and fit S1.
