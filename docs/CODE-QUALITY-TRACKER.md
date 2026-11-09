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
| 7. Browser visual regression checks | Chromium acceptance passed; Android pending | Added cross-viewport map seam checks, browser Back navigation and saved progress across page switches. Verified top-of-map image decoding before screenshots. 9/9 browser checks green; real Android handset and approved golden image baselines remain outstanding. |
| 8. Legacy cleanup and final review | Automated acceptance completed; Android pending | Current architecture, resource audit and historical documentation are done. DEV 1.5.57 completed 203/203 Node and 9/9 Chromium tests. Physical Android sign-off remains required; see `docs/TECHNICAL-ACCEPTANCE-2026-11-09.md`. |

Release validation: `node scripts/sync-release.cjs --check`, `node --test tests/*.test.cjs`, plus the next-version dry-run in GitHub Actions.

The user-approved goal is to preserve all visible game behavior and player saves. A package is marked complete only after tests pass; Android visual verification must be distinguished from CI.

## Documentation and dependency audit — 2026-11-09

- Current project README and an architecture reference now distinguish active v2 gameplay and its predecessor regression fixtures.
- TH.6A milestone documents and the Android test log are retained as dated historical evidence; current maps and a new manual Android acceptance checklist are explained separately.
- Entry-point tests now verify every local HTML image, CSS and JS fingerprint and that retired controller modules do not load in the player-facing Treasure Hunt page.
- Removed an unreferenced temporary base64 transfer file from docs. Did **not** delete old campaign code, historical backup HTML or SVG assets because they still support tests and rollback.
- No actual Android screen, touch or battery verification has been completed in this documentation-only round.

## Final automated acceptance review — 2026-11-09

Outcome: **PASS for technical CI and Chromium coverage; real Android device verification remains pending.** The checked commit added no gameplay, visuals or player-save migrations. Latest tests: **203/203 Node**, **9/9 Chromium**, GitHub Pages success. See [technical acceptance report](TECHNICAL-ACCEPTANCE-2026-11-09.md) and the user-device checklist in [Android testing](ANDROID-TESTING.md).

## Android-reported usability fixes — DEV v1.5.58

- Result-overlay Back: campaign history navigation now dismisses a completed, already-saved victory dialog before restoring the area map, including keyboard focus and shell inert state.
- Coral Coast tablet: the six 852×1846 illustrated WebP sections preserve their natural aspect ratio at widths ≥600px; phone layouts keep their former 1300px section heights. Routes and stops use normalized coordinates and resize with sections.
- Tablet home: the visible initial menu leaves the former 500px main-column limit and the reef fills the viewport. Buttons stay in a centered touch-friendly column.
- Chromium browser regression: completion → result modal → browser Back; responsive home bounds; six map-section widths, heights and seams for 320/390/768px. Physical Android/tablet verification remains open.
