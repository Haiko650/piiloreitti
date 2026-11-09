# Browser-based Pathle checks

This suite runs the actual published HTML, JS and CSS in headless Chromium at
mobile viewports. It complements the Node-only tests and does not touch live
player saves or GitHub Pages. A temporary localhost HTTP server and a fresh
browser context/IndexedDB are created for every browser scenario.

## Scenarios

Current workflow contains six browser scenarios and the Node regression suite. See the CI run for exact counts.

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
`browser-smoke` job in `.github/workflows/pathle-tests.yml`, and use a pinned
Playwright Chromium version. The existing 198+ dependency-free Node tests
remain available without installing a browser.

To run locally with Node.js 22:

```sh
npm install --no-save --no-audit --no-fund playwright@1.56.1
npx playwright install chromium
node --test tests/browser/*.test.cjs
```

If Chromium system libraries are missing on Linux, install them via
`npx playwright install --with-deps chromium`.

No gameplay code, settings, or production save migrations are needed for these
tests. Avoid writing to the live website or calling `PathleStorage` in a real
player's session.

## Performance and recovery diagnostics (DEV 1.5.56)

The browser suite also tests malformed, retired `localStorage` cosmetics against an otherwise valid IndexedDB player save. It must boot without modifying those raw keys or losing other save data.

The CI screenshot artifact additionally includes `browser-performance-metrics.json`. It records one unthrottled Chromium run on localhost: navigation timings, resource counts, transferred bytes, decoded map images and sampled animation frame intervals. Treat this as a regression investigation aid only, not a real-device FPS, battery, network-compression or memory benchmark. Avoid hard pass/fail thresholds for variable CI timings. Compare multiple comparable runs before taking action.

## Map image resource duplication (DEV 1.5.57)

Coral Coast has six actual WebP <img> elements over a water-gradient fallback. Prior to this patch the same six WebPs were also CSS backgrounds, producing twelve resource entries (six `css`, six `img`) in test Chromium. The map now draws from the image elements only; the fallback stays a gradient on missing images. Browser diagnostics assert six unique map-image entries, six decoded map images and no duplicate CSS image background. Metrics are from a local test runner rather than a physical device.
