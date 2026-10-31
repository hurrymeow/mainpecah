# Reference games: raw notes

Collected 2026-10-31 for the game-quality checklist in GAME-DESIGN.md.
Quotes are verbatim from the linked page. Each line says whose words they are.
"Designer" means the game's own maker. "Critic" or "summary" means someone else.

## Why these games

| Game | Why it fits Kaboom Kitty |
|---|---|
| Threes! (2014) | Closest ancestor. Swipe, numbers as characters, twin-only merges. |
| 2048 (2014) | Genre baseline. Instant retry, no punishment. |
| Flow Free (2012) | Same structure: fixed hand-made-feeling boards, grid sizes in packs, hints. |
| Baba Is You (2019) | Best-in-class rule introduction in a grid puzzle. |
| Monument Valley (2014) | Pacing and a short, finishable arc on mobile. |

Method source, not a reference game: Koichi Hayashida's four-step level design (Super Mario 3D Land).
Snakebird, Stephen's Sausage Roll and Braid were considered. Few primary quotes surfaced, so they are left out.

## Threes!

- Designer (Asher Vollmer): "As soon as we set the rule 'only twins can merge with each other' the game design went from 10 percent complete to 90 percent complete." [PocketGamer.biz, 2014-04-09][pgb]
- Designer (Vollmer), on added features: "all of those things were just band-aids on a much much deeper problem." [pgb]
- Designer (Vollmer): "It was only after we started stripping those things away did the true boring begin to show." [pgb]
- Designer (Greg Wohlwend): "I don't think Threes would be Threes without the characters." [pgb]
- Designers: "the majority of Threes players haven't had time to understand all we've done with our game's system" [Game Developer, 2014-03-27][gd-arch]
- Critic (John Teti): the tutorial "recasts cold numerals as cute characters" and gives "an understated rundown of the rules". [AV Club, 2014-02-20][avc]
- Critic (Teti): the only control instruction is "Swipe anywhere to move them", which he calls "a crafty teaching approach". [avc]
- Critic (Teti): the game "assumes that there's a reasonably intelligent and playful person on the other end of the line." [avc]
- Critic (Teti): "Later, the tiles will grumble, sigh, and playfully heckle you as you consider the board." [avc]
- Summary: Vollmer's GDC 2014 tutorial talk covers "how to prime your players, how to help them internalize a game's mechanics" and "how to empower your players (without patronizing them)". [Game Developer, 2016-08-24][gd-tut]
- Note: the 45,000-word design archive exists but did not load here. Not quoted.

## 2048

- Designer (Gabriele Cirulli) called it "conceptually similar" to Threes. [Wikipedia][w2048]
- Summary, not verbatim: 2048 is "incredibly hard to win but somehow not discouraging". [BuzzFeed, 2014][bf]
- Summary, not verbatim: Cirulli said the game is unforgiving but doesn't make you feel bad. [bf]
- Takeaway: one-tap restart and fast moves carry it. Depth is shallower than Threes (the Threes team called it broken).

## Flow Free

- Store listing: "Over 2,500 free levels available in Free Play mode, and new Daily Puzzles every day!" [App Store][ff]
- Store listing: 10 board sizes. Packs grouped by size ("Mania" packs hold one size). [ff], [MobyGames][ffm]
- Store listing: hints are scarce and sold: 5 for £0.99, 20 for £2.99, 100 for £9.99. [ff]
- Store listing: "20 scored Time Trial variants to choose from by board size and duration." [ff]
- Rating 4.7 from 37k ratings (UK store, 2026-10-31). [ff]
- Takeaway: fixed boards, size bands, scarce hints, a daily puzzle as the replay hook.

## Baba Is You

- Designer (Arvi Teikari): "many of the early levels are only difficult because you don't yet understand how exactly things are going to work" [MCV, 2019-08-08][mcv]
- Designer (Teikari): "it's very easy for that designer to become blind to a lot of the difficulty." [mcv]
- Designer (Teikari): "a tester found an alternative solution that I didn't want to keep in the original level." [mcv]
- Designer (Teikari): "I've had to spend quite a lot of time changing the levels" [mcv]
- Designer (Teikari): "as the game progresses, the puzzles become more specific" [Red Bull, 2019-05-07][rb]
- Designer (Teikari), on hints: "I'd really like to have them be more like helpful images than straight-up written hints." [rb]
- Designer (Teikari): "The game definitely turned out to be way more difficult than I expected." [rb]
- HowLongToBeat via aggregators: main path 7.5–8 h, with sides about 21 h. [Deku Deals][dd-baba], [IsThereAnyDeal][itad-baba]

## Monument Valley

- Designer (Ken Wong): "We only added a level if we had something new to say," [Game Developer, 2014-04-10][gd-mv]
- Journalist summary: he "wanted to make a game that was a complete experience, one that could actually be finished" [gd-mv]
- Journalist summary: it would address hard, long games "without dumbing down the experience." [gd-mv]
- 10 chapters. HowLongToBeat main story about 1.5 h (sources disagree, 1–3 h). [Deku Deals][dd-mv]

## Method: four-step level design (Hayashida)

All verbatim, Koichi Hayashida, [Game Developer, 2012-04-13][gd-mario]:
- Introduce: "First, you have to learn how to use that gameplay mechanic"
- Develop: "the stage will offer you a slightly more complicated scenario in which you have to use it."
- Twist: "something crazy happens that makes you think about it in a way you weren't expecting."
- Conclude: "you get to demonstrate, finally, what sort of mastery you've gained over it"

Related, blogger (Adam Bishop) on Braid: "Braid changes one major rule in every single world." [Game Developer, 2010-08-13][gd-braid]
Bishop: "A puzzle should be made up primarily of two things: a defined goal, and clues as to how that goal might be achieved." [gd-braid]

## Kaboom Kitty measured against the stage table (index.html, f55e2ab)

Minimum moves per stage = free cells minus starting tiles (one split adds one tile).
This ignores rejoins and restarts, so real play is longer.

| Stage | Board | Locks | Normal min moves | Casual min moves | Fuse s |
|---|---|---|---|---|---|
| 1 | 4x4 | 0 | 6 | 6 | 30 |
| 10 | 4x4 | 0 | 11 | 12 | 15 |
| 11 | 4x5 | 1 | 10 | 12 | 20 |
| 21 | 5x5 | 2 | 12 | 14 | 20 |
| 41 | 6x6 | 3 | 18 | 21 | 25 |
| 71 | 7x8 | 6 | 28 | 31 | 25 |
| 100 | 7x8 | 9 | 32 | 33 | 20 |

Totals over 100 stages: **2,081** moves Normal, **2,235** Casual.

Wall-time estimate at a flat seconds-per-move rate, no restarts:

| Rate | Stage 20 | Stage 40 | Stage 60 | Stage 100 |
|---|---|---|---|---|
| 4 s/move | 13–15 min | 33–36 min | 61–66 min | 2.3–2.5 h |
| 6 s/move | 20–23 min | 50–55 min | 92–100 min | 3.5–3.7 h |
| 8 s/move | 27–30 min | 66–73 min | 2.0–2.2 h | 4.6–5.0 h |

Rule arrivals: blocked 11, cracked 21, grumpy 26, cushions 41. Rejoin taught by an authored board at 12.
Blocked (11), cracked (21) and cushions (41) arrive on the same stage as a new board size.
Stages 42–100 add no new rule.
First-run How to play: **81** words (Normal, with fuse step).

[pgb]: https://www.pocketgamer.biz/feature/58813/fighting-the-monsters-the-making-of-threes/
[gd-arch]: https://www.gamedeveloper.com/design/understanding-i-threes-i-developers-release-design-archives
[avc]: https://www.avclub.com/the-iphone-hit-threes-gives-you-cuteness-where-you-leas-1798266309
[gd-tut]: https://www.gamedeveloper.com/design/video-i-threes-i-creator-shares-tips-on-making-great-game-tutorials
[w2048]: https://en.wikipedia.org/wiki/2048_(video_game)
[bf]: https://www.buzzfeed.com/hillaryreinsberg/why-this-free-puzzle-game-is-the-most-addictive-thing-on-the
[ff]: https://apps.apple.com/gb/app/flow-free/id526641427
[ffm]: https://www.mobygames.com/game/61522/flow-free/
[mcv]: https://mcvuk.com/development-news/when-we-made-baba-is-you/
[rb]: https://www.redbull.com/ng-en/baba-is-you-interview
[dd-baba]: https://www.dekudeals.com/items/baba-is-you?format=all
[itad-baba]: https://isthereanydeal.com/game/babaisyou/info/
[gd-mv]: https://www.gamedeveloper.com/design/designing-the-surprise-mobile-game-hit-i-monument-valley-i-
[dd-mv]: https://www.dekudeals.com/items/monument-valley-panoramic-edition
[gd-mario]: https://www.gamedeveloper.com/design/the-secret-to-i-mario-i-level-design
[gd-braid]: https://gamedeveloper.com/design/puzzles-should-have-clues

## Update 2026-10-31: commute play

Hari: players kill time on a commute, not hours at a stretch. Candy Crush or 2048, but recent games.
So the core references become recent short-session hits. The games above stay as secondary notes.

### Session length data

- GameAnalytics: "the global median session length is 4.45 minutes" for mobile games, Q1 2024. [GameAnalytics via GameDev Reports][ga24]
- GameAnalytics 2025: top-tier games average 8–9 min per session, median-tier 5–6 min (summary). [Game Industry Library][ga25]
- ESA via GameAnalytics: puzzle, trivia and word games are commuters' top pick (38%). Original report not checked. [GameAnalytics][ga-esa]

### Candy Crush (King's 2024 GDC data, recent even though the game is old)

All from King staff at GDC 2024, reported by [Mobilegamer.biz, 2024-03-27][mgb]:
- Xavier Guardiola: "The longer the level is, the less likely it is to be fun,"
- Jan Wedekind: "Just because they're hard doesn't mean they're not fun, and inversely you can find easy levels which don't have a lot of churn on them but they're not much fun."
- Wedekind: "crazy hard levels never pay off, at least in the long term"
- Wedekind: "designing for averages is not a good idea"
- Wedekind: "retention always wins"
- Summary: the longest a level should last depends on how hard it is. Hard levels should be short.

### Royal Match (Dream Games, 2020)

No designer interviews found. Third-party analyses only:
- Difficulty cycles over about 5 levels, then drops. A bonus or relief level about every 10. [Medium case study][rm-case]
- Hard levels carry a visible "Hard" label (level 39 onward), so failing reads as designed challenge. [Medium analysis][rm-an]
- Sequel Royal Kingdom keeps "a Hard and Super Hard level every 10 levels". [Medium][rk]
- Critic: the level design "inevitably starts to feel like remixing rather than discovery." [Orcz review][rm-orcz]

### Block Blast (Hungry Studio, 2023 onward)

- Hungry Studio: 70m daily and 300m monthly active users, January 2026. Press release. [PocketGamer.biz][bb]
- Hungry Studio describes a "drag–match–clear" experience. [Business Wire, 2026-03][bb-bw]
- Hungry Studio VP: it "may look simple, but it is powered by an extensive A/B testing framework". [bb-bw]
- Takeaway: endless, no timer, one board per session, instant restart. Same shape as 2048.

### NYT Games: Wordle (2021) and Connections (2023)

- Jonathan Knight, head of NYT Games: "We're not trying to get you to spend 24/7 in our app; we're not trying to get you addicted to solving level after level after level," [Axios, 2024-01-29][axios]
- Knight: "We think it should be time well spent." (Eurogamer, "A world beyond Wordle", as quoted in search results; page not opened.)
- Takeaway: one daily puzzle, a few minutes, a shareable result. The habit is daily, not long.

### Kaboom Kitty against a commute

- Stage length: Casual stages 61–100 need **25–33** splits minimum. At 5 s/move that is 2–3 min before thinking or retries.
- Interruptions: only the furthest stage is saved. A board in progress is lost if the app is killed.
- Normal fuses use absolute deadlines and keep burning while the app is in the background. Only audio pauses (index.html visibilitychange handler).
- New-rule tips already show once in the quip line on a rule's first board.

[ga24]: https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile
[ga25]: https://gameindustrylibrary.com/documents/gameanalytics-mobile-gaming-benchmarks-2025/read?page=12
[ga-esa]: https://gameanalytics.com/?p=4483
[mgb]: https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/
[rm-case]: https://medium.com/@abhisekh.nath11/case-study-on-royal-match-by-dream-games-80ebc8b8d877
[rm-an]: https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b
[rk]: https://medium.com/@chrisjameswallace/royal-kingdom-the-next-puzzle-hit-from-dream-games-c7395e26b185
[rm-orcz]: https://orcz.com/royal-match-review-the-puzzle-king-that-refuses-to-be-dethroned/
[bb]: https://www.pocketgamer.biz/block-blast-reaches-70m-daily-active-users-and-300m-monthly-active-users-worldwide
[bb-bw]: https://www.businesswire.com/news/home/20260326424167/en
[axios]: https://www.axios.com/2024/01/29/wordle-nyt-games-news-media-layoffs

### Extra Candy Crush notes (search summaries, pages not opened)

- King's Sour Skull blocker debuted on level 8031 alongside three tutorial levels (Crush & Tell case study). [PocketGamer.biz][pgb-cc]
- King slide deck (Jeremy Kang): 18 blockers and 6 game modes make about 3,000 levels. [Speaker Deck][sd-kang]

[pgb-cc]: https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/
[sd-kang]: https://speakerdeck.com/wnconf/jeremy-kang-king
