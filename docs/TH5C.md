# Treasure Hunt – TH.5C: navigation and difficulty audit

Treasure Hunt remains a single permanent game mode at `treasure-hunt.html`.
The first 30 maps and their saved level IDs **have not been changed**.

## Player-facing improvements

- Tapping **Map** after making moves now opens a two-choice dialog:
  **Keep playing** or **Leave level**. Accidental taps no longer erase an
  unfinished attempt. Returning before the first move needs no confirmation.
- Keyboard Escape cancels the dialog; Tab stays inside the confirmation.
- Returning during a pending completion/saving sequence cannot bypass the
  existing save protection.
- The map now totals earned fins out of 90 (3 per level). It does **not**
  reveal the exact optimal move count before completing a level.
- Haiko's future idle animation will not play on a hidden board.

**Limitation:** In-progress attempts are still not saved. Choosing
**Leave level** intentionally discards that one incomplete attempt;
previously completed levels and personal bests remain stored.

## Automated checks

A CI workflow at `.github/workflows/pathle-tests.yml` runs
JavaScript syntax checks and `node --test tests/*.test.cjs` on each push
to `pathle-modular-dev`.

Regression tests include:
- confirm/back-to-map protection and untouched-run fast return;
- permanent save unlocks and separation from Daily Challenge;
- correct 3-fin totals after an optimal clear;
- a fixed hash `5e2bc459` of **all 30 published level layouts**, so a future
  generator refactor cannot silently replace a level behind a saved score;
- exact solver validity and difficulty trend.

## Difficulty findings (solver optimum, internal planning only)

| Area | Levels | Board | Avg. optimal moves | Range |
|---|---|---|---:|---:|
| Coral Coast | 1–10 | 6×8 | 18.1 | 14–22 |
| Open Ocean | 11–20 | 8×12 | 31.4 | 26–37 |
| River Delta | 21–30 | 10×15 | 44.4 | 34–50 |

Noticeable spikes: level 10 → 11 rises from 18 to 30 optimal moves.
Level 20 → 21 rises from 37 to 50, followed by a dip to 34 at level 22.

**Do not reorder or change the released 30 maps merely to smooth these
spikes**, because their IDs and player best scores are already persistent.
We can later tune their difficulty through separately versioned designs,
playtester feedback or new levels, preserving the old layouts and records.

## Next recommended milestone

Review mobile playability of the return-confirmation and 30-level map.
Then plan the first *new gameplay mechanic* (current tile, clam, key gate
or timed tide) with synchronized game-engine and exact-solver rules.
No new mechanics were enabled in TH.5C; cosmetic art remains swappable.
