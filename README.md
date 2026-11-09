# Pathle — Ocean Journey

Pathle is a mobile-first, static HTML/CSS/JavaScript puzzle game. Its two playable experiences are **Daily Adventure** and **Treasure Hunt**.

**Current development version:** DEV 1.5.57 (9 November 2026). All new changes are developed and tested on `pathle-modular-dev`. Do **not** merge, push, or change `main` without explicit approval.

## Play and develop

- Player entry: `index.html` — the home menu and Daily Adventure.
- Treasure Hunt entry: `treasure-hunt.html` — first-run three-puzzle tutorial, Water World overview, and Coral Coast.
- The published development page is sourced from the GitHub Pages branch configuration. Check GitHub Actions for the latest publication status. The GitHub-hosted page may be cached; refresh after a new development version.
- The current Coral Coast displays **60 map markers**, but only **levels 1–4** are released and playable. Markers 5–60 are deliberately labelled *Coming soon*. Do not treat unreleased levels as missing puzzles.

## Architecture

| Layer | Canonical files |
|---|---|
| Daily Adventure gameplay | `js/board-engine.js`, `js/game.js` |
| Treasure Hunt puzzle rules | `js/treasure-engine.js`, `js/treasure-generator.js`, `js/treasure-solver.js`, `js/treasure-grading.js` |
| Current Treasure Hunt campaign | `js/treasure-bootstrap-v2.js`, `js/treasure-release-v2.js`, `js/treasure-progress-v2.js`, `js/treasure-campaign-v2.js` |
| World and route layout | `js/treasure-worlds.js`, `js/treasure-map-layout.js`, `js/treasure-map-art.js` |
| UI | `js/treasure-ui.js`, `js/treasure-victory.js`, `css/`, `images/` |
| Shared saves | `js/save-schema.js`, `js/storage.js`, `js/treasure-save-v2.js` |
| Release & cache versioning | `version.json`, `scripts/sync-release.cjs`, `js/version.js` |

See [architecture notes](docs/ARCHITECTURE.md) for the dependency diagram, retained legacy files, asset handling and extension rules.

## Tests (Node.js 22)

The repository has no runtime package dependencies. From the project root:

    node scripts/sync-release.cjs --check
    node --test tests/*.test.cjs

The separate Chromium suite is installed only in CI or for optional local verification:

    npm install --no-save --no-audit --no-fund playwright@1.56.1
    npx playwright install chromium
    node --test tests/browser/*.test.cjs

GitHub Actions also runs a **next-version dry run** to check the release synchronizer. Chromium tests exercise actual mobile-sized views in isolated localhost browser contexts and create diagnostic screenshots; they do not replace manual Android checks. See [browser test notes](docs/BROWSER-TESTING.md) and [historical Android results](docs/ANDROID-TESTING.md).

## Making changes safely

1. Read [the technical quality tracker](docs/CODE-QUALITY-TRACKER.md) and the current release notes in `docs/VERSIONING.md`.
2. Edit only the development branch. Save data, published puzzle IDs, scoring, Haiko's artwork and the visual design should remain unchanged unless the task explicitly calls for them.
3. New map artwork goes in `images/maps/water-world/` and is referenced through `js/treasure-map-art.js`. Map images never contain baked-in level numbers, paths or the Haiko marker.
4. For a new release, update **only** `version.json` as the source of truth; on a local checkout run `node scripts/sync-release.cjs --write` to synchronize the HTML labels, JavaScript version and content fingerprints. Run `--check` before committing. Do not hand-edit generated asset hashes.
5. Run the Node tests and Chromium smoke tests; review the screenshot artifacts and, for visible changes, test an actual Android phone.
6. Preserve a rollback commit. Do not publish on `main` without approval.

Earlier campaign modules remain in the repository for **regression compatibility**, not for the current player-facing game. Do not remove them until their test dependencies have been intentionally migrated.

## Project documentation

The `docs/TH*.md` files are dated milestone records; they describe designs that may have changed. The **current** architecture is described here and in `docs/ARCHITECTURE.md`; unfinished planned work lives in `docs/TODO.md`.
