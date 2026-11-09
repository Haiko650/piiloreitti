> **Historical Android test log (5 November 2026).** These outcomes belong to earlier builds, not proof that DEV 1.5.57 was manually verified. The player-facing 30-level campaign was replaced by a three-level tutorial followed by Coral Coast with four released stages and 56 preview markers. The version badge and update-check flow are implemented in newer builds; verify them again on a phone.

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

## 2026-11-05 – Treasure Hunt Android round 2 (user-reported)

**Outcome: PASS 7/7.** This is a second player-reported manual Android
acceptance result, not a simulation or CI result. Both rounds total
**14/14 player-reported checks passed** with no reported failures.

1. Clear level 2 and advance via Next Level to level 3: PASS.
2. Clear level 3, advance to level 4, confirm map unlocks 4 but locks 5: PASS.
3. Clear level 4, unlock level 5 and retain progress after reopening: PASS.
4. Replay a cleared level with more moves; saved best and fins do not worsen: PASS.
5. Restart after making moves; attempt resets without deleting stored best: PASS.
6. Drag/swipe rapidly through adjacent cells and around blockers; no illegal moves: PASS.
7. Suspend app briefly and resume, then switch to Daily Challenge and back;
   Treasure Hunt progress remains intact: PASS.

Note: The prior internal draft listed an extra redundant reload check;
round 2's actual **seven-item** player-facing checklist included reload
persistence under item 3. Do not inflate the manual test count.

### Suggested Android round 3 – not yet run

- [ ] Verify 8×12 (levels 11–20) and 10×15 (levels 21–30)
      boards fit the actual phone without zoom, and touch targets are usable.
      Reach these stages through the normal campaign; avoid manipulating
      production save data just to unlock them.
- [ ] Test the 3/2/1-fin boundaries with multiple legitimate replays.
- [ ] Verify a longer session (e.g., 20+ minutes) and several app suspensions.
- [ ] Test game reopen after exiting during an incomplete run; this may
      intentionally restart the incomplete attempt, but must preserve
      previously completed levels.
- [ ] Recheck the **implemented** version badge and update-check flow in DEV 1.5.57 on a real Android phone.

### Explicitly not yet tested

- 8×12 boards at levels 11–20 and 10×15 boards at levels 21–30
  on the actual phone; both should fit without zoom.
- Extended sessions / repeated app suspension, browser refresh during
  an in-flight save, low storage and interrupted IndexedDB writes.
- Multiple Android browsers and devices.
- Current incomplete-run persistence is intentionally NOT implemented;
  closing the browser can lose an unfinished attempt.
- A visible version/build indicator and explicit update-check control are implemented in recent builds, but require an up-to-date manual Android check.

## Release safeguards

GitHub Actions `.github/workflows/pathle-tests.yml` runs JavaScript
syntax checks and Node regression tests on development pushes. CI passing
does not substitute for Android screen and touch testing.

Never modify the `main` branch without explicit approval.

## Current round (DEV 1.5.57) — proposed, not yet player-verified

- [ ] Start with a fresh Treasure Hunt save, complete the three-level tutorial, confirm the Water World overview appears.
- [ ] Open Coral Coast: 60 distinct map markers are visible; only 1–4 are playable and 5–60 say Coming soon.
- [ ] Scroll bottom to top across all six uninterrupted WebP illustrations without blank gaps, flicker or misplaced Haiko.
- [ ] Move away from Haiko and use Return to Haiko; verify appearance and tap target on a real phone.
- [ ] Return one screen at a time with both the upper-left button and Android Back.
- [ ] Verify Daily Adventure and Treasure Hunt progress after closing, reopening and switching apps.
- [ ] Test the build badge and update check while online and after a connection interruption.
- [ ] Longer session on a lower-end Android device; note heat, memory, jank and image reloads.

**Important:** Previous legacy campaign results are archived evidence, not a substitute for these checks.

## Final technical audit (9 November 2026) — NOT a handset test

The GitHub CI verified nine Chromium mobile flows (320, 360, 390 and 768px viewports), including app-like page switching, history-based Back, six images without gaps and saved progress after reload. This is **mobile emulation in a Linux runner**, not native Android.

On-device sign-off remains **PENDING**. Follow the eight physical Android checklist items in [technical acceptance review](TECHNICAL-ACCEPTANCE-2026-11-09.md). When performed, record results as owner-reported manual checks, keeping them separate from the automated tests.
