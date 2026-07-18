# @domphy/ui Changelog

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
