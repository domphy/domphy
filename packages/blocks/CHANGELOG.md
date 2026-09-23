# @domphy/blocks Changelog

## 0.2.4

shadcn family — mobile drawer, keyboard reachability and on-fill label contrast,
all found in a real Chromium at 375px/1280px in both themes.

- **Mobile drawer no longer starts open.** `sidebar05`, `sidebar06`, `sidebar08`,
  `sidebarLeftRight` and `sidebarStickyHeader` used ONE state for the desktop
  "expanded" flag and the mobile off-canvas drawer, so at phone widths the panel
  covered the whole page on first paint (measured at 375px). Desktop and mobile
  state are now separate, matching upstream `SidebarProvider` (`open` default
  true, `openMobile` default false).
- **Escape dismisses the mobile drawer** (WAI-ARIA APG dialog pattern) in every
  hand-rolled off-canvas sidebar — `sidebar05`–`sidebar08`, `sidebar12`,
  `sidebarLeftRight`, `sidebarStickyHeader`. The listener rides the shared
  backdrop, so it is a no-op above the mobile breakpoint.
- **`sidebar12` gets the dimming backdrop** its drawer was missing (upstream
  renders a `SheetOverlay`); clicking it or pressing Escape closes the drawer.
- **A closed/collapsed sidebar leaves the tab order.** A panel slid out with
  `transform`, or collapsed to `width: 0`, kept all its links focusable —
  measured 24–46 phantom tab stops (WCAG 2.4.3). The panel is now
  `visibility: hidden` while closed, animated so the slide still runs.
- **Sidebar search inputs no longer print text over the magnifier glyph.**
  `paddingInlineStart` lost to `inputSearch()`'s `paddingInline` shorthand in
  the cascade (computed 18px against a 28px-wide icon); `sidebar01`–`sidebar04`,
  `sidebar05` and `sidebarStickyHeader` now declare the shorthand.
- **Labels painted on a chart fill derive their tone from that fill.**
  `chartPieLabelList`, `chartPieLabelCustom` and `chartRadialLabel` hard-coded
  `shift-0`, which is theme-relative: black text on a dark navy wedge in the
  dark theme (1.5:1), white text on a light wedge in the light theme. The new
  `textToneOnFill()` helper picks the ramp end at least 9 steps from the fill.
- **`sidebar11` change-status letters** ("M"/"U") move from `shift-7` (3.5:1 in
  the dark theme) to the `text` tone — they carry essential state and have no
  other on-screen representation.
- **`sidebar10` and `sidebar11` get the family's mobile drawer.** They were the
  only sidebars with no treatment below 768px: the 256px panel stayed inline
  and its own toggle was pushed off screen (measured at 375px, the panel took
  256 of 295 available px). The panel now goes `position: fixed` and slides in
  over the content with the shared backdrop (click or Escape dismisses), while
  the existing triggers keep driving the desktop rail above the breakpoint.
- `sidebar11`'s desktop rail, which collapses to `width: 0`, now also goes
  `visibility: hidden` so it leaves the tab order (same WCAG 2.4.3 fix as
  `sidebar05`/`sidebar06`/`sidebar12`).
- **`sidebar12`'s toggle no longer flips both states at once.** It set the
  desktop `collapsed` flag AND `openMobile` on every click, so opening the
  drawer on a phone left the desktop rail inverted once the viewport grew —
  and on `sidebar10`, whose rows read `collapsed` to hide their labels, the
  freshly opened drawer rendered as a label-less icon rail (seen in Chromium
  at 375px). All three now use the family's viewport-aware
  `makeSidebarToggle`, which flips only the state that is live at that width.
- New `e2e/shadcn-sidebar-drawer.spec.ts` pins the drawer contract against the
  APG dialog pattern, upstream's default state, and Chromium's own tab order.
- `e2e/helpers.ts` `mountBlock()` retries the whole mount sequence, not just
  its `evaluate` calls: a Vite cold-crawl reload landing AFTER the mount threw
  nothing, it just left the page empty, surfacing as a spurious
  `[data-block=…] element(s) not found`. Drawer spec: 106s → 35s.
- `scripts/interaction-checks/sidebar06.ts` looked for the open dropdown by
  `[role="dialog"]`. Since ui 0.21.6 a popover whose content owns a surface
  (here a `menu()`) keeps `role=menu`, so the check failed on a working
  dropdown; it now accepts either role.
- **The demo page is theme-driven, so the e2e lane can scan the dark surface.**
  `demo.html` hard-coded `#f8f9fa`/`#fff`, which kept every card white under
  `data-theme="dark"` — the axe/contrast lane could only ever measure the light
  theme. The chrome now uses the theme's `--neutral-N`, `?theme=dark` selects
  the theme, and `BLOCKS_E2E_THEME=dark` points any lane at it (screenshots to
  `.ui-qa/blocks-e2e-dark/`). All 97 shadcn blocks scan clean in dark: 0 axe
  critical/serious, 0 overflow, 0 mount failures.
- **`chartBarLabelCustom`'s inside-bar category label** was `neutral shift-1`
  on the `primary shift-6` bar: 2.58:1 in the light theme (#ededed on #5f91fc)
  and 2.24:1 in the dark (#080808 on #1440aa), both under the 4.5:1 floor, and
  the y-axis is hidden so the label is the category's only representation. It
  now derives its ramp step from the bar's fill tone (`textToneOnFill`), as the
  pie/radial on-fill labels already do — 6.94:1 light, 8.96:1 dark. Upstream
  paints `var(--background)` here and has the same defect; legibility wins.
- `e2e/helpers.ts` `openDemo()` now retries the navigation itself: Vite's
  dep-optimizer can reload the page mid-`goto` ("interrupted by another
  navigation"), which killed a 97-block scan at block 83.
- **The sidebar interaction checks no longer read a width mid-animation.** Every
  sidebar collapses with `transition: width 0.2s`, and the checks measured the
  aside after a flat `waitForTimeout(300)` — ~100ms of slack. On a loaded
  machine `sidebar02` reported 186.67px between its 256px expanded and 48px
  collapsed states and failed, then passed on a quiet re-run. New
  `settledWidth()` in `scripts/interaction-harness.ts` polls until two
  consecutive samples agree; `sidebar01`–`sidebar08` use it. (Its loop runs on
  the Node side because tsx/esbuild rewrites a named function inside
  `evaluate()` to call a `__name` helper the page does not have.)
- `vitest.config.ts` gets a measured `testTimeout` (20s). Every test renders a
  block tree into jsdom, whose CSSOM is the cost — signup03 inserts 83 rules
  per render at 385-564ms (157-336ms of it `insertRule`), sidebarLeftRight 611
  rules at 1148-2505ms — so a single `it()` can spend seconds before its first
  assertion. The 5000ms default timed out `signup03 > renders the legal links`
  and `sidebarLeftRight > renders a working demo tree`, neither of which
  contains any async code.

## 0.2.3

- Drop unused `@domphy/form` peer (auth uses local `authFieldInput()`; dashboard uses `@domphy/table`). Advertised peer list matches `package.json`.
- Lifecycle harness is a real gate: `expect(failures).toEqual([])`.

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
