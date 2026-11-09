# Browser-based Pathle checks

This suite runs the actual published HTML, JS and CSS in headless Chromium at
mobile viewports. It complements the Node-only tests and does not touch live
player saves or GitHub Pages. A temporary localhost HTTP server and a fresh
browser context/IndexedDB are created for every browser scenario.

## Scenarios

- Home menu and image decode at 390 × 844, entering Daily Challenge, returning home
- New player on Treasure Hunt at 360 × 740: three-step tutorial entry
- After valid test-only tutorial completions: Water World and Coral Coast navigation,
  six illustrated panels, 60 map stops, 56 disabled Coming soon markers, and
  Return to Haiko behavior
- Screenshots for the home, tutorial, current Coral Coast view and top of the coast

Screenshots are diagnostics, **not yet approved pixel-by-pixel reference
images**. They are retained by GitHub Actions for 7 days. A passing browser
test does not prove a visually perfect result; compare the screenshots with
the approved Pathle design and repeat key scenarios on real Android devices.

## CI

The browser checks run after the existing test suite via the separate
\`browser-smoke\` job in \`.github/workflows/pathle-tests.yml\`, and use a pinned
Playwright Chromium version. The existing 198+ dependency-free Node tests
remain available without installing a browser.

To run locally with Node.js 22:

\`\`\`sh
npm install --no-save --no-audit --no-fund playwright@1.56.1
npx playwright install chromium
node --test tests/browser/*.test.cjs
\`\`\`

If Chromium system libraries are missing on Linux, install them via
\`npx playwright install --with-deps chromium\`.

No gameplay code, settings, or production save migrations are needed for these
tests. Avoid writing to the live website or calling \`PathleStorage\` in a real
player's session.
