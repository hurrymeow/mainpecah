# Big boards T1 — arrivals start constant

Added `ARRIVALS_FROM = 46` next to `DAILY_FROM` and exported it alongside the other stage constants so later tasks can gate mid-stage arrivals on stage 47 (0-based 46) without re-hardcoding the threshold. `ARRIVALS_FROM` is 46 rather than the display stage number because stages are indexed from zero throughout the game code.
