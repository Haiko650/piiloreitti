# Pathle development versions and mobile update checks

## Release identity

The main menu shows a compact **tappable** build label at the top center,
between Settings and the DEV toggle:

**DEV · v1.5.0**

The installed version is defined in `js/version.js`. The published
GitHub Pages version is described by `version.json` in the repo root.
The version and channel must match on every release. The CI test
`tests/version-label.test.cjs` checks the match.

## How the player checks

- Opening the main menu makes a **silent, read-only** request to
  `version.json` on the same origin. A small dot appears beside the
  version label if a newer published version is available.
- Tapping the version label opens a short status dialog and triggers
  a fresh check, with a **Check again** action.
- If a newer release exists, the player can choose **Load vX.Y.Z**.
  Nothing reloads automatically; the button only works from the home
  menu, not while the game is active.
- If offline or the manifest is missing/malformed, show a safe retry
  message rather than claiming that the current build is the newest.
- The update request uses `cache:'no-store'` and a unique query
  parameter; the voluntary navigation appends `pathle-update=vX.Y.Z`
  to the same-origin page URL to bypass cached HTML.
- Updates do not write to or clear IndexedDB. Completed Daily and
  Treasure Hunt progress stays at the **same domain**.

**Important:** Existing Android shortcuts opened on the older v1.4.0
page lack the new checker. Refresh once to load v1.5.0. Subsequent
published versions can be detected by the v1.5.0 checker.

## Checklist for each new player-facing update

1. Test feature changes and commit to `pathle-modular-dev` only.
2. Increment `VERSION` in `js/version.js`.
3. Update `version.json` to the **same** version/channel.
4. Update the fallback button text and aria-label in `index.html`.
5. Update `js/version.js?v=X.Y.Z` in `index.html`. Increment CSS
   query strings if styles changed.
6. Update `tests/version-label.test.cjs` for the newly released
   version or make its assertions reference the manifest values.
7. Wait until GitHub Actions regression checks and the Pages deployment
   have both completed successfully before asking for manual testing.
8. On Android, tap the version label and verify that it identifies
   the published version without disturbing existing saves.

The manifest is deliberately static and is not a Git commit monitor.
**Any player-facing update needing detection must increment the release
version and the published manifest**, even when it is a small bug fix.
If a patch keeps the same version, this feature cannot detect that
patch merely by comparing version numbers.

The full update checker only runs on the main menu; it does not
automatically reload while Daily or Treasure Hunt is in progress.

## Release policy

- Do not change `main` before explicit authorization.
- GitHub Pages on the existing site serves the development game.
- The canonical Android shortcut URL remains
  `https://haiko650.github.io/piiloreitti/`.
