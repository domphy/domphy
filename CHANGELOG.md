# Changelog

All notable changes to Domphy are documented here.

Packages are versioned in lockstep. All packages share the same version number.

---

## Unreleased

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
