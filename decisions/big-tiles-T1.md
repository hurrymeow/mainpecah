# T1 — growBig builds big tiles before the backward merge

Added `growBig` to `index.html`: it claims a free region of 1-cells by recursive halving and pushes the equivalent merges, so a stage can guarantee an 8 or 16 tile exists before the normal backward build runs. `generate` now consumes `extra.big` and subtracts the claimed cells from the tile budget, leaving all other generator behaviour untouched.
