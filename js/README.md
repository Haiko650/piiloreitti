# JavaScript modules

**Current runtime:** `index.html` uses `board-engine.js` and `game.js` for Daily Adventure; `treasure-hunt.html` uses the `treasure-*-v2.js` entry/progress/campaign modules plus the shared Treasure Hunt puzzle engine, solver, world map, UI and storage code.

Key modules:

- `board-engine.js` / `game.js`: deterministic Daily puzzles and screen orchestration.
- `treasure-engine.js`, `treasure-solver.js`, `treasure-generator.js`, `treasure-grading.js`: Treasure Hunt gameplay and scoring.
- `treasure-release-v2.js`, `treasure-bootstrap-v2.js`, `treasure-progress-v2.js`, `treasure-campaign-v2.js`: player-facing Treasure Hunt content, activation, progress, navigation.
- `treasure-worlds.js`, `treasure-map-layout.js`, `treasure-map-art.js`: independent world geometry, routes, and image registry.
- `save-schema.js`, `storage.js`, `treasure-save-v2.js`: shared IndexedDB save validation and safe update path.
- `version.js`: generated from `version.json`.

The unsuffixed older `treasure-bootstrap.js`, `treasure-campaign.js`, `treasure-progress.js`, `treasure-levels.js` and `treasure-preview.js` are **legacy regression fixtures**. Do not treat them as active entry points or delete them without migrating the tests that still rely on them.

See [root README](../README.md) and [architecture](../docs/ARCHITECTURE.md).
