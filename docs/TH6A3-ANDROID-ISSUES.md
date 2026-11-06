# Pathle TH.6A.3 – Android observations and one-change-at-a-time worklist
Updated: 2026-11-06
Branch: `pathle-modular-dev`. Do not modify `main` without approval.
The player tests the same GitHub Pages URL after EACH visible fix.

## Android feedback from v1.5.0

- Tutorial completes and leads to the map: **works**, but requires
  improved content, presentation and tutorial-specific usability.
- **Water World overview map no longer clips on Android (confirmed 2026-11-06).**
- Coral Coast's vertical scrolling **works**, but level 1 should sit
  at the **bottom** and the journey should proceed **upward**.
- Only four Coral Coast puzzles exist: **intentional limited content
  slice**, not a missing-level bug. Area's ~60-puzzle initial target
  remains in force.
- DEV toggle from the main menu should provide proper Treasure Hunt
  testing: all *published* puzzles immediately selectable; replay the
  3-part tutorial on every new visit; never pollute real best scores.

## Fix order and acceptance gates

1. **TH.6A.3a: overview clipping – fixed, Android confirmed 2026-11-06.**
   The earlier `min-height:680px` (and `600px` on narrow phones)
   interacted with `aspect-ratio:600/760` to produce an oversized
   world-map box whose right side was cut by the scrolling parent.
   Use width:100%, min-width:0, max-width:100%, height:auto,
   min-height:0, box-sizing:border-box and the same aspect ratio.
   Retain independently replaceable map artwork and clickable pins.
   Test on Android portrait (especially 320–390 CSS px), no right-side
   clipping, Coral Coast button accessible. Do not adjust map-art files
   to work around a layout bug.
1a. **TH.6A.3a2: vertically scrollable Water World overview – implemented in DEV v1.5.2; Android check pending.**
   The world map now consists of independent portrait map sections,
   currently `northern-sea`, `island-passage` and `southern-reef`
   in top-to-bottom order. The actual scroll is performed by the
   existing `thCampaignMap` scroll container. All available area
   buttons are positioned inside their own local map section, and
   the **Find my area** control returns to the player's unlocked area.
   Adding a new region requires an area definition, an art-manifest
   section/location entry and its background image, not any change
   to scores, unlock logic or stored level IDs.
   The initial unlocked Coral Coast region is located toward the
   southern end of the world map. Swipe toward the top to explore
   further regions. All art is provisional and replaceable.
   **Android acceptance:** verify smooth vertical scroll with no
   horizontal clipping, all three area markers correctly aligned,
   return-to-Coral Coast button and previous progress unchanged.
2. **TH.6A.3b: invert Coral Coast map progression – implemented in DEV v1.5.3; Android confirmation pending.**
   `travelDirection:'up'` is a presentation-only map setting.
   The bottom of the illustrated area map contains level 1, and
   the route climbs toward larger level numbers above.
   `js/treasure-map-layout.js` reverses section **display order**,
   mirrors the local y-coordinates, and draws connected bottom-to-top
   SVG trails. Original artwork section IDs, image paths, level IDs,
   saved moves and fin scores are untouched. The first area map
   automatically centers Haiko on the currently available stage;
   **Find Haiko** also works after completing all published levels.
   Automated layout tests include 4, 60 and 120-level maps.
   **Android acceptance:** check level 1 lower than level 4,
   smooth upward scrolling, correct Haiko and route placement,
   old medals unchanged and returning from a level works.
3. **TH.6A.3c: DEV mode Treasure Hunt integration – TODO.**
   `js/game.js` keeps `devEnabled` only in the home-page JS
   runtime. The Treasure Hunt page cannot currently see the toggle.
   Introduce a session-scoped same-origin DEV switch, not permanent
   save modification. When ON:
   - Entering Treasure Hunt always presents tutorial lessons 1–3
     as a fresh test run (do not reset actual completed tutorial data).
   - Developer can open all **existing released** levels/areas without
     spending time completing prerequisites; planned / nonexistent
     levels are not fabricated.
   - Test completions should be isolated in memory and never write
     to or erase production `treasureHuntV2` progress.
   - Include an obvious DEV-only way to move from tutorial to the
     world/area map without finishing the lessons.
   - When OFF: restore exactly normal first-visit tutorial and
     locked-stage behavior; do not leak DEV access across sessions.
   - Unit tests must cover cross-page toggle, repeated entry,
     DEV-only level access and save isolation.
4. **TH.6C: polish the three-step tutorial – TODO (user requested).**
   Improve Haiko's own step-by-step instruction, keep tips out of
   board touch controls, and make movement/treasure/obstacle/fin goals
   discoverable without long walls of text. Validate on Android.
   The accepted initial tutorial puzzles are only placeholders for
   final onboarding quality.
5. **TH.6B: improve illustrations – TODO.** Keep world overview,
   area image sections (base and detail), nodes, SVG route and Haiko
   sprites separate as defined in `js/treasure-map-art.js` and
   `docs/TH6A2-MAP-ART.md`. Do not embed UI or level numbers in art.
6. **TH.7: extend Coral Coast – TODO.** Four puzzles are now
   intentional; add meaningful new puzzles incrementally after
   new mechanics have passed the developer test reef. About 60 levels
   is an initial area goal, never a fixed game or world limit.

All checks must keep Daily Adventure and Hideout saves intact.
The retired TH.5 30-level records remain archived separately.
Fin thresholds, lives and move limits are reserved for later design,
not activated by these interface fixes.
