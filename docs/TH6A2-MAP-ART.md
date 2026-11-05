# Pathle TH.6A.2 – independently replaceable illustrated map layers

The player-facing Treasure Hunt on the existing GitHub Pages URL uses the
new three-level tutorial, a Water World overview, and the beginning of the
Coral Coast adventure. This milestone improves how its graphics can be
replaced and how future 60-level (or longer) maps are rendered.

## Rule: graphics never determine gameplay

Keep these independently editable:

1. **Puzzle identity and rules:** `js/treasure-release-v2.js` and
   Treasure Engine / Solver / Grading. Never change a saved puzzle merely
   to reposition it on the map.
2. **Area and node layout:** `js/treasure-worlds.js` and
   `js/treasure-map-layout.js`; section IDs and normalized x/y node
   positions. These are *presentation* coordinates, not puzzle tiles.
3. **Artwork registry:** `js/treasure-map-art.js`. The only place the
   UI should specify map background and Haiko sprite asset paths.
4. **Static image assets:** `images/maps/water-world/`. The world
   overview and each area section use separate files. Replace images
   without changing game logic or progress records.
5. **Renderer and CSS:** `js/treasure-campaign-v2.js` and
   `css/treasure-world-v2.css`. These place interactive nodes over
   non-interactive image layers and draw a winding route between them.

## Artwork file structure

Current first area:

- `images/maps/water-world/world-overview.svg` – Water World geographical
  overview behind area markers.
- `images/maps/water-world/coral-coast/section-01-base.svg` – landscape.
- `images/maps/water-world/coral-coast/section-01-details.svg` – optional
  foreground landscape elements.
- `images/maps/water-world/haiko-map.svg` – separate, movable Haiko.
  Change the registry's `haiko` path to replace just the character.

Asset files may be `.svg`, `.webp` or `.png` within `images/maps/`.
Use new names or increment HTML cache-busting parameters when replacing
previously published files, to avoid old browser/CDN assets.

A section's base and detail layers must align to the same rectangular
canvas, whose default design coordinate system is 1000×1300. Responsive
rendering scales the assets to the mobile section's width and height.
The route SVG and click targets remain independent of image pixels.
Avoid placing pre-rendered numbers, interactive UI, or Haiko *inside*
background images.

## Adding sections

Each released area has `levelIds` and normalized positions in
`area.map.nodes[levelId]={sectionId,x,y}`. The layout engine
`getSections(area)` groups the released levels into sections.
The renderer stacks each 1300px-tall section vertically inside the
same continuous scroll. A connected dotted path is drawn between
neighboring sections.

To add a polished new section, create the **base** and **details**
images and register them under its `sectionId` in
`js/treasure-map-art.js`. If an image does not yet exist, a gradient
is shown automatically; missing artwork cannot prevent play.

New level nodes without explicitly assigned coordinates receive
deterministic fallback positions. Before release, curate and validate
every node to fit its background and keep a legible touch target.
Do not repeatedly rearrange already published puzzles behind the
player's back.

`sectionTarget` (currently 10) is a convenience for future automatic
layout, **not a hard 10-level ceiling**. An area can reach 60 or 120
levels while the program renders only the actual published sections.
Map expansion must not regenerate earlier puzzle content.

## Future graphics

- Surface boards initially show the shark fin over turquoise water.
- Later underwater boards show the full swimming Haiko as a selectable
  level visual mode.
- Keep whole Haiko, surface fin, underwater background and tile themes
  separate from logical movement rules.
- Area-specific ambience, animations and scenery can later be attached
  to the artwork registry.

## Test and release requirements

Run the GitHub Actions `Pathle development checks` workflow on
`pathle-modular-dev`. Check Android: first-run tutorial, world map,
Coral Coast scroll, four early nodes, Haiko marker, replay, saved best
scores, return to world, background/foreground transitions.
Verify Daily Challenge and existing legacy records remain unaffected.

Do not edit `main` without explicit approval.
