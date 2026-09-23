# @domphy/ui Changelog

## 0.22.0

- fix(overlays): a floating panel opened outside a `<dialog>` no longer mounts inside it. Panels opened *within* a dialog portal into the dialog's own overlay container (top-layer sharing), which used the same `id="domphy-floating"` as the app-level one, so the root's descendant lookup matched the dialog's copy first: after one in-dialog dropdown, every later popover/tooltip/select in the app was mounted inside a closed, `display:none` dialog — `aria-expanded="true"` with a 0x0, unfocusable panel. The container is now marked with a `data-domphy-floating` **attribute** (a document can legitimately hold several, so a fixed `id` was duplicate-id invalid HTML) and the root lookup is `:scope > [data-domphy-floating]`.
- fix(dialog, drawer): Escape dismisses only the topmost layer. While a `popover`/`selectBox`/`combobox`/`datePicker` panel is open inside the modal, the native `cancel` event is ignored so the panel closes and the dialog stays open (Radix `DismissableLayer` / React Aria overlay-stack parity).
- fix(dialog): initial focus honours `[autofocus]` before falling back to the first focusable element (HTML dialog focusing steps; Radix / MUI / Mantine parity).
- fix(toast): auto-dismiss (`duration`/`onDismiss`) is actually wired now — the `behavior()` instance that implements it (arm/pause/resume timer, hover/focus pause via `pointerenter`/`pointerleave`/`focusin`/`focusout`) was previously defined but never attached to the returned element, so both props were silently accepted and ignored (the toast never dismissed itself no matter what `duration` was passed). Covered by 3 new tests in `tests/production-readiness.test.ts` against real timers.
- fix(link): `href` no longer strips a caller's own explicit `role`/`tabIndex` override — only this patch's own default (`role: "link"` / `tabIndex: 0`) is removed once a native `href` makes them redundant. Previously any element composing `$: [link()]` while also declaring its own `role` (e.g. a search-result row that must be `role="option"` inside a `role="listbox"`) had that role silently deleted on mount. Found via `@domphy/press`'s `searchWidget()` (which composes `link()` on each result row), fixed at the root in `@domphy/ui` since every composer benefits.
- fix(pagination): the current page keeps `aria-current="page"` but is no longer `disabled`. Disabling the just-clicked button removed it from the tab order, so the browser dropped focus to `<body>` on every page change (WCAG 2.4.3). shadcn/ui and MUI mark the current page with `aria-current` only.
- fix(menu): roving `tabindex` per the WAI-ARIA APG menu pattern — exactly one item is in the page tab order, so Tab leaves the menu instead of stepping through every item. Arrow/Home/End resolve the target through the event's own `[role=menu]` instead of `document.getElementById`, so a menu inside a shadow root is navigable.
- fix(tabs): every `[role=tabpanel]` gets `tabindex="0"` so panel content with no focusable element is reachable and scrollable by keyboard (APG tabs pattern; Radix `Tabs.Content` parity).
- fix(details): the `summary` band uses `shift-11` on its `shift-2` background. `shift-10` was a gap of 8 and measured 4.33:1 (`#636363` on `#dbdbdb`) — an axe `color-contrast` WCAG AA failure.
- fix(transitionGroup): honours `prefers-reduced-motion: reduce` — the FLIP reorder is applied instantly, matching `motion` (WCAG 2.3.3).
- feat(splitterHandle): drag works with touch and pen (Pointer Events + `touch-action: none`), and the separator carries an accessible name via a new optional `label` prop (default `"Resize"`, WCAG 4.1.2).
- fix(motion): the patch's JSDoc sat above an internal `prefersReducedMotion()` helper wedged between the comment and `function motion`, so every `motion()` prop shipped with an empty `doc` in `manifest.json` and on the docs site. The helper moved to `utils/reducedMotion.ts`, now shared with `transitionGroup` instead of duplicated.
- feat(selectBox): ArrowDown/ArrowUp/Home/End open the dropdown and move focus into the listbox (WAI-ARIA APG Select-Only Combobox). With the panel open every arrow key was swallowed by the typeahead's `key.length === 1` guard, so the dropdown could only be driven by mouse or by guessing an option's first letter.
- fix(combobox): ArrowDown/ArrowUp from the input reach an option on the FIRST press. The move was scheduled on a single `requestAnimationFrame`, but `show()` is debounced by 100ms — the panel did not exist yet, and the panel is still `visibility: hidden` at the instant `open` flips, where `focus()` is a no-op. Both are now waited out.
- fix(tag): `removable` inserts its × button with `updateDom`, so the button exists after hydration and on a fresh render. It relied on `_onMount` firing before the children walk; `@domphy/core` now fires Mount bottom-up (React/Vue parity), which left the button in the node list with no DOM node.
- fix(buttonGhost, buttonSwitch, tag): `width: fit-content`. `display: inline-flex` is blockified by a flex or grid parent, so inside a `stack()` a ghost button stretched to 1232px next to an 88px outline button, and the 48px switch pill stretched with its thumb stranded at one end.
- fix(inputCheckbox, inputRadio): the disabled state keeps the control's outline and only drops the colour family to neutral. Filling `::before` with flat grey and dropping its outline made a disabled UNCHECKED box read as filled — more "on" than an enabled unchecked box, and indistinguishable from the disabled checked one.
- fix(inputSwitch): the OFF track stays on the surface tone and carries its 3:1 (WCAG 2.1 SC 1.4.11) through `"shift-7"` outlines on the track and knob, like `buttonSwitch`. Darkening the off-track fill to `"shift-7"` cleared the contrast floor but made the OFF state read as ON; Radix, shadcn/ui and MUI all keep the off-track muted.
- fix(overlays): outside-click and document-level Escape dismissal survive the first close. The panel node carried a borrowed registration of the ANCHOR's `behavior()` instance (so panel-originated events could resolve it), and `ElementNode` teardown destroys every instance in a removed node's map — so closing any `popover`/`menu`/`tooltip`/`selectBox`/`combobox`/`datePicker` once destroyed its anchor's behavior. Measured in Chromium: from the SECOND open onward the panel could only be closed by clicking its own trigger again. The registration is now withdrawn before the panel is removed.
- fix(overlays): dismissing a panel while the focus is INSIDE it returns the focus to the trigger (WCAG 2.4.3; Radix `DismissableLayer` + `FocusScope` parity). Measured: selectBox trigger → ArrowDown → Escape left `document.activeElement === document.body`. Focus is left alone when the dismissal came from the user clicking or tabbing elsewhere, and when the anchor is a wrapper (combobox) the focus goes to its first tab stop.
- fix(overlays): a document-level Escape closes only the TOP layer — the last panel in the shared `[data-domphy-floating]` overlay — instead of every open panel at once. With a popover opened from inside another popover, one Escape removed both, and the outer's teardown ran first, tearing out the inner's trigger so the restored focus fell through to `<body>`.
- fix(combobox): the popup opens on click / typing / ArrowDown, not on plain focus. Since Escape now returns focus to the input, an open-on-focus popup re-opened within 100ms of every Escape and could never be dismissed (MUI Autocomplete defaults `openOnFocus` to false for the same reason).
- fix(popover): the trigger's `aria-haspopup` names the role the panel ACTUALLY has. It was pinned to `"dialog"`, but content that owns its own surface keeps its own role — a `menu()` panel is `role="menu"`, a `selectList()` panel is `role="listbox"` — so the menubar recipe announced a dialog and opened a menu. Resolved from the content element and its `$` patches with core's own precedence (later patch wins, the element's own key wins over all), mapping `menubar`→`menu`, `treegrid`→`grid`, `alertdialog`→`dialog`, and falling back to `"dialog"` for a role with no matching value.
- fix(datePicker): the calendar opens on click / ArrowDown / Enter, not on plain focus — same reason as `combobox`, plus a keyboard user tabbing through a form no longer gets a calendar over the next fields (WAI-ARIA APG Date Picker Combobox, React Aria and MUI all open on press).

## 0.21.6

- fix(popover, selectBox, combobox, datePicker): dropdown panels use the page surface (`shift-0`), same as `menu` / `selectList` / `dialog`. `shift-14` inverted the panel in light theme, so the menubar recipe (`popover` + `menu`) rendered as a dark card wrapping a light list. Tooltip / toast stay inverted (`shift-17`).
- fix(popover): do not stamp panel chrome / `role=dialog` onto content that already owns a surface (`dataTone` on the element or a `$` patch). `menu()` already sets `role=menu`, `shift-0`, and elevation; a second stamp overwrote the role and comma-joined a second `boxShadow`.

## 0.21.5

- fix(overlays): `open` (`dialog`/`drawer`/`popover`/`tooltip`/`combobox`/`selectBox`/`createFloating`) accepts `Computed`/`ReadableState`. Subscribe with `addListener` on writable `State`, `effect()` on read-only (Computed has no `addListener`/`set`). Dismiss via optional `onDismiss`; `.set(false)` only when writable.
- feat(stack, row, toolbar): `density?: boolean` (default true). `false` is structural gap = bare `themeSpacing(n)` (page/form columns). `stack` gains `justify`; `toolbar` forwards `wrap`/`justify`/`align`/`density`.
- feat(heading): `size?: ElementSize` — when set, `themeSize(listener, size)` with no tag bump (`"inherit"` included).
- fix(textarea): `autoResize` remeasures when the host becomes visible (`IntersectionObserver`) and when its box size changes (`ResizeObserver`).

## 0.21.4

- a11y: datePicker ArrowDown opens `[role=grid]`, ArrowRight moves `[data-date]`; rating ArrowRight increments (gated in `a11y-keyboard.test.ts`).
- Package description no longer claims "dependency-free"; `zero-dependency` keyword dropped.

## 0.21.3

- fix(dialog, drawer): closed state now sets inline `display: none` (same strategy as `visibility` / `pointer-events`) so a consumer `style.display` cannot keep the closed node in layout. Mounted-closed skips the close animation and hides immediately.
- fix(tag, code, mark, keyboard, badge): density scaling used the old absolute U as the multiplier (`density × 6` on a chip that was already 6U), so default-density chips were 1.5× too large — a `tag` filled the `selectBox`/`combobox` trigger. Multiplier is now `U / 1.5` so default pixels match the catalog snapshots and chips stay inset in the trigger (`minHeight` `(6 + 2d)U`).

## 0.21.2

- fix(overlays): `open.set(true)` / `open: true` inserts the floating panel (popover, selectBox, combobox, datePicker, tooltip) — `attachFloating` now subscribes to `openState` like `attachDialog`.
- fix(drawer): migrate `_onMount` factory-scope state to `behavior()` so reuse still calls `showModal`; guard `showModal` when already open; clear the close fallback timer on reopen; backdrop click uses the panel rect (empty-panel clicks no longer close).
- fix(popover): click-mode `onBlur` no longer closes (docs: focus has no effect when `openOn` is `"click"`).
- fix(floating): portal a panel whose trigger is inside an open `<dialog>` into that dialog so it shares the top layer (z-index cannot beat `showModal`).
- fix(selectBox, combobox): wrap/options rebuild via `behavior().update()` so later `options` apply on a reused node.
- fix(menu): rebuild menuitems on patch/update, not only `_onSchedule`.
- fix(datePicker): do not copy the previous internal selection onto a caller-provided `Date`; expose `role=combobox` + `aria-expanded` / `aria-controls`.
- fix(combobox): filter input keeps typed text; `role=combobox` + `aria-controls` + `aria-expanded`.
- fix(selectBox): trigger `aria-controls` for the listbox panel.

## 0.21.1

- Peer range widened: `@domphy/theme` now accepts `^0.21.0 || ^0.22.0` — theme 0.22.0 is additive (palette re-export), and every theme API ui uses (`themeColor`/`themeDensity`/`themeSpacing`/`themeSize`) is unchanged. Removes the peer warning for consumers on theme 0.22.x.

## 0.20.12
- fix(a11y): `selectBox` opens via Enter/Space/ArrowDown on the focused trigger (not click-only); `role=button` + `aria-haspopup=listbox` + reactive `aria-expanded`. Keyboard contract test drives keydown (no `.click()`).

## 0.20.11
- a11y: interactive-patch axe-core matrix (`tests/a11y-matrix.test.ts`) fails on critical/serious; keyboard contracts for menu/tabs/selectBox/combobox (`tests/a11y-keyboard.test.ts`).
- fix(a11y): `selectList` is `role=listbox` with named options and `type=hidden` form fields (aria-hidden wrapper).
- fix(a11y): `command` is `role=group`; `commandItem` uses native button semantics (search input sibling-safe).
- fix(a11y): default `aria-label` on `inputPassword` field and combobox filter input; `inputOTP` is `role=group` with a default label.

## 0.20.10
- Visual-fidelity fixes (screenshot-driven QA vs shadcn/ui):
  - `menu`, `selectList`: light panel surface (`shift-0`) instead of a hardcoded near-black one — reads as a proper light listbox on light pages.
  - `popoverArrow`: arrow border now uses `border-strong` so the arrow is visible (was surface-on-surface invisible).
  - `skeleton`: base/highlight lightened to shift-1/shift-2 (near-white shimmer instead of mid-gray).
  - Invalid `-calc(...)` CSS fixed so it actually paints: `tabs` active underline (never rendered before), `timeline` connector line, `details` summary chevron offset.

## 0.20.9
- Requires @domphy/core >= 0.20.0 (string children are now text by default). Icon glyphs in `tag`, `rating` and `inputPassword` are wrapped in `rawHtml()` so they still render as SVG.

## 0.20.2
- fix(dialog, drawer): guard `close()`/`showModal()` calls for environments where `HTMLDialogElement` exists but its methods are unimplemented (jsdom) — an unguarded `dlg.close()` in the close fallback timer crashed the test process with an unhandled async error. Metadata: fuller description/keywords, consistent author name.

## 0.1.9
- Initial release
## 0.1.11
- select patch use backgroundImage for arrow
## 0.1.13
- update core
- table
## 0.1.16
- chromametry palette
## 0.1.17
- selectable menu
## 0.1.20
- darkBias theme
## 0.18.22
- fix: `popover`/`tooltip`/`selectBox`/`combobox`/`datePicker` (via `utils/floating.ts`) no longer lose outside-click/Escape dismissal after a reactive ancestor re-renders the trigger — migrated off a hand-rolled `WeakMap<Element, ...>` generation-eviction workaround onto `@domphy/core`'s new per-node `behavior()` contract (requires `@domphy/core` ^0.19.0)
## 0.18.23
- fix: republish — 0.18.22 was published with `npm publish`, which leaked the raw `workspace:^` protocol into the tarball's `dependencies`/`peerDependencies` (`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` for every external consumer); publishing with `pnpm publish` rewrites them to real semver ranges. No code changes.
## 0.19.0
- feat: polished patch defaults — the DEFAULT look of every patch is the de-facto design system, and it was reading "wireframe" (1px `shift-4` outlines everywhere, `density × 1` radius, zero elevation, no transitions). This release addresses that directly, with no breaking changes to existing DOM structure, tags, or props.
- feat(button): `variant?: "solid" | "outline" | "ghost"` (default `"outline"`, the existing look — backward compatible) and `size?: "small" | "medium" | "large"` (default `"medium"`). `variant: "ghost"` delegates straight to `buttonGhost()` so the two share one implementation.
- feat(buttonGhost): `size?: "small" | "medium" | "large"` (default `"medium"`), same presets as `button()`.
- feat: elevation for floating/raised surfaces — shared `elevation(level)` helper (`"low" | "medium" | "high"`, internal `packages/ui/src/utils/elevation.ts`), layered black-alpha box-shadows that work on both themes. Applied to popover/menu/combobox/selectBox-dropdown/datePicker-popup (`"border-strong"` outline + medium shadow), dialog/drawer (high shadow, shadow-only), toast (medium, shadow-only), tooltip (low, shadow-only), fab (low at rest, medium on hover). `combobox`/`selectBox` previously had NO default surface on their dropdown `content` at all (fully transparent until the caller styled it) — they now get the same background/outline/radius/shadow treatment as `popover`.
- feat: unified `:focus-visible` ring — shared `focusRing(listener, color)` helper (internal `packages/ui/src/utils/focusRing.ts`), a 2px accent-tone halo via `box-shadow`, replacing the previous inconsistent mix (some patches thickened their resting `outline` on focus, others used an inset ring). Applied to `button`, `buttonGhost`, `linkButton`, all `input*` text-like patches, `select`, `textarea`, `segmented`, `tabs`, `toggleGroup`, `rating`, `pagination`. `pagination`/`rating` previously had no visible custom focus indicator at all.
- feat: hover/press transitions — interactive patches now transition `background-color`/`color`/`outline-color`/`box-shadow` (~140ms ease) instead of snapping between states.
- feat(theme): control `borderRadius` formula bumped from `density × 1` to `density × 1.5` (matching the precedent already set by `textarea()`) across every bounded-control/floating-panel patch that used the old formula — softer, less boxy corners at default density. Canonical formula documented in `AGENTS.md` and `packages/theme/README.md` updated to match.
- refactor: adopted the `@domphy/theme` v0.20 semantic tone aliases (`surface`/`hover`/`border`/`border-strong`/`muted`/`text`) across the patches whose raw `shift-N` usage matched an alias's role — swapped only where the number AND the role matched (e.g. a `shift-2` background that is NOT a hover state, or a `shift-4` used as a background fill rather than an outline, was deliberately left as a raw `shift-N`).
## 0.20.0
- feat: layout primitives — `stack()` (vertical flex column + density-aware gap), `row()` (horizontal flex + gap, centered by default, with `align`/`justify`/`wrap`), and `panelSection()` (density-aware padding + optional bottom divider, a thin wrapper meant to compose with `stack()`/`row()` — it does not impose flex layout on its children). Added after an audit of a consumer app found 409 raw `style: {}` blocks re-implementing the same handful of flex shapes across 30 files.
- refactor(toolbar): `toolbar()` now delegates to `row({ gap, align: "center" })` instead of duplicating the same `display: flex; alignItems: center; gap: ...` style object — no change to its own props or output.
## 0.20.1
- fix(dialog, drawer): a closed dialog/drawer represented its state with ONLY `opacity` (dialog) or an off-screen `transform` (drawer) — neither removes an element from the tab order or the accessibility tree the way `visibility` does, and a consumer's own `style: { display: ... }` on the dialog element overrides the UA stylesheet's `dialog:not([open])` rule too. Both patches now also set `visibility`/`pointerEvents` inline (open = visible/auto, closed = hidden/none), so a closed dialog/drawer's content is never Tab-reachable or screen-reader-visible regardless of what the consumer's own style declares.
