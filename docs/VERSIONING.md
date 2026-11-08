# Pathle development versions and mobile update checks

## Release identity

The main menu shows a compact **tappable** build label at the top center,
between Settings and the DEV toggle:

**DEV · v1.5.39**

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

## Haiko map sprite quality (DEV v1.5.26)

- Maps reuse the same transparent upright Haiko sprite, derived from the original 1254 × 1254 artwork.
- The map-ready WebP is 219 × 300 pixels instead of the previous 95 × 130 thumbnail. Do not shrink to display-size pixels during GitHub transfer.
- Both `images/haiko-map-upright.webp` and the inline base64 in `js/treasure-map-art.js` must contain identical bytes. The artwork test checks this and the decoded WebP dimensions.
- Character appearance and map coordinates are unchanged; map-background rendering will be addressed separately.

## SVG map artwork reliability (DEV v1.5.26)

- Both the Water World overview and Coral Coast area render their existing, original SVGs as non-interactive `img` layers inside the geographic section artwork containers.
- The five released SVG images are embedded losslessly as `data:image/svg+xml` in `js/treasure-map-art.js`. No extra asset request is required; the local SVG files remain editable source copies and are checked for byte-for-byte equality in tests.
- Original CSS map art and fallback gradients are preserved for future, non-embedded regions. No puzzle IDs, coordinates, scores, or saved data are changed.
- On Android verify geographical coast/island shapes on all three world-map sections, coral details, scrolling and touch targets before replacing placeholder artwork.

## Full-width, frameless illustrated maps (DEV v1.5.27)

- Water World and Coral Coast occupy the full mobile viewport width, not the narrower `th-shell` content box. The map's outer scroll container has no padding, border, corner radius, or shadow.
- The World map canvas and individual Coral Coast map sections have no decorative borders or rounding. The three Water World artwork sections remain vertically stacked in their original order.
- The header, Haiko sprite, map destination buttons, level coordinates, progress records and game boards are unchanged. No new map images were generated or installed.
- On Android, verify both maps scroll and all level/area buttons remain clickable; the tutorial and puzzle views retain their original width.

## Smaller, higher Haiko progress cursor (DEV v1.5.28)

- Water World and Coral Coast share a 96 × 126 CSS-pixel Haiko marker (80 × 110 on narrow phones), instead of 112 × 151 pixels.
- The marker is anchored 48px above the point center instead of 18px; the down-pointing triangle is shortened so the destination button is not covered even during the swim bob animation.
- Only CSS positioning and display size changed. The original 219 × 300 transparent sprite, map node positions, progress label, maps and saved progress are unchanged.


## Progress below area name, separate from Haiko (DEV v1.5.29)

- Haiko's floating marker no longer contains a yellow progress badge on either Water World or Coral Coast.
- Water World's Coral Coast button shows completion directly below the area name, before the Explore action.
- Coral Coast's completion (and earned fins) is shown directly beneath the area title, not under the moving character.
- Accessibility labels still describe Haiko's position and saved progress. Map artwork, images, layout coordinates, game state, level unlocks and the approved Haiko sprite are unchanged.


## Matching home-menu capsule style for Water World destinations (DEV v1.5.30)

- All three Water World area labels reuse the approved main-menu Treasure Hunt capsule language: rounded pill silhouettes, aqua/turquoise gradient, pale 4px border, upper glossy highlight, high-contrast outlined lettering and raised shadows.
- An accessible current area is bright turquoise and has a clear progress line and Explore action below its name. Future/locked regions use a muted ocean-blue variant of the same capsule, retain "Soon", and remain disabled.
- On narrow Android screens width is capped at 52% of the section and 212 CSS pixels, preventing the Coral Coast and Open Ocean signs from reaching the map edges.
- World map art, area coordinates, Haiko sprite, progress and level logic remain unchanged. The main-menu CSS remains the reference; only the Treasure Hunt destination appearance was updated.


## Larger primary area names (DEV v1.5.31)
- Water World destination names are enlarged to a 16–20px responsive font (16–17px on narrow mobile screens), while progress and Explore/Soon remain visually smaller at 10–11px.
- The capsule grows slightly to 54% of its map section (maximum 220px) and 82px minimum height to avoid clipping longer names.
- Approved turquoise/blue capsule visuals, status text, Haiko, iconography, click areas, map coordinates and progress data remain unchanged. Android visual verification is still required.


## Larger map destination typography and floating header (DEV v1.5.32)
- Water World area names are now 21–27 CSS pixels (20–22 on narrow phones), and remain visually dominant over the 10–11px progress and Explore/Soon captions.
- Destination capsules span up to 62% of map width (maximum 240px), remain centered on their existing geographic positions, and accommodate longer names without clipping on 320–490px viewports.
- Removed the header's opaque turquoise panel, golden frame, corner radius, shadow and the pseudo-element highlight. The colored back-arrow control, title lettering and golden WATER WORLD badge remain independently visible against the ocean page background.
- No map art, Haiko progress cursor, saving, unlocks or gameplay logic changed. Only the development branch was modified.


## World map behind independently floating header controls (DEV v1.5.33)
- The previous transparent header still occupied its own flex row, so its turquoise page background showed instead of the map. In Water World ONLY, the header is now an absolute overlay at the top of the shell, and the map begins at the shell's top edge beneath it.
- Back-arrow, outlined Treasure Hunt title and gold WATER WORLD capsule stay as distinct elements; the header has no background, border, shadow or decorative pseudo-element. The wrapper passes through touches while the back arrow remains interactive.
- Applies only when Water World is visible; tutorial, Coral Coast area view and puzzle layouts retain their own flow. The map scroll position, artwork, Haiko, region pins and game saves are unchanged.


## Water World map truly fills the viewport behind floating controls (DEV v1.5.34)
- Root cause: the world header had a transparent background but the map remained a separate flex scrolling region, leaving parts of the body's flat turquoise gradient visible. The former absolute-header fix did not guarantee geographic artwork beneath it.
- In Water World only, the real `#thCampaignMap` is now a fixed, full viewport (inset: 0; width: 100vw; height: 100dvh) scrollable map. No body-colored strip remains between the map and top controls.
- The independent header floats fixed above the map, centered in the original 490px max-width shell. The pink back button is clickable; the title passes clicks through. World destination buttons and the Haiko marker remain in the map and continue to scroll.
- Coral Coast, tutorial and puzzle layouts are untouched, as are map art assets, coordinates, unlocks and saves. Browser/Android screenshot check is recommended in addition to CI CSS regressions.


## Coral Coast full-screen illustrated map with two floating headers (DEV v1.5.35)
- The Coral Coast view used the normal flex layout and a geographic canvas located below both the main header and the area summary, revealing a blank turquoise region above the imagery. This is corrected using the same fixed, full-viewport scrollable map as Water World.
- The Treasure Hunt back control, title, Water World badge, Coral Coast heading, progress and in-area World action are independent overlays with transparent containers. The two back buttons remain interactive, while the wrappers do not block map touches.
- All actual Coral Coast section SVG art starts at y=0 under the headers, including when auto-scrolling to Haiko. This changes no map assets, buttons, save data, unlocking, navigation history or level positions.
- Previous tutorial and gameplay screen layouts continue to use the original flow layout. Android visual inspection is still advised after CI.


## Prevent stale Treasure Hunt HTML and cover Coral Coast header gaps (DEV v1.5.36)
- The Play Treasure Hunt link in `index.html` used to open `treasure-hunt.html` without a build-specific URL, so browser cache could preserve an outdated HTML document and CSS references despite an up-to-date home page. The link now carries `?v=1.5.36` and MUST be bumped on subsequent changes to Treasure Hunt HTML/CSS.
- The Coral Coast map's full-screen scroll container additionally paints its existing `section-01-base.svg` as a scroll-bound geographic fallback (1300px tall, the exact illustration section height). This avoids showing the flat body gradient anywhere around the two floating headers even if the map has unpainted gaps.
- Both actual embedded SVG layers, their source images, level/area position coordinates, Haiko, back navigation, and saved progress remain unchanged. No new map artwork was created.
- Mobile visual confirmation is still required; use a build-specific direct URL when checking changes to avoid stale GitHub Pages HTML.


## Keep Haiko clear of floating titles during map navigation (DEV v1.5.37)
- Both map views now center the combined Haiko sprite and its current level/area pin inside the screen region not covered by fixed titles or lower controls. Centering only the pin could leave the shark obscured above it.
- The same safe-region calculation is used on initial map entry and with Return to Haiko. Older webviews that cannot measure geometry retain native scrollIntoView fallback.
- Coral Coast gets a 260px ocean-backed scroll lead-in and 110px lower buffer so the highest of the released levels can be positioned below its fixed heading. Scroll-padding provides comparable behavior for native scroll.
- When a player manually scrolls Haiko under fixed headings, the marker is temporarily hidden and Return to Haiko offered, rather than letting the shark appear through text. Existing art, positions, save data and puzzle mechanics are unchanged.


## Restore persistent Haiko visibility during map scrolling (DEV v1.5.38)
- Fixed regression introduced in 1.5.37: the `th-v2-haiko-occluded` class hid the entire Haiko sprite whenever its bounds were partly outside the fixed-heading safe area. It caused the shark to flash into view only after manually scrolling.
- Deleted the scroll-driven hide/show code and its CSS `opacity:0!important;visibility:hidden!important` rule. Haiko stays at the actual map node and renders whenever its location is within the scroll viewport; scrolling does not toggle sprite visibility.
- Initial map auto-centering and Return to Haiko still use unobstructed-viewport measurements and keep the controls above the map; the Return button's visibility may change, but the sprite never disappears as a side effect.
- No map artwork, sprites, progress records or gameplay mechanics changed.


## Approved Water World logo for the world overview (DEV v1.5.39)
- Added the approved transparent Water World logo directly from the earlier image generation as `images/water-world-logo.webp` (600 × 200 pixels).
- Only Water World overview now shows the centered image, replacing visually the HAIKO’S ADVENTURE and Treasure Hunt heading and the yellow WATER WORLD badge. The pink upper-left back control stays available.
- Other map/level views, particularly Coral Coast, keep their headers unchanged. This is a logo/UI-only change; no map art, coordinates, player progress, save logic or Haiko marker changes.
- The logo remains separate from the world map illustration and is sized for narrow phones.
