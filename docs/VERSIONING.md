# Pathle development version label

The Pathle home screen shows a deliberately compact version label in
the top-center, between the Settings and DEV controls:

**DEV · v1.4.0**

The single source of truth is `js/version.js`:

- `VERSION`: currently `1.4.0`
- `CHANNEL`: currently `DEV`

The module updates the main-menu label (`homeBuildBadge`), HTML document
title and Daily Adventure footer (`gameVersionFooter`). The initial
HTML label is a readable fallback if JavaScript has not loaded yet.

The label is **a release version, not a live Git commit SHA**. It must
be intentionally incremented when shipping the next meaningful
development milestone. It does **not** claim to guarantee that the
phone has reloaded the latest GitHub Pages deployment.

When updating the version:
1. Change `VERSION` in `js/version.js`.
2. Update the version-script query string in `index.html`.
3. Update the fallback label and aria-label in `index.html`.
4. If the badge's CSS changes, increment the `home-reef.css`
   query string in `index.html`.
5. Check the development CI run, then verify the number in the
   actual installed Android browser shortcut.

The badge does not change the menu content layout, reward data,
Treasure Hunt maps, gameplay or player saves.

The already-planned future **Check for updates** feature is separate:
it should compare the loaded deployment against the current published
version and never interrupt a live game without the player's consent.
