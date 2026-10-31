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
