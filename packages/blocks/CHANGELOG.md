# @domphy/blocks Changelog

## 0.2.2

- Opt-in Playwright e2e: `pnpm test:e2e` (interact checks + full-catalog axe/overflow/screenshot scan). Not wired into `pnpm test`. Screenshots at `.ui-qa/blocks-e2e/`.
- `signup01`–`signup04`: native `minlength=8` on password fields (matches the "at least 8 characters" caption).
- `chartPieInteractive`: select `aria-label` is "Select a category"; wedges marked `data-chart-wedge`.
- `confetti` / `confettiButton`: paint on the host 2d context (`useWorker: false`) so the burst is visible on the overlay canvas.

## 0.2.1

- Magic UI / shadcn chart recipes: muted-surface contrast promoted to `text`; biome-clean; `dashboard01` README props match `pageTitle` / `navMain`.

## 0.1.4
- Visual-fidelity pass vs the shadcn/ui and Magic UI originals (screenshot-driven QA):
  - Sidebar/dashboard/auth: large muted surfaces from muddy `shift-2` to near-white `shift-1`; active nav items, brand/icon badges, avatar fallbacks, subscribe/CTA buttons, calendar selected day and checkboxes from bright blue `primary` to neutral near-black (matching upstream `sidebar-primary`).
  - dashboard01: KPI card gradient now neutral (was blue-tinted); range toggle and table accents neutral.
  - login02/login04: dead gray cover panels replaced with an understated theme-token dot-grid wash; login03 card is white on the muted page (was invisible against it); sidebar10 badge/row clipping fixed.
  - Magic UI: inverted near-black defaults flipped to the upstream light look for retroGrid, ripple, dotPattern, animatedGridPattern, warpBackground, videoText, dock, terminal, and the android/iphone device frames; pulsatingButton/coolMode/interactiveHoverButton/rippleButton/lightRays/dottedMap now default to neutral instead of bright blue; bentoGrid card blobs subtle neutral; heroVideoDialog neutral placeholder + play control; neonGradientCard glow layer fixed; interactiveGridPattern SVG scales to its container; animatedBeam paths visible; shineBorder/shimmerButton/comicText/scrollBasedVelocity/kineticText/numberTicker/color defaults tuned.
  - Charts: all recipes now use a single-hue blue ramp (`primary` shift-4…shift-12, approximating upstream chart-1…chart-5 = blue-300…800) instead of blue+magenta+rainbow semantic rotation; x-axis tick labels no longer clipped at the chart frame bottom; chartTooltip* weekday ticks render muted below the axis instead of dark over the bars; chartBarInteractive/chartLineInteractive active stat tile near-white; chartRadarRadius/chartRadialLabel/chartRadarGridCustom legibility fixes; chartRadarIcons legend uses proper trending-arrow SVGs; chartAreaGradient/chartAreaStep fills visible again.

## 0.1.3
- Requires @domphy/core >= 0.20.0 (string children are now text by default). Every inline-SVG icon glyph is wrapped in `rawHtml()`; emoji glyphs stay plain text (`glyphChild` picks per value).

## 0.1.2

- Device mock defaults: `android` / `iphone` / `safari` ship sample SVG screen content when called with no media props.
- `bentoGrid`: mosaic column/row spans only at `min-width: 64em`; avoid serializing CSS `undefined`.
- `scrollProgress`: resting fill only when the scroll target has no overflow; scrollable pages at top report `scaleX(0)`.
- `terminal`: full text at rest; retypes on start; honors `prefers-reduced-motion`.
- `smoothCursor`: in-flow resting glyph for catalog capture.
- `spinningText`: explicit ring box so absolute glyphs do not collapse layout.

## 0.1.0

- Initial public blocks surface (shadcn + Magic UI clean-room factories).
