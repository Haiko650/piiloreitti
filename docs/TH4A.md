# TH.4A – Deterministic Treasure Hunt field generator

Implemented in `js/treasure-generator.js`. **Historical engineering stage:** the normal `treasure-hunt.html` now opens the complete generated adventure with its numbered map. The three original TH.2/TH.3 boards remain in `js/treasure-levels.js` only as regression fixtures.

## Development preview

The former temporary `?th4a=1` preview has been retired. The same thirty stable generated maps are now the actual Treasure Hunt campaign, selected from a numbered map and saved to the game's existing IndexedDB. The three prototype boards and their optimal scores (12, 24, 35) are preserved in automated regression tests.

## Determinism and saved progress

`generateLevel(index,seed)` uses a versioned, non-randomized seed.
It does not use date/time, global Math.random or session state.
The same level index + generator version + campaign seed always
produces the same immutable-in-practice layout: dimensions, terrain,
obstacles, start, goal and treasures.

The default 30 generated test maps are:
- Levels 1–10: coast, 6×8 tiles, 2–3 treasures.
- Levels 11–20: ocean, 8×12 tiles, 3–4 treasures.
- Levels 21–30: river, 10×15 tiles, 4–5 treasures.

The generator can also produce higher indexes; automated checks
cover at least 100 levels. Adding later levels does not change
older levels.

**Before persistent TH.5 player progress:** lock the default
campaign seed and generator version. Do not silently modify the
algorithm for an already released generator version; implement a
new version and preserve existing generated layouts for replays.
Completed-run records should store stable level IDs and/or versioned
seed, not just the next level number.

## Gameplay integrity

- Blockers may form clusters and narrow passages.
- Start/goal vary from map to map.
- Treasures are only placed in the largest connected region with
  a valid route from start to goal.
- No treasure, start or goal is placed on a blocker.
- Exact optimal moves come from the existing TH.3A solver.
- All generated levels currently use `engineVersion:1` and `effects:[]`.

**Not implemented yet:** currents, whirlpools, waves that move the
player, jellyfish hazards, bridges, clam/key gates and tides.
Future hazards require coordinated changes to both the gameplay
engine and the optimal solver. Cosmetic current/rock/forest tiles
from the shared visual asset catalog do not enable game effects.

## Tests

Node: `node --test tests/*.test.cjs`

New: `tests/treasure-generator.test.cjs`, covering deterministic
layouts, original prototype preservation, 30 fully replayable
optimal routes, expansion to 100 maps, invalid arguments, browser
module loading and preview opt-in wiring.

Note: 30 generated maps are **engineering test content**, not yet
balanced levels or a finished adventure campaign. TH.5 will add
the adventure map, unlock progression and durable scores.
