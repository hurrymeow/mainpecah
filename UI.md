# Kaboom Kitty: UI review checklist

Agreed with Hari on 2026-10-31. Same player as [GAME-DESIGN.md](GAME-DESIGN.md): a commuter, one hand, 4–5 min sittings.
Built and run nightly by `npm run ui-check` (see [TESTING.md](TESTING.md)).
"Observed" means how the game behaves in play, not a quote.

## How to use it

- Review every screen against this list before a UI change ships.
- Screens: Start, Game, How to play, Settings sheet, Volume sheet, Win, Lose.
- Each item: rule, what good looks like, why, check. Checks run in Playwright at **390x844** and **360x640**.

## Density rule (Hari's)

**U1. About 50 words in view, at most.**
- Looks like: Wordle's game screen shows a title, a grid and a keyboard. Almost no sentences (observed).
- Quote: users "have time to read at most 28% of the words during an average visit" (Jakob Nielsen, NN/g, 2008).
- Quote: users "read half the information only on those pages with 111 words or less." (Nielsen).
- Why: a standing commuter reads less than a desk user, not more. Every extra word lowers the odds the important one gets read.
- Check: visible words per screen **≤ 50**, How to play included. How to play splits into pages of ≤ 50 words. Today it shows **81** on first run.

**U2. 20 words per block, at most.**
- Why: a block is what the eye takes in one stop. Past about 20 words the reader starts skimming, and skims miss the rule.
- Check: every visible text element (p, li, button, dt/dd) is **≤ 20** words.

**U3. One primary button per view.**
- Looks like: Material Design keeps filled buttons for "important, final actions that complete a flow" (Material Web docs).
- Why: two equal buttons make the player stop and compare. One clear next step keeps the thumb moving.
- Check: each screen has **≤ 1** element styled as primary. On the Game screen the board is the primary target, so Restart and Hint must look secondary.

**U4. Two levels deep, at most.**
- Quote: "designs that go beyond 2 disclosure levels typically have low usability." (Nielsen, NN/g, 2006).
- Why: each level is a tap, a wait and a "where was I?". A commuter interrupted at level three comes back lost.
- Check: from Game, any setting is reachable in **≤ 2** taps, and no sheet opens another sheet.

## Touch and reach

**U5. Tap targets are big enough.**
- Looks like: Apple's guidelines ask for at least 44x44 pt per control (secondary sources, Apple page not opened).
- Why: a missed tap on a moving bus is a move the player didn't choose.
- Check: every control and cell hit box is **≥ 44** CSS px on both viewports.

**U6. Frequent controls sit in thumb reach.**
- Why: the other hand holds a rail. The top corners are the hardest reach for one thumb.
- Check: every control used each stage (Restart, Hint, Next stage, Try again) is in the bottom two thirds. Settings and volume are exempt, since they are used less than once a stage.

## Legibility

**U7. Text contrast.**
- Quote: "The visual presentation of text and images of text has a contrast ratio of at least 4.5:1" (WCAG 2.2, 1.4.3).
- Why: phones get read in sunlight, and at low brightness to save battery.
- Check: every visible text node is **≥ 4.5:1** against its background (**3:1** for large text).

**U8. The board and state read at a glance.**
- Why: the player looks away often. Stage number, mode and every fuse must be readable in one look when they look back.
- Check: stage title, Difficulty chip and all fuse numbers are visible without scrolling, and at least 12 px.

**U9. No scroll, no shift.**
- Why: scrolling on a crowded train is a second gesture with no payoff. A layout that jumps under the thumb causes mis-swipes.
- Check: no screen scrolls at either viewport. Board position doesn't move during play.

## Feel

**U10. Every swipe answers at once.**
- Quote: "0.1 second is about the limit for having the user feel that the system is reacting instantaneously" (Jakob Nielsen, Usability Engineering, 1993).
- Looks like: Threes and 2048 animate a tile on every swipe (observed). Martin Jonasson and Petri Purho's "Juice It or Lose It" (GDC Europe 2012) made the case for this.
- Why: if a swipe doesn't answer within a tenth of a second, the player swipes again and makes a move they didn't mean.
- Check: first visual change after a swipe lands in **≤ 100 ms**.

**U11. Playable on mute.**
- Why: most commuters play with sound off. Anything said only by sound is lost.
- Check: with effects and music at 0, every event (split, rejoin, near-boom, boom, win) still has a visual cue.

**U12. Motion can be turned down.**
- Why: motion on a moving vehicle adds to nausea for some players.
- Check: with reduced motion set in the OS, or Animations off, no element moves more than its own size. The game already reads `prefers-reduced-motion`.

## Commute conditions

**U13. Works offline.**
- Looks like: installed PWAs and native games keep working in a tunnel (platform norm).
- Why: trains go underground. A game that fails offline fails on half the commute.
- Check: after one online visit, a cold load with the network off reaches a playable board.

**U14. Copy stays in voice.**
- Why: words like "bed" or "Challenge" contradict what's drawn or the current mode names. The player stops trusting the text.
- Check: the existing e2e "Player text" test passes.
