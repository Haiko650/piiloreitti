# Pathle Android testing log

Branch: `pathle-modular-dev`. Canonical phone-testing URL:
`https://haiko650.github.io/piiloreitti/`.

## 2026-11-05 – Treasure Hunt Android round 1 (user-reported)

**Outcome: PASS 7/7.** This records *manual results reported by the
player*; they are separate from CI and should not be described as
automatically verified Android tests.

1. Main menu opens and Treasure Hunt launches: PASS.
2. Numbered map shows levels 1–30: PASS.
3. Level 1 is playable and the following levels initially locked: PASS.
4. Map button after moves asks whether to keep playing or exit: PASS.
5. Level 1 completion shows fins, Next Level opens level 2: PASS.
6. Map shows completed level 1 and unlocked level 2: PASS.
7. Closing and reopening retains completed progress: PASS.

## Android round 2 – pending manual checks

Use the SAME GitHub Pages origin and do not clear application/site data.
Do not modify already published map layouts merely for these checks.

- [ ] Complete levels 2 and 3, then confirm **Next Level** opens
      level **4 / 30** with a playable board.
- [ ] Return to the map after finishing level 3; level 4 should be
      unlocked, and level 5 locked until level 4 is cleared.
- [ ] Replay an already cleared level with **more** moves than the saved
      best. Map score / fins must not worsen. Victory shows current
      moves and saved personal best separately.
- [ ] Press **Restart** after moves. Position, treasure collection and
      attempt move count should reset, without clearing the best score.
- [ ] Swipe/drag through several adjacent water tiles, including around
      an obstacle. No skipping through blockers or unexpected teleporting.
- [ ] Switch briefly to another app while a run is in progress,
      return to Pathle and continue. A background/foreground transition
      should not corrupt the running board.
- [ ] Open Daily Challenge, return to Treasure Hunt. Treasure Hunt
      records and unlocks should still be intact.
- [ ] Close/reopen the GitHub Pages page after a new completion and
      confirm the number of unlocked levels and personal best persists.

### Explicitly not yet tested

- 8×12 boards at levels 11–20 and 10×15 boards at levels 21–30
  on the actual phone; both should fit without zoom.
- Extended sessions / repeated app suspension, browser refresh during
  an in-flight save, low storage and interrupted IndexedDB writes.
- Multiple Android browsers and devices.
- Current incomplete-run persistence is intentionally NOT implemented;
  closing the browser can lose an unfinished attempt.
- A visible version/build indicator and an explicit "check for update"
  control are still proposed, not implemented.

## Release safeguards

GitHub Actions `.github/workflows/pathle-tests.yml` runs JavaScript
syntax checks and Node regression tests on development pushes. CI passing
does not substitute for Android screen and touch testing.

Never modify the `main` branch without explicit approval.
