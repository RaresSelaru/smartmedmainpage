<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:smartmed-public-ui-contract -->
# SmartMed public UI contract

For every public-facing UI or layout change:

- Before editing, inspect `src/app/globals.css`,
  `tests/e2e/responsive-density.spec.ts`, and the closest existing page or
  section. Current repository proportions are the source of truth; do not
  recreate dimensions from memory.
- Reuse `--smart-content-max` for regular content, `--smart-wide-content-max`
  for wide compositions and rails, and `--smart-nav-max` only for navigation.
  Do not change these canonical values without an explicit user request.
- Reuse the existing `--smart-desktop-*` spacing and hero tokens. Do not add
  wider one-off desktop caps, `2xl:` size growth, or oversized fixed desktop
  heights merely because more viewport space is available.
- At wide viewports, bounded content, typography, cards, and gaps must plateau
  at their token caps. Extra width becomes outer breathing room.
- Preserve existing mobile and tablet behavior unless the request explicitly
  changes it. Never implement density through root font-size, CSS `zoom`,
  global `scale`, or transforms on `html`, `body`, or `main`.
- The desktop navbar brand lockup must include both the mark and the
  “SmartMed Academy” wordmark at 1536px and wider.
- The SmartMed academic-creation artwork is an intentional full-bleed
  exception: its wrapper must equal the CSS viewport width, remain centered,
  and must not receive a desktop max-width. Browser zoom must remain usable;
  do not attempt to disable or override it.
- Validate public layout changes at 390x844, 768x1024, 1366x768, 1440x900,
  1920x1080, and an ultrawide viewport. Before finishing, run type checking,
  lint, and `npm run test:layout`.
<!-- END:smartmed-public-ui-contract -->
