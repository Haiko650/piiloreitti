# Pathle — technical acceptance review, 9 November 2026

**Build:** DEV 1.5.57, branch `pathle-modular-dev`  
**Acceptance status:** **TECHNICAL PASS, ANDROID HARDWARE SIGN-OFF PENDING**  
**Production:** `main` remains untouched.  
**Review baseline:** `bb76428046da850c571ebe785f4211dfd621876b`  
**Restorable pre-audit baseline:** `pathle-backup-before-code-review-20261109`.

## Verification performed

| Gate | Outcome | Evidence |
|---|---|---|
| Version manifest, generated resource revisions, JS syntax | PASS | GitHub Actions development checks |
| Dependency-free Node regression tests | **203/203 PASS** | Includes next-version dry-run |
| Real Chromium mobile smoke tests | **9/9 PASS** | Isolated localhost pages, mobile viewport/touch simulation |
| Main menu, Settings, Daily Adventure, Treasure Hunt tutorial | PASS | Browser UI flows and screenshots |
| Water World → Coral Coast; 60 markers/56 future previews | PASS | Browser DOM and navigation assertions |
| Browser Back: level → area → world | PASS | Same-document history test |
| Save continuity through reload and app-like page switching | PASS | IndexedDB saved best and other data verified |
| Coral Coast illustration decoding / image loading | PASS | All six WebP images decoded and rendered |
| Three mobile/tablet screen widths (320, 390, 768px) | PASS | All five section seams measure 0px; horizontal map overflow 0px |
| GitHub Pages build and deployment | PASS | GitHub Pages workflow for tested commit |
| Real Android handset, OS Back gesture, app interruption, battery/thermal | **NOT TESTED** | Requires owner-run physical-device acceptance |

### Evidence

- Development checks: https://github.com/Haiko650/piiloreitti/actions/runs/42629755927
- Browser screenshots and JSON diagnostics: `pathle-browser-screenshots` artifact of the same run.
- Test implementation: `tests/browser/browser-smoke.test.cjs`.
- Last complete browser review measured 320, 390 and 768px map widths, six image sections and 60 markers.
- The release version remains DEV 1.5.57 because these additions only affect tests and documentation.

## Findings and actions

1. **No blocker confirmed by the completed automated tests.** Navigation, saved score continuity, illustrated map geometry and front-end resource validity satisfy the covered assertions.
2. **An image-screen capture timing issue was found in the audit test.** Jumping directly to the distant top of the six-part map after marking images `loading=eager` could capture only the fallback gradient even though images had finished loading. The test now explicitly waits for bitmap `decode()` and two animation frames before screenshots. Repeated top-of-map screenshots show the full illustrated gate. No production rendering change was made.
3. **The test coverage remains intentionally narrower than Android production readiness.** Playwright mobile emulation is Chromium on Ubuntu, not Chrome or a WebView on a physical Android handset.
4. **Old experimental content is retained where tests or rollback require it.** This is deliberate, not a removal oversight.

## Physical Android acceptance — pending, do not mark completed early

Use the actual DEV 1.5.57 game on a real phone. Never clear an existing player's save simply to reproduce the first-run tutorial; test the tutorial in a separate browser profile if necessary.

- [ ] Check the version label, game boot, Daily Adventure and Treasure Hunt entry.
- [ ] Navigate Water World → Coral Coast; ensure 1–4 are playable and 5–60 are visually disabled.
- [ ] Scroll all the way from level 1 to level 60 and back. Check the six illustrations, seams, title overlays and Haiko marker without flicker/blank gaps.
- [ ] Scroll away from Haiko; verify that Return to Haiko appears, returns to the marker and hides when appropriate.
- [ ] Use **Android's native Back** from gameplay, Coral Coast and Water World; compare to intended navigation without losing progress.
- [ ] Finish or replay one already-available level; close Chrome, reopen, switch apps and verify the best score remains unchanged.
- [ ] Briefly lose network connectivity and restore it; check error handling and saved progress.
- [ ] Try an extended 15–20 minute session; watch for slow scrolling, memory pressure, battery/heat and missing images.

If any failure occurs, save a screenshot, device model, Android/Chrome version, navigation steps and DEV version. Fix on `pathle-modular-dev` only, retest, and do **not** merge to `main` until approved.

## Conclusion

The examined **development build passes static, Node and Chromium mobile acceptance** and is suitable for continued game-content development. This is **not** unconditional sign-off for a commercial Play Store release. Real-device Android testing, broader device coverage, interrupted-write/low-storage tests and future game content acceptance are still outstanding.

No live player records were accessed or modified by these browser tests.
