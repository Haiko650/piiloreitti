# CSS stylesheets

- `styles.css`: Daily Adventure screens, overlays and base presentation.
- `home-reef.css`: home reef background layout.
- `menu-capsules.css`: the three primary home menu buttons and progress segment.
- `settings-ocean.css`: underwater settings presentation.
- `visual-assets.css`: shared image/asset styling.
- `treasure.css`: Treasure Hunt board.
- `treasure-campaign.css`, `treasure-preview.css`: legacy/current campaign support; inspect real HTML references and tests before removal.
- `treasure-world-v2.css`, `treasure-world-ui.css`: current Water World and Coral Coast maps, Haiko markers and floating controls.

The styles preserve the existing 2.5D underwater design. Never delete a later rule just because an earlier selector appears similar: inspect computed styles at several mobile widths. Avoid baking map nodes into background artwork.

Local CSS image references under `../images/` receive generated content hashes from `scripts/sync-release.cjs`. Use [browser screenshots and tests](../docs/BROWSER-TESTING.md) when changing visual styles.
