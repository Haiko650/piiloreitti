# Pathle — technical improvement tracker (2026-11-09)

Baseline: DEV v1.5.52, commit `1081123822c952bc03352cb6fab827af4599de90`.
Restore point: branch `pathle-backup-before-code-review-20261109`.
All production and game-save changes must be reviewed on `pathle-modular-dev`; `main` is not modified.

| Package | State | Notes |
|---|---|---|
| 1. Baseline and rollback | Complete | 194/194 baseline tests passed, recovery branch created |
| 2. Release and cache correctness | Complete | DEV 1.5.53; stylesheet-relative images now receive Git blob content fingerprints; new regression |
| 3. CSS and UI cleanup | Partially complete | DEV 1.5.54 extracted 11 inline images. DEV 1.5.55 consolidates overridden Haiko map marker CSS and adjacent duplicate menu rules. Browser smoke tests and screenshot comparison cover visual behavior; more style cleanup remains. |
| 4. Image and runtime performance | Partially complete | DEV 1.5.57 removes the duplicated map background-image resource requests (from 12 to 6 expected in Chromium). Image decodes and screenshots remain protected by browser smoke tests. Physical Android benchmarking still outstanding. |
| 5. Legacy data compatibility | No additional work planned | Existing progress/recovery safeguards and browser tests remain active; other migration work is outside this audit's scope. |
| 6. Puzzle generator resilience | In progress | Added deterministic Daily board sampling and invariants; future special effects need synchronized engine/solver changes. |
| 7. Browser visual regression checks | Partially complete | Headless Chromium CI smoke tests cover home, settings, Hideout, Daily, tutorial, 60 Coral Coast stops, Haiko return, and responsive widths; screenshot artifacts are generated. Approved golden-image comparison and physical Android tests are still outstanding. |
| 8. Legacy cleanup and final review | In progress | Current architecture README and historical milestone notices added; temporary, unused image-transfer scratch file removed. Legacy modules and SVG fixtures intentionally retained because tests still depend on them. Added player-entry asset integrity regression; final Android sign-off remains outstanding. |

Release validation: `node scripts/sync-release.cjs --check`, `node --test tests/*.test.cjs`, plus the next-version dry-run in GitHub Actions.

The user-approved goal is to preserve all visible game behavior and player saves. A package is marked complete only after tests pass; Android visual verification must be distinguished from CI.

## Documentation and dependency audit — 2026-11-09

- Current project README and an architecture reference now distinguish active v2 gameplay and its predecessor regression fixtures.
- TH.6A milestone documents and the Android test log are retained as dated historical evidence; current maps and a new manual Android acceptance checklist are explained separately.
- Entry-point tests now verify every local HTML image, CSS and JS fingerprint and that retired controller modules do not load in the player-facing Treasure Hunt page.
- Removed an unreferenced temporary base64 transfer file from docs. Did **not** delete old campaign code, historical backup HTML or SVG assets because they still support tests and rollback.
- No actual Android screen, touch or battery verification has been completed in this documentation-only round.
