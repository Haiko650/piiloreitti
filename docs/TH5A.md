# Pathle Treasure Hunt – TH.5A Adventure Map & Save Progress

**Development preview:** `treasure-hunt.html?th5=1` on `pathle-modular-dev` through RawGitHack.

The normal `treasure-hunt.html` stays at three manual prototype boards. `?th4a=1` still opens thirty freely selectable generated test boards **without permanent progress**. Only `?th5=1` enables the adventure map and indexed saves.

## Progression contract

- 30 deterministic TH.4A levels grouped into Coast, Ocean and River.
- Level 1 unlocked initially; each first clear unlocks the next after a successful save.
- Cleared levels may be replayed. Worsening a score never replaces its best.
- The best is stored as `bestMoves`; 3/2/1 fins are recalculated from the TH.3A exact solver and rating thresholds.
- The illustrated adventure map shows a winding underwater route of 30 stops.
- No Treasure Hunt Hideout items are granted yet, so there is no duplicate reward path.
- Partial moves are not yet persisted. Leaving a level and returning restarts it.

## Save format and safety

The existing `PathleStorage` IndexedDB database and three-snapshot rotation are reused. The extension looks like:

```json
{"version":1,"seed":"pathle-treasure-campaign-2026-v1","generatorVersion":1,"records":{"thg1-7269b58f-00001":{"bestMoves":19}}}
```

The model validates the seed, generator version, contiguous clears, recognized level IDs, legal integers and scores not better than the exact optimum. Corrupt or future-version progress fails closed; it is never reset automatically.

**Never use `PathleStorage.save(staleSnapshot)` to record an existing Treasure Hunt result.** Use `PathleStorage.update(mutator)` with a change only to `draft.extensions.treasureHunt`. This preserves Daily progress, reward inventory and settings when both modes save. The victory modal is withheld until the atomic write succeeds. Failed writes leave the completed board intact and display a blocking Retry Save dialog.

The only use of `save(createEmptySave())` is a first visit to Treasure Hunt on an entirely empty browser origin.

## Implementation

- `js/treasure-progress.js` – model, validation, immutable updates.
- `js/treasure-campaign.js` – map, safe boot, IndexedDB updates and retry.
- `css/treasure-campaign.css` – responsive visual map and error dialog.
- `js/treasure-preview.js` – opt-in TH.4A/TH.5A modes.
- `js/treasure-ui.js` – safe level selection and unchanged game engine.
- `js/treasure-victory.js` – awaits a successful result save.

## Testing and next steps

New Node suites: `tests/treasure-progress.test.cjs` and `tests/treasure-campaign.test.cjs`. Run `node --test tests/*.test.cjs`. A simulated browser harness separately verified first clear, unlock, no replay write, preservation of Daily data, a failed write, Retry Save, and returning to the map from victory.

**Manual Android testing is still required.** Verify map scrolling and board sizing, replay/next, reload persistence, failure handling and small-screen usability. No cloud sync or cross-origin save migration exists; RawGitHack and GitHub Pages have separate browser storage. Keep `main` untouched.
