> **HISTORICAL MILESTONE RECORD — not the current gameplay/artwork manifest (9 Nov 2026).** This document preserves an earlier TH.6A design and may describe replaced SVG maps, old Android issues or unavailable levels. For current DEV 1.5.57, use [architecture](ARCHITECTURE.md), [project README](../README.md) and the live `js/treasure-map-art.js` manifest. Coral Coast now has six WebP map sections and 60 visible map markers; only levels 1–4 are playable.

# Pathle Treasure Hunt TH.6A.2 – first playable Water World slice

**Branch:** `pathle-modular-dev`
**Player entry:** `https://haiko650.github.io/piiloreitti/treasure-hunt.html`
**Development release:** v1.5.0

This implementation replaces the former **player-facing** 30-map adventure
with a new campaign consisting of **3 short tutorial puzzles** followed by
**4 initial Coral Coast puzzle stages**. Coral Coast's longer-term goal is
60 stages, not 4. Tropical Islands and Open Ocean are currently shown as
unavailable future destinations. The actual content catalog can grow
indefinitely, and no dummy achievements are created for future stages.

## Navigational structure

1. First entry: three short fixed tutorial stages (adjacent movement,
   multiple treasures, coral obstacles and fin scoring).
2. Tutorial completion: Water World geographic overview, with active
   Coral Coast and future destinations.
3. Open Coral Coast: an independently scrolling illustrated path map.
   The current node shows a separate Haiko character, completed nodes
   show fins and future nodes remain locked.
4. Enter a numbered map stage: the existing thoroughly tested
   Treasure Hunt movement/score/fin board renderer runs the puzzle.
5. Replays improve personal best without duplicating unlocks.
   Map exit with an unfinished run still requires confirmation.

**TH.6A.2 is not yet manually verified on Android.** Its main UI
requires a fresh full Android smoke test.

## Artwork architecture – swappable without touching gameplay

The map is drawn from **independent image layers and DOM/SVG nodes**:

| Component | Replaced by editing |
|---|---|
| Water World overview image | `images/maps/water-world/world-overview.svg` |
| Coral Coast section background | `images/maps/water-world/coral-coast/section-01-base.svg` |
| Foreground plants/coral/details | `images/maps/water-world/coral-coast/section-01-details.svg` |
| Small swimming Haiko marker | `images/maps/water-world/haiko-map.svg` |
| Area sections and art file paths | `js/treasure-map-art.js` |
| Node positions on the map | `js/treasure-release-v2.js` and future area content files |
| Long-scroll stitching and path curves | `js/treasure-map-layout.js` |
| Styles, overlays, node sizes | `css/treasure-world-v2.css` |

Artwork currently uses provisional separate SVG files. New WebP/PNG/SVG
artwork can be placed at the same paths (with corresponding manifest
extensions if file formats change). **Do not bake numbered nodes,
path status, navigation controls, saved fins or Haiko into the background
image.** These are separate interactive/UI layers and stay connected to
immutable puzzle IDs.

The map layout uses short image-backed sections instead of a single
huge bitmap. As new stages are published, add new sections and their
base/foreground art; the geographic world overview remains separate.
CSS gradient fallbacks are supplied if an artwork file is not loaded.

The region's default gameplay visual mode is `surface` (fin visible
above water); the data model can override any individual stage with
`underwater` for a future full swimming Haiko renderer. A full body
gameplay sprite is **not yet enabled**. World-map Haiko has its own
replaceable sprite now.

## Persistence, testing and safeguards

- New progress is stored under `extensions.treasureHuntV2`.
- The retired `extensions.treasureHunt` is left untouched as an
  archived backup; no old best scores leak into the new tutorial.
- Daily Challenge, settings, Hideout and other parts of the shared
  IndexedDB are not reset.
- Stage ids remain stable when map backgrounds or point positions change.
- Area unlock rules can later include minimum fins, without retroactively
  revoking a previously unlocked area.
- The future mechanics test reef, consumable lives and move-limit
  gates are **not player-facing or active** in this release.
- Legacy v1 regression tests remain in the repository for save safety.

## Android acceptance round

Use the canonical GitHub Pages address. Do not clear browser data.

1. Check main-menu build label: `DEV · v1.5.0`.
2. First Treasure Hunt entry opens the three-lesson introduction.
3. Complete tutorial 1, 2 and 3; Next advances through lessons.
4. After tutorial 3 choose **Explore Water World**, not old level 4.
5. Confirm Coral Coast is available; other destinations say **Soon**.
6. Enter Coral Coast, scroll its illustrated trail, tap level 1.
7. Finish one Coral Coast level, replay it and verify the best score
   cannot worsen.
8. Tap Map after making some moves; keep/leave confirmation must work.
9. Close and reopen browser, check tutorial completion and Coral Coast
   best score are still saved; Daily Adventure progress remains intact.
10. Verify artwork, number badges, full-body Haiko map marker and
    touch targets fit the Android screen without clipping.

Any failure should be fixed before extensive content production.

## Next steps

- Android smoke testing of the new entrypoint and landscape scrolling.
- Finalize map artwork through the independent manifest and file layers.
- Refine Haiko's tutorial guidance and animation.
- Implement a developer-only mechanics test reef for currents and
  other new mechanics (synchronized engine, solver and grading).
- Extend Coral Coast stage count incrementally toward its 60-stage
  initial goal, not all at once.

**Do not change `main` without explicit authorization.**
