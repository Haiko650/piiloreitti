# Pathle image assets

- Root WebP assets: main menu background, Pathle logo, Haiko swimming/return/map sprites, and other current game art.
- `css-art/`: standalone images formerly embedded as base64 in `css/styles.css`, retained for exact visual equivalence and independent caching.
- `maps/water-world/coral-coast-overview.webp`: southern panel of the Water World overview.
- `maps/water-world/coral-coast/coral-coast-section-01-*.webp` through `section-06-*.webp`: the **six continuous Coral Coast illustrations**, ordered 06 down to 01 in the scroll.
- Some SVG maps under `maps/water-world/` are still needed by the current northern world panels and historical tests; do not remove them without dependency review.

The current map manifest is `js/treasure-map-art.js`. Route, level markers and the Haiko progress sprite are separate from each map image. Image URLs are content-fingerprinted for browser cache refresh by the release script.

See [architecture](../docs/ARCHITECTURE.md) for current paths and [image policies](skins/README.md) for future art replacements.
