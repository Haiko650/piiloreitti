# Pathle architecture — active DEV 1.5.57

Updated 2026-11-09. This is the current-implementation guide; older `TH*.md` files are **historical milestone snapshots**.

## Runtime entry points and dependency flow

**Daily Adventure:** `index.html` loads board generation, common save schema and storage, visual assets, version control and `js/game.js`. Browser and Android date, progress, and screen actions are owned by the Daily controller; rules remain in `board-engine.js`.

**Treasure Hunt:** `treasure-hunt.html` loads the puzzle engine → solver/grading/generator → world/catalog/manifest → validated v2 bootstrap → progress & shared storage → v2 campaign and interface. The active public controller is `js/treasure-campaign-v2.js`. `js/treasure-release-v2.js` contains the currently released tutorial and first four Coral Coast puzzles.

Stable level IDs are independent of map coordinates. `treasure-worlds.js` defines the world and area metadata; `treasure-map-layout.js` places nodes and draws the route; `treasure-map-art.js` maps sections to graphics; `treasure-campaign-v2.js` builds DOM elements and handles navigation and save-related results.

## Present map geometry

- Water World overview: three geographic panels in scrolling order, with two existing northern SVG sections and the `coral-coast-overview.webp` southern panel. Earlier SVG artwork remains as historical fallback/test fixtures.
- Coral Coast: six continuous WebP sections from the common art master, top-to-bottom sections 06 → 01. **The journey progresses from the bottom upward**.
- Coral Coast currently has **60 separate map markers**, of which stages 1–4 are playable and 5–60 are disabled previews. Haiko's independent marker, path SVG, labels, buttons and scores are not baked into the images.
- Since DEV 1.5.57, **actual WebP `<img>` elements** draw Coral Coast section art. CSS water gradients remain behind them as a fallback; the duplicate CSS WebP background fetch was removed.
- Image content fingerprints in HTML and relative CSS image URLs are produced by `scripts/sync-release.cjs`.

## Persistence and versioning

Shared game progress is stored through validated, revisioned IndexedDB (`js/save-schema.js` and `js/storage.js`). The Treasure Hunt extension uses v2 progress data. Historical local-only records and older v1 test data must never be assumed to be official v2 achievements.

**`version.json` is authoritative.** Do not edit cache version strings by hand. Run `node scripts/sync-release.cjs --write` to generate the version module, page links and image/css/js content hashes, then `--check` to verify the generated outputs.

## Legacy files: retain until tests are migrated

- `js/treasure-bootstrap.js`, `js/treasure-campaign.js`, `js/treasure-progress.js`, `js/treasure-levels.js`, `js/treasure-preview.js` are former Treasure Hunt implementations/fixtures. They are **not loaded by the current player-facing Treasure Hunt HTML**.
- `piiloreitti-backup.html` is an old fallback snapshot, not the current game entry.
- The old map SVGs in `images/maps/water-world/` still support historical tests and development comparisons. Do not delete them merely because the current southern world/map imagery is WebP.
- The data-only work-in-progress notes under `docs/TH*.md` document prior milestones and may refer to obsolete art paths.

## Safety and testing

Current GitHub Actions executes the Node regression suite, a next-release dry run, and a separate Chromium mobile smoke suite. The latter covers Daily, Tutorial, Coral Coast, navigation, map images and diagnostic measurements using isolated browser saves. **Actual Android visuals and interruption behavior still need manual checks** after significant changes.

For new mechanics, update the engine and solver together and validate release content before publishing. Never change published puzzle IDs/paths or player save interpretation as a side effect of a visual refactor. Keep `main` untouched until explicit release approval.

## Known remaining tasks

- Complete real-device Android tests and approved screenshot baselines for future CSS changes.
- Audit older CSS overrides further only with comparative visual coverage.
- Expand Coral Coast with genuinely playable levels; the existing previews are not a replacement for released puzzles.
- Keep outdated historical design notes labelled clearly; do not silently rewrite the historical record.
