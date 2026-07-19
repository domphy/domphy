# Changelog

All notable changes to Domphy are documented here.

Packages are versioned independently — each package has its own version number (see `packages/*/package.json`). Entries below are grouped by release date.

---

## Repo-wide audit + release wave — 2026-07-19

Full-repo audit (health, docs consistency, packaging, design) followed by a fix/polish wave. `@domphy/press` gains features; everything else is fixes, metadata, or packaging hygiene.

### `@domphy/press` [0.21.0]
- Font hooks: generated CSS reads `var(--dp-font-sans/mono/display, …)` — sites can re-skin typography via `head` without fighting source order; `--dp-font-mono` (previously referenced but never emitted) now defined.
- `fullBleed: true` frontmatter for the home layout — bare islands (e.g. a WebGL hero) can span edge-to-edge while prose keeps the landing width.
- Hero de-clichéd: gradient headline text + radial glow removed (solid `textStrong`); hero action buttons render through the real `@domphy/ui` `button()`/`buttonGhost()` patches; feature cards no longer lift/shadow on hover.

### `@domphy/ui` [0.20.2]
- `dialog()`/`drawer()`: guard `close()`/`showModal()` for environments where `HTMLDialogElement` exists but its methods are unimplemented (jsdom) — fixes an unhandled async error that failed the package's own test run.

### `@domphy/doctor` [0.18.15]
- `htmlhint`/`stylelint` → optional `peerDependencies` (they were always documented as optional; `auditOutput` imports them lazily). Installing the CLI no longer drags in stylelint.

### Metadata / packaging (no runtime change)
- `@domphy/core` [0.19.1], `@domphy/theme` [0.20.1]: fuller descriptions/keywords for npm.
- `@domphy/i18n` [0.19.2]: fixed a double-encoded em-dash (mojibake) in the package description shown on npm.
- `@domphy/blocks` [0.1.1], `@domphy/chart` [0.2.2], `@domphy/three` [0.2.1]: MIT `LICENSE` file now ships in the tarball; removed dead `globalName` tsup options (chart/three), stripped a UTF-8 BOM (three's package.json).
- `create-domphy` [0.18.2]: regenerated embedded core/theme/ui versions.

---

### Fixed
- `dialog()`/`drawer()`: a closed dialog/drawer represented its state with ONLY `opacity` (dialog) or an off-screen `transform` (drawer) — neither removes an element from the tab order or the accessibility tree the way `visibility` does, and a consumer's own `style: { display: ... }` on the dialog element overrides the UA stylesheet's `dialog:not([open])` rule too. Both patches now also set `visibility`/`pointerEvents` inline (open = visible/auto, closed = hidden/none), so a closed dialog/drawer's content is never Tab-reachable or screen-reader-visible regardless of what the consumer's own style declares.

---

## `@domphy/ui` [0.20.0] — 2026-07-18

### Added
- Layout primitives — `stack()` (vertical flex column + density-aware gap), `row()` (horizontal flex + gap, centered by default, with `align`/`justify`/`wrap`), and `panelSection()` (density-aware padding + optional bottom divider — a thin wrapper meant to compose with `stack()`/`row()`). Added after an audit of a consumer app found 409 raw `style: {}` blocks re-implementing the same handful of flex shapes across 30 files.

### Changed
- `toolbar()` now delegates to `row({ gap, align: "center" })` instead of duplicating the same flex style object — no change to its props or output.

---

## `@domphy/ui` [0.19.0] — 2026-07-18

### Added
- Polished patch defaults — the DEFAULT look of every patch is the de-facto design system, and it was reading "wireframe". No breaking changes to DOM structure, tags, or props:
  - `button()`: `variant?: "solid" | "outline" | "ghost"` (default `"outline"`, the existing look) and `size?: "small" | "medium" | "large"`; `variant: "ghost"` shares one implementation with `buttonGhost()` (which gains the same `size` presets).
  - Elevation for floating/raised surfaces via a shared internal `elevation(level)` helper (`"low" | "medium" | "high"`, layered black-alpha box-shadows that work on both themes): popover/menu/combobox/selectBox-dropdown/datePicker-popup (border + medium shadow), dialog/drawer (high, shadow-only), toast (medium), tooltip (low), fab (low at rest, medium on hover). `combobox`/`selectBox` dropdowns previously had NO default surface at all.
  - Unified `:focus-visible` ring via a shared internal `focusRing(listener, color)` helper (2px accent-tone `box-shadow` halo) across `button`, `buttonGhost`, `linkButton`, all `input*` patches, `select`, `textarea`, `segmented`, `tabs`, `toggleGroup`, `rating`, `pagination` (the last two previously had no visible focus indicator).
  - Hover/press transitions (~140ms ease) on interactive patches instead of snapping between states.

### Changed
- Control `borderRadius` formula bumped from `density × 1` to `density × 1.5` across every bounded-control/floating-panel patch.
- Adopted `@domphy/theme` 0.20's semantic tone aliases (`surface`/`hover`/`border`/`border-strong`/`muted`/`text`) across patches whose raw `shift-N` usage matched an alias's role.

---

## `@domphy/theme` [0.20.0] · `@domphy/doctor` [0.18.14] · `@domphy/mcp` [0.19.2] — 2026-07-18

### Added — `@domphy/theme` [0.20.0]
- Semantic tone aliases (`surface`, `hover`, `border`, `border-strong`, `muted`, `text`) — sugar over the existing `shift-N` machinery in `themeColor`/`themeColorToken`/`dataTone`, so intent can be written instead of raw ramp indices. Additive only; existing `shift-N`/`increase-N`/`decrease-N`/`base`/`inherit` behavior is unchanged.

### Fixed — `@domphy/doctor` [0.18.14]
- `unknown-tone` and `middle-surface-anchor` now accept the semantic tone aliases as valid `dataTone` grammar — they resolve to their underlying `shift-N` before grammar/range checks, so `dataTone: "border-strong"` is treated identically to `dataTone: "shift-4"`.

### Changed — `@domphy/mcp` [0.19.2]
- `domphy_tones` tool description updated: the semantic tone aliases are now valid and recommended over raw `shift-N` — the description no longer tells agents to avoid them.

---

## `@domphy/core` [0.19.0] · `@domphy/ui` [0.18.22 / 0.18.23] — 2026-07-18

### Added — `@domphy/core` [0.19.0]
- `behavior(key, attach, props)` and `ElementNode.getBehavior(key)`: a per-node behavior contract (Svelte-action-like) for imperative state that must survive a reactive parent re-rendering a reused node — `attach` runs once per real DOM node, `update(props)` routes every later re-render's fresh props into that same instance, `destroy()` fires exactly once on removal.

### Fixed — `@domphy/ui` [0.18.22]
- `popover`/`tooltip`/`selectBox`/`combobox`/`datePicker` (via `utils/floating.ts`) no longer lose outside-click/Escape dismissal after a reactive ancestor re-renders the trigger — migrated off the hand-rolled `WeakMap<Element, ...>` generation-eviction workaround onto `@domphy/core`'s new per-node `behavior()` contract (requires `@domphy/core` ^0.19.0).

Note: 0.18.22 was published with `npm publish`, leaking the raw `workspace:^` protocol into the tarball's dependency ranges (`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` for external consumers). 0.18.23 is the same code republished with `pnpm publish`.

---

## `@domphy/blocks` [0.1.0] — 2026-07-10

First npm publish (previously repo-only). Ships the post-QA-wave state: 173 blocks, lifecycle harness clean, doctor clean, 681 tests green. `SOURCES.md` (clean-room methodology + per-block fidelity notes) is included in the package for attribution.

### Fixed
- Login family (`Login01`–`Login05`): the shared submit button rendered as Domphy's tonal button while upstream (and this port's own `signup01`) uses a SOLID `bg-primary` button — now anchored on the dark edge tone (`dataTone: "shift-17"`), matching upstream. Found during the pre-publish visual pass against the upstream references.

---

## `@domphy/blocks` QA wave · `@domphy/ui` [0.18.21] — 2026-07-10

### Added — `@domphy/blocks`
- `tests/lifecycle-harness.test.ts`: mechanical sweep of every exported block factory (mount → reactive ancestor re-render → unmount → post-unmount hygiene) recording construct/render errors, console errors, window/document listener leaks, re-arming timers/rAF, and DOM residue into `.lifecycle-report.json`. Baseline: 173/173 clean.
- `shared/typography.ts` `fixed()` helper + a "QA layers" section in the README documenting the four QA tiers and the recurring fix recipes.

### Fixed — `@domphy/blocks`
- `@domphy/doctor` conformance across the package: 51 errors + 336 warnings + 10 info → 0. Typography stays pixel-identical to upstream via `fixed()`; zero lengths drop their units; non-submit buttons declare `type="button"`; every input gains a real associated `<label>` (visually hidden where upstream has none); themed surfaces declare `color`; effect-identity values outside the tone system carry justified `_doctorDisable`s. Family-wide issues were fixed once in the `*-shared.ts` helpers (sidebar search form, version switcher, login cover image).
- `heroVideoDialog`: the closed-state iframe carried an empty `src` (invalid HTML) — now `about:blank`.
- `login02`/`login04` cover images: `alt: ""` never reached the DOM (`@domphy/core`'s `merge()` drops empty-string values — worked around with a function value; core-side semantics left for a dedicated pass).

### Fixed — `@domphy/ui` [0.18.21]
- `table()`: dropped an unjustified `!important` on the row-hover background (`.scope tbody tr:hover` already out-specifies row-scope rules).
- `details()`/`formGroup()`/`popoverArrow()`/`tag()`: zero lengths emitted with units (`"0px"`) now emit unitless `0` (stylelint `length-zero-no-unit`).

---

## `@domphy/press` [0.20.15] — 2026-07-10

### Changed
- homeShell landing polish: home body now spans the full main column (hero/features/body were misaligned at two different widths); hero scales up on imageless layouts (`clamp()` type sizes) with a soft brand radial glow and an optional `hero.command` install pill; feature cards gain hover lift/glow and equal heights; home-only table styling (full width, hidden header, row hover) turns a markdown package table into a presentable index.

---

## `@domphy/three` [0.2.0] — 2026-07-10

### Added
- Scene-level static analyzer: `diagnose(options)` / `validate(options)` — @domphy/doctor's contract shape applied to the three() option object (which doctor cannot see). Built-in rules, each from a real silent failure in the domphy.com example gallery: `unknown-tag` (error — throws at runtime), `legacy-light-intensity` (three r155+ physical units), `additive-blowout` (additive points stacking to white), `camera-missing-lookat` (off-axis camera never aimed). Per-node suppression via `_doctorDisable`, `only`/`exclude` filtering, reactive values resolved with a no-op listener.
- `three()` warns at mount when the host element has zero height (the most common blank-canvas mistake).

---

## `domphy-web` [1.0.0] — 2026-07-10

### Added
- web: landing "live proof" section — a bare-mounted @domphy/three starfield with the DOM overlay in the same element tree; mid-layer star tint is a live theme token. `<DomphyPreview bare />` island flag mounts elements without the preview box chrome.
- docs(three): 6 more trend-inspired playground examples — dissolve (shaderMaterial uniforms), cursor particles (pointer-to-world at 6k points), neon bloom (UnrealBloomPass via `extend()` + frame-priority takeover), tunnel (curve flight + onWheel), synthwave terrain (geometry attribute animation), morph particles (attribute morphing with stagger). Playground moduleMap gains the three postprocessing addons.
- docs(three): concept docs (overview, scene grammar, events, animation & loop, loading assets, recipes) + 10 live playground examples (spinning cube, interactive grid, wave field, galaxy, orbit viewer, theme sync, UI bridge, glTF viewer, primitive bridge, starfield hero) for `@domphy/three` on domphy.com.

### Fixed
- web: playground/CodeEditor — CodeMirror now scrolls internally instead of being clipped with no scrollbar (bounded `.cm-editor` height), and the workspace height tracks the viewport (`clamp(600px, 100vh - 240px, 960px)`) instead of a fixed 760px.

---

## `@domphy/press` [0.20.14] — 2026-07-10

### Fixed
- `contentDiv`'s markdown table styles emitted ".scope th" twice (once via the "& th, & td" selector list, once via the standalone "& th" block), tripping stylelint's `no-duplicate-selectors` in `@domphy/doctor`'s Layer-4 CSS audit. th/td now declare their shared properties separately; computed styles unchanged (verified byte-equal full-page screenshots of a table-heavy docs page against production).

---

## `@domphy/press` [0.20.13] — 2026-07-10

### Fixed
- `homeShell()`/`pageShell()` now pass `@domphy/doctor` with zero diagnostics (previously 70 on a full landing page). Typography keeps press's deliberate VitePress-derived pixel scale but is declared through function values (the doctor's designed marker for intentional non-token typography — see the `fixed()` helper in `layout.ts`); the header, nav dropdowns, sidebar, and feature tiles now declare `color` alongside their themed backgrounds/borders (`missing-color` contract); markdown list indent uses `themeSpacing`. Verified pixel-identical against the production site (byte-equal Playwright screenshots of home + docs pages).

---

## `@domphy/three` [0.1.0] — 2026-07-10

### Added

- New package: declarative three.js renderer — a 1-1 functional port of `@react-three/fiber`'s core (reconciler, raycast pointer events, demand frameloop, `loadAsset`), translated from React idioms to Domphy idioms. Exports `three(options)` (the `div`-host patch), `extend(classes)` (version-agnostic custom-tag registration), `loadAsset`/`preloadAsset`/`clearAsset` (reactive asset loading). No drei port, no helpers, no `extras/` subpath — anything outside the `three` core namespace enters user-land via `extend()`. See `packages/three/SPEC.md` and `packages/three/README.md`.

---

## `@domphy/ui` [0.18.20] — 2026-07-10

### Fixed
- `segmented()`/`tabs()`/`toggleGroup()`/`menu()`: internally-generated `<button>` elements now carry `type="button"` — inside a `<form>` they were implicit submit buttons, so clicking a tab/segment/menu item could submit the form. (Surfaced by `@domphy/doctor`'s Layer-4 htmlhint audit on a consuming app.)

---

## `@domphy/press` [0.20.12] — 2026-07-10

### Fixed
- 0.20.11 was published with unresolved `workspace:^` peerDependencies (published via `npm publish` instead of `pnpm publish` — the same failure mode as `@domphy/ui` 0.18.16). Republished with real semver peer ranges; no code changes.

---

## `@domphy/core` [0.18.4] · `@domphy/ui` [0.18.19] — 2026-07-10

Audit wave: a multi-agent bug audit of `@domphy/core` + `@domphy/ui` overlays (every finding adversarially verified, then fixed with regression tests).

### Fixed — `@domphy/core`

- `ElementNode.patch()` treated nullish declared content (`{ div: null }`) as "remove all children" while construction treats it as "no children declared" — any ancestor re-render silently wiped children a patch inserted imperatively in `_onInit` (selectBox's tag list, combobox's tags + input). Nullish content now leaves children alone in both paths.
- `ElementList`: nodes inserted imperatively via `children.insert()` (floating panels, `_onInit` subtrees) were pruned as "stale extras" by the next declared-children reconciliation of the same list, and portal items (logical slot in `items`, DOM elsewhere) made positional DOM references drift — keyed reorders next to a portal threw `NotFoundError`, and `insert()` silently misplaced nodes. Imperative nodes are now exempt from reconciliation (`_imperative`), and DOM references resolve via the first logical successor actually parented under the owner.
- `ElementList`: re-adding a `_key` while the old node's async `_onBeforeRemove` exit animation was still awaiting `done()` "resurrected" the exiting node — then the stale `done()` destroyed the live, freshly-patched node. A re-added key now gets a fresh node; the ghost finishes exiting independently.
- `computed()`: a plain untracked `.get()` between a dependency write and the deferred reaction (trivially reachable via a state listener that reads the computed, or `flushSync`) recomputed silently and turned the queued notify-job into a no-op — already-subscribed downstream listeners (DOM bindings) never learned the value changed, permanently. A dirty read with subscribers now notifies through the normal equality-short-circuited path.
- `ElementNode._setupFunctionChildren()`: re-setup on every `patch()` re-registered the children-release `BeforeRemove` hook (hook chain grew one closure per re-render for the node's life) and kept only the LAST dependency's release handle — stale subscriptions kept re-running an old generation's children closure. One hook per node; all releases accumulated and released together.
- `ElementAttribute`: same unbounded `BeforeRemove` hook growth for reactive (function-valued) attributes on every `patch()` of a reused node.
- Multi-word HTML attributes (`contentEditable`, `maxLength`, `tabIndex`, …) were kebab-cased into nonexistent attribute names (`content-editable`); `aria-*`/`data-*` stay kebab. `AttributeList.remove()` also removed the un-kebab-cased name, leaving the real DOM attribute stuck.
- `AttributeList.addClass()` over a reactive class froze it (the "current class is reactive" branch was dead code).
- `StyleList`: a doubly-nested non-`&` selector emitted malformed/duplicated CSS and never reached the live stylesheet on client render.
- `StyleProperty`: only the last reactive subscription's release handle was kept — a style function reading multiple states leaked all earlier subscriptions.
- `Notifier`: state/event names colliding with `Object.prototype` properties (`constructor`, `hasOwnProperty`, …) crashed `addListener`.
- `effectScope()`: `run()` after `stop()` silently created permanently-inert effects (disposed before their first run). They now register to the enclosing scope, with a dev warning.
- `sanitizeHTMLString()` stripped `on*` handlers and `javascript:` URLs but not `<script>` tags — reachable XSS in SSR output for inline-HTML strings. `isHTML()` missed multi-line single-element strings (no dotAll), silently escaping intended markup.
- `deepClone()`: the class-instance bailout ran before the `Date`/`RegExp`/`Map`/`Set`/typed-array branches, making them dead code — those built-ins were shared by reference instead of cloned.
- `removeClass()`/`toggleClass()` on an element with no class stringified `undefined` into a literal `"undefined"` class token.

### Fixed — `@domphy/ui`

- Floating (popover/tooltip/selectBox/combobox/datePicker): two DIFFERENT floating components sharing one anchor (a button with a tooltip that opens a popover) evicted each other's live panel on every interaction, and the evicted instance was left permanently dead (`mounted` stuck true with its panel removed). Teardown slots are now keyed per component kind, and teardown leaves the closure re-mountable.
- Floating: Escape pressed while focus was INSIDE the panel (menu item, calendar cell) was silently swallowed — the panel is a portaled sibling of the anchor, so the keydown never reached the anchor's handler. The panel now handles Escape itself.
- Floating: `data-theme` was stamped once on the shared `#domphy-floating` overlay by whichever anchor opened FIRST, permanently imposing that theme on later panels anchored under a different `[data-theme]` scope. The theme is now stamped per panel from its own anchor's scope.

### Added

- `packages/ui/tests/floating-lifecycle-matrix.test.ts`: lifecycle matrix driving every `createFloating()` consumer through mount / re-render / mid-open re-render / anchor removal / shared-anchor transitions, plus listener-hygiene and Escape/theming coverage.
- `AGENTS.md`: "Reused-node lifecycle — the gotchas" section documenting the reuse contract that produced this bug class.

---

## `@domphy/ui` [0.18.18] — 2026-07-10

### Fixed
- `popover`/`tooltip`/`selectBox`/`combobox`/`datePicker`: an anchor merely RE-RENDERING while its panel was open (no removal at all — e.g. hovering a tooltip, then an unrelated state change re-renders that row) could leave the panel stuck open forever, with no way to close it — not even moving the mouse away. 0.18.17 fixed the removal case (anchor's `BeforeRemove` hook tearing down the wrong generation's state); this fixes the same root cause the other way: a NEW `createFloating()` closure (fresh, reused anchor) never told the OLD one it had taken over, so the old one's actually-visible panel had no live interaction path back to it once event handlers rebound to the new closure. Every generation that touches an anchor now first tears down whatever the previous generation left behind before claiming it for itself.

---

## `@domphy/ui` [0.18.17] — 2026-07-10

### Fixed
- `popover`/`tooltip`/`selectBox`/`combobox`/`datePicker`: removing a floating trigger's anchor while its panel was open (e.g. a settings popover whose row gets deleted) could leave the panel orphaned in the `#domphy-floating` portal instead of closing. Same reused-DOM-node gap as 0.18.15's fix, the other direction — the anchor's one-ever `BeforeRemove` hook (registered only on its true first mount) closed over the FIRST `createFloating()` closure's own state, not whichever later re-render's closure was actually showing the panel. Now routed through a WeakMap keyed by the anchor's live DOM element so the hook always tears down whichever generation is currently live.

Note: 0.18.16 was published with `npm publish` instead of `pnpm publish`, which left its `workspace:*`/`workspace:^` internal deps (`@domphy/core`, `@domphy/theme`, `@domphy/floating`) unresolved — uninstallable by any external consumer. Skip it; 0.18.17 is the same fix, published correctly.

---

## `@domphy/ui` [0.18.15] — 2026-07-09

### Fixed
- `popover`/`tooltip`/`selectBox`/`combobox`/`datePicker`: the floating trigger stopped opening after its ancestor re-rendered (`createFloating()`'s `reference`/`rootNode` were only ever captured via a one-time `_onMount` hook, which `ElementNode.patch()` correctly does not re-run on a reused DOM node). Now derived lazily from the trigger's own event handlers, which are live-rebound on every patch.

---

## `@domphy/chart` [0.2.1] — 2026-07-04

### Fixed
- Horizontal bar bandwidth sign and stacked-area baseline/extent.
- Tooltip listener leak, tooltip XSS, WebGL device teardown, and the wrong cartesian-axis set (2026-07-02).

---

## `@domphy/i18n` [0.19.1] · `@domphy/markdown` [0.19.1] · `@domphy/palette` [0.19.0] · `@domphy/dnd` [0.18.3] — 2026-07-02

### Fixed — `@domphy/i18n` [0.19.1]
- Stopped force-disabling i18next's HTML escaping (interpolation is escaped again by default) and fixed an init/`setLocale` race.

### Fixed — `@domphy/markdown` [0.19.1]
- Double-escaped fenced code blocks and a non-unique slugger (duplicate headings now get stable unique anchors).

### Added — `@domphy/palette` [0.19.0]
- `generateRamp(baseColors, steps)` opened as public API — builds a WCAG-optimized sequential ramp from one or more anchor colors via warped Oklab interpolation; paired with `@domphy/theme`'s `generateTheme()` for one-command theme generation. Also: NaN guards and a `generateRamp([])` footgun fix.

### Fixed — `@domphy/dnd` [0.18.3]
- A mount/remove race leaked the FormKit registration; `multiList` no longer spams `console.warn`.

---

## `@domphy/chart` [0.2.0] — 2026-06-27

### Added
- DataZoom, series labels, boxplot/funnel/treemap series, visualMap, and legend interactivity.

---

## [0.16.0] — 2026-06-18

### Changed
- `@domphy/doctor`: improved chromametry color hints — raw hex/rgb values now show a nearest-tone suggestion via CIELAB/LCH perceptual match
- `@domphy/doctor`: AI correctness benchmark workspace for ongoing quality tracking

---

## [0.15.0] — 2026-06-15

### Added
- `@domphy/core`: `flushSync()` — drains the reactive queue synchronously (testing, imperative code)
- `@domphy/core`: in-place reactive text node updates (no DOM replacement on text change)
- `@domphy/core`: dev-mode warnings for common authoring mistakes
- `@domphy/theme`: theme memo — stable CSS var references, no re-computation on unchanged tokens
- `@domphy/doctor`: `unknown-tone` rule — catches invalid tone values
- `@domphy/doctor`: `raw-theme-value` rule — catches literal hex/rgb/rem values that should use theme helpers
- `@domphy/doctor`: `fix(element)` — lossless autofix for fixable rule violations
- `@domphy/mcp`: `domphy_fix` tool — apply autofixes via MCP
- `@domphy/mcp`: `domphy_tones` tool — list valid tone values
- `@domphy/ui`: JSDoc on all 74 patches
- `@domphy/ui`: `manifest.json` — machine-readable patch catalog (props schema, examples)
- `@domphy/ui`: `tones.json` — structured tone reference for tooling
- `create-domphy`: scaffolding CLI (`npm create domphy@latest <dir>`) — generates a Vite + TS starter with `AGENTS.md`

---

## [0.14.0] — 2026-06-08

### Added
- `@domphy/ui`: `datePicker()` patch — native date/time picker (single, range, time modes), themed, accessible, zero-dependency

---

## [0.13.0] — 2026-06-04

### Added
- `@domphy/markdown`: new package — parse Markdown to Domphy element trees for SSR/SSG (`parseMarkdown`, `tokensToDomphy`, `splitFrontmatter`, `walkTokens`)
- `@domphy/mermaid`: new package — Mermaid diagrams (build-time SVG via mermaid-cli + client `mermaidClient()` patch)
- `@domphy/core`: `computed()`, `effect()`, `effectScope()`, `batch()`, `untrack()` — derived reactive values and effect scoping
- `@domphy/app`: `lazy()` — code-split routes with prefetch, SSR, and streaming support
- `@domphy/doctor`: `validate(element)` — returns a structured result object (vs `diagnose` which logs)
- `@domphy/doctor`: `duplicate-key` and `unstable-key` rules
- `@domphy/doctor`: app-block registry generator
- `@domphy/mcp`: `domphy_validate` tool — validate element trees via MCP
- `@domphy/mcp`: `list_app_blocks` and `get_app_block` tools — app-block registry discovery

---

## [0.12.0] — 2026-05-28

### Added
- `@domphy/palette`: new package — color palette quality engine: `Ramp`, `Palette`, `Swatch` (5 CIELAB metrics). Design-time companion to `@domphy/theme`. Ported from the Chromametry project.

---

## [0.11.0] — 2026-05-20

### Added
- `@domphy/floating`: new package — anchor positioning (vendored floating-ui, zero third-party runtime dep). Used internally by `@domphy/ui` overlays.

---

## [0.10.0] — 2026-05-12

### Added
- `@domphy/mcp`: new package — MCP server exposing patches, packages, rules, doctor tools, and the app-block registry to AI agents
- `manifest.json` — machine-readable package/patch index at `domphy.com/manifest.json`

---

## [0.9.0] — 2026-05-05

### Added
- `@domphy/doctor`: new package — static analyzer for Domphy element trees. Rules: `inline-typography`, `raw-spacing-value`, `void-content`, `missing-key`, `unknown-tag`. `diagnose(element)` logs violations; used for AI self-correction.

---

## [0.8.0] — 2026-04-28

### Added
- `@domphy/dnd`: new package — drag and drop / sortable lists (`dragDrop`, wraps `@formkit/drag-and-drop`)

---

## [0.7.0] — 2026-04-20

### Added
- `@domphy/ui`: `motion()` patch — declarative enter/exit/layout animations via Web Animations API (`initial`, `animate`, `exit` props)
- `@domphy/ui`: `transitionGroup()` patch — FLIP reorder animations for child lists

---

## [0.6.0] — 2026-04-10

### Added
- `@domphy/virtual`: new package — 1-1 port of `@tanstack/virtual-core` + Domphy adapter (`createVirtualizer` at `@domphy/virtual/domphy`)
- `@domphy/form`: new package — 1-1 port of `@tanstack/form-core` + Domphy adapter (`createForm` at `@domphy/form/domphy`)

### Removed
- `@domphy/ui`: `form()` and `field()` patches — use `@domphy/form` (`createForm`) instead
- `@domphy/ui`: `FormState` and `FieldState` classes — use `@domphy/form` instead
- `formGroup()` (layout patch) remains in `@domphy/ui`

### Migration: `form` / `field`
```ts
// before (0.5.x)
import { FormState, FieldState } from "@domphy/ui"
const form = new FormState()

// after (0.6.0+)
import { createForm } from "@domphy/form/domphy"
const form = createForm({ defaultValues: { ... } })
```

---

## [0.5.0] — 2026-03-30

### Added
- `@domphy/app`: stale-while-revalidate data cache for loaders
- `@domphy/app`: parallel routes (`@slot`) and intercepting routes
- `@domphy/app`: streaming SSR via `renderToStream`

---

## [0.4.0] — 2026-03-20

### Added
- `@domphy/query`: Domphy adapter — `createQuery`, `createInfiniteQuery`, `createMutation` at `@domphy/query/domphy`
- `@domphy/table`: Domphy adapter — `createDomphyTable` at `@domphy/table/domphy`
- `@domphy/query`, `@domphy/table`, `@domphy/router`, `@domphy/app`: initial packages

---

## [0.3.0] — 2026-03-10

### Changed
- `@domphy/core` and `@domphy/theme` are now **peer dependencies** of all other packages. Install one copy across the project — no duplicate runtime.

### Migration
Add explicit installs if missing:
```bash
npm install @domphy/core @domphy/theme
```
