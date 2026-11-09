# Pathle — technical improvement tracker (2026-11-09)

Baseline: DEV v1.5.52, commit `1081123822c952bc03352cb6fab827af4599de90`.
Restore point: branch `pathle-backup-before-code-review-20261109`.
All production and game-save changes must be reviewed on `pathle-modular-dev`; `main` is not modified.

| Package | State | Notes |
|---|---|---|
| 1. Baseline and rollback | Complete | 194/194 baseline tests passed, recovery branch created |
| 2. Release and cache correctness | Complete | DEV 1.5.53; stylesheet-relative images now receive Git blob content fingerprints; new regression |
| 3. CSS and UI cleanup | Partially complete | DEV 1.5.54 extracted 11 inline images. DEV 1.5.55 consolidates overridden Haiko map marker CSS and adjacent duplicate menu rules. Browser smoke tests and screenshot comparison cover visual behavior; more style cleanup remains. |
| 4. Image and runtime performance | Partially complete | Reduced `css/styles.css` from 396,296 to 71,357 characters. Browser network/memory and mobile frame time measurements still required; no performance claim without measurements. |
| 5. Save migration and cosmetic persistence | Pending | Requires migration, backup, and Android recovery tests; avoid changing currently working stores prematurely. |
| 6. Puzzle generator resilience | In progress | Added deterministic Daily board sampling and invariants; future special effects need synchronized engine/solver changes. |
| 7. Browser visual regression checks | Partially complete | Headless Chromium CI smoke tests cover home, settings, Hideout, Daily, tutorial, 60 Coral Coast stops, Haiko return, and responsive widths; screenshot artifacts are generated. Approved golden-image comparison and physical Android tests are still outstanding. |
| 8. Legacy cleanup and final review | Pending | Review use of v1 Treasure Hunt fixtures, old map SVGs, and update stale documentation after the other packages. |

Release validation: `node scripts/sync-release.cjs --check`, `node --test tests/*.test.cjs`, plus the next-version dry-run in GitHub Actions.

The user-approved goal is to preserve all visible game behavior and player saves. A package is marked complete only after tests pass; Android visual verification must be distinguished from CI.
