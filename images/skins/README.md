# Pathle artwork slots (Daily Challenge + Treasure Hunt)

This catalog is **cosmetic only**. Game rules, save data, scores, board size,
blocked cells and optimal-route calculations stay in their existing modules.

## How to replace artwork later

1. Export an approved image as transparent WebP or PNG (SVG also supported).
2. Upload it to the development branch under \`images/skins/\`.
3. Open \`js/visual-assets.js\` and replace the corresponding \`null\` in
   \`ART.shared\` with e.g. \`'images/skins/fin.webp'\`.
4. To override one environment, add a property under
   \`ART.environments.coast\`, \`ocean\`, \`river\`, \`forest\` or \`coral-reef\`.
5. Reload the development preview; check both modes on a phone. No engine
   code needs to change for simple image replacement.

Slots: \`water\`, \`coral\`, \`beach\`, \`forest\`, \`current\`, \`rock\`,
\`wave\`, \`fin\`, \`start\`, \`goal\`, \`pearl\`, \`treasure\`, \`haikoPeek\`.

The catalog uses existing SVG/CSS drawings as fallback if a slot is \`null\`.
An invalid image path throws rather than silently injecting CSS/HTML. Use
paths relative to \`index.html\` / \`treasure-hunt.html\`.

Tile \`data-terrain\` and optional \`level.visualTerrain[id]\` describe only
the *appearance*. The existing game engine still controls passability.
Future \`current\`, \`forest\`, \`beach\` and \`rock\` gameplay mechanics must
be implemented and tested independently; adding an image does NOT enable an
effect, passable terrain, conveyor current or special collision rule.

## Haiko's idle peek

The shared \`createIdlePeek\` controller can display a \`haikoPeek\` image
after 3000 ms without accepted moves. The image stays disabled until that
slot is set. A move, restart, completion, hidden tab, or level transition
cancels the pending animation. The controller won't show during a modal
and respects reduced-motion settings.

The \`fin\` image is used for Daily's start and finishing dash and Treasure
Hunt's moving fin. Rating fins in the victory dialog are intentionally
separate: they denote medals, not the player token.

## Rendering structure

- \`js/visual-assets.js\`: asset catalog and shared idle controller.
- \`css/visual-assets.css\`: artwork skins and animations.
- \`js/game.js\`: Daily Adventure adapts existing tiles to catalog.
- \`js/treasure-ui.js\`: Treasure Hunt adapts existing tiles to catalog.
- Existing fallback graphics, progress storage and rules remain unchanged.

Keep \`main\` untouched until visual changes are reviewed.
