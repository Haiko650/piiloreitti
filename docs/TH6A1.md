# Pathle Treasure Hunt TH.6A.1 – expandable world/area framework

Implemented on **pathle-modular-dev**; intentionally NOT yet connected to
the existing player-facing `treasure-hunt.html`. This is the first safe
implementation milestone, not the release of the replacement campaign.
The original 30-map TH.5 campaign remains temporarily playable for
regression checks until the new tutorial/world UI can replace it cleanly.

## Confirmed structure

Treasure Hunt -> Worlds -> Areas -> Levels.

- World 1 internal ID `water-world`; public name is provisional.
- Water World is a geographically coherent 2.5D landscape with a world
  overview and separately scrollable, winding area maps.
- World 2 `space-adventure` is a placeholder for a future expansion,
  not a released game mode.
- Initial planned area definitions: `coral-coast`,
  `tropical-islands`, `open-ocean`, each initially targeting
  60 levels. The world has no architectural area or 183-level cap.
  Remaining proposed areas are not yet frozen as content.
- The area target count is a content-planning value, not the number
  of currently published levels. `levelIds` contains ONLY actual
  published/tested levels. Do not add 60 fake playable placeholders.
- A three-level, fixed tutorial replaces the old 30-map onboarding
  campaign **when the new UI is enabled**. New stable IDs are
  `th-tutorial-001` through `th-tutorial-003`.
  `TUTORIAL_LESSONS` defines movement, multiple treasures, and
  obstacles + fin awards. Puzzles have passed exact-solver validation.
- A `DEV_TEST_LAB` (Haiko's Test Reef) is reserved outside all
  normal worlds, areas, level lists and progress; it has no real
  achievements or persistent scores. Its mechanism-specific test
  boards are still to be developed.

## Stable IDs, graphics and future game features

- The world list is ordered by **numeric `sort`**, not by name/ID;
  adding Space Adventure cannot reorder saved Water World achievements.
- Area `sort` and `unlock.afterAreaId` are separately defined;
  levels always unlock sequentially within their published area.
- A level's puzzle identity is distinct from its area/map position.
- `map.nodes[levelId]` may define `sectionId` and normalized
  `x,y` coordinates for illustrated, vertically scrolling map sections.
  The map art can change without changing puzzle IDs.
- Area default `visualMode` is `surface` (fin only), but
  `visualOverrides[levelId]` can switch an individual stage to
  `underwater` (full swimming Haiko). Both modes can coexist
  inside one area. The renderer is NOT implemented yet.
- `featureAtEnd` is only a planning hint. Current engine v1 still
  rejects special effects. New mechanics require synchronized engine,
  generator, solver, scoring and Android testing.
- Future lives and maximum-move rules are RESERVED DESIGN CHOICES, not
  active gameplay or stored fields. Do not enforce such rules yet.

## Progress and non-destructive storage

New API: `js/treasure-progress-v2.js`.
Storage boundary: `js/treasure-save-v2.js`.

- New save key is `extensions.treasureHuntV2`, version 2.
  A new v2 campaign starts fresh, not with the prior 30 best scores.
- Existing `extensions.treasureHunt` is preserved, not migrated,
  overwritten, imported or deleted; it serves as a legacy backup.
- Other keys (Daily Challenge, settings, items, hideout) remain
  completely untouched. The adapter uses the existing atomic
  `PathleStorage.update` when activated and never writes upon
  importing a module.
- Best moves are saved per immutable level ID. Worse replays do not
  overwrite personal bests; total fins can be derived from grading.
- `unlock.minimumFins` optionally requires sufficient fins from the
  previous area as well as completion. No active fin threshold in the
  initial content. Once an area is unlocked, its ID is saved to
  `unlockedAreas` and subsequent threshold changes cannot revoke
  access. An unreleased area is always inaccessible.
- Unknown/corrupt progress fails closed; never silently reset existing
  player records. Interrupted DB commits do not grant progress.

## Files

- `js/treasure-worlds.js`: data model, tutorials, area layout,
  world and level lookup, DEV test lab.
- `js/treasure-progress-v2.js`: new record/unlock rules.
- `js/treasure-save-v2.js`: lazy read and atomic write boundary.
- `tests/treasure-worlds-v2.test.cjs` and
  `tests/treasure-save-v2.test.cjs`: extensive checks for expansions,
  unlocking, fin conditions, mixed surface/deep-water display,
  old save isolation and failed writes.

Existing old TH.5 tests remain in place as regression guards.
Do not remove these safeguards until the replacement is thoroughly tested.

## Next implementation milestone: TH.6A.2

1. Connect v2 modules to the actual Treasure Hunt ONLY after an
   explicit new-entry controller/feature switch is tested.
2. Build first-launch 3-step interactive tutorial with short Haiko
   prompts, a replay option, and no loss of existing Daily data.
3. Implement Water World overview and the new vertically scrollable
   area map (initially a minimal working map, then polished 2.5D art).
4. Add the first **real released Coral Coast levels** and keep future
   area nodes visibly unavailable; no premature 60-level release.
5. Add an optional developer-only mechanics lab entry and test
   later currents before releasing them as player stages.
6. Bump `version.js`, `version.json` and the HTML fallback together
   for the first player-facing switch. Test with Android on the
   permanent GitHub Pages URL before calling the UI released.
7. After the new UI is verified, retire the old 30 player-facing
   levels. Do not delete old records or reset the whole database.

**Do not change `main` without explicit approval.**
