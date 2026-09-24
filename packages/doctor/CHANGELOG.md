# @domphy/doctor

## 0.20.1

- CLI: yield one macrotask before exiting so an unhandled rejection left by a scanned module is reported (exit 2) instead of racing the final process.exit — exited 0 on Linux.
- Republish of 0.20.0 with no code change: the 0.20.0 tarball was published with raw `workspace:` dependency specifiers (published with `npm publish` instead of `pnpm publish`), so it could not be installed outside this monorepo. 0.20.0 is deprecated on npm.

## 0.20.0

- **doctor (CLI): new `--merge-patches` flag.** A `$`-patch factory (`button()`, `card()`, …) returns a tagless `PartialElement` — walked by default as a plain container object, so its own `style` is never actually checked (a reactive style callback found that way is just a leaf, not a factory to invoke). `--merge-patches` recognizes a tagless object carrying a `style` object or its own `$` array and synthesizes `{ [hostTag]: null, $: [patch] }` around it, `hostTag` read from the JSDoc `@hostTag <tag>` line `packages/ui/src/patches/*.ts` already carries above each factory (falling back to `"div"`). Scanning `packages/ui/src/patches` with it now finds real issues the default walk could not see at all.
- **doctor (CLI): a scanned module's `setTimeout`/`setInterval`/`requestAnimationFrame` are tracked and cleared after each file.** Scanning means importing (and, with factory execution on, invoking) real code — a component that starts a polling interval or an animation-frame loop used to keep running for the rest of a large scan, competing with every file after it. Always on, no flag.
- **`descendant-color-override` now also matches a class selector (`"& .caption"`), an attribute's presence (`"& [data-x]"`), and the universal selector (`"& > *"`)** — previously only a bare tag. A pseudo-class (`"& small:hover"`) still does not match, on purpose (a transient state, not the resting color a patch guarantees). It also now fires on a **native** `style.color`/`style.backgroundColor` declaration on the descendant, not just one a `$` patch supplies — both generate the identical per-node class at `(0,1,0)`, so both are equally outranked by the ancestor's `(0,1,1)` selector.
- **`raw-theme-value` and `color-mix()` detection now check against the real CSS Color Module Level 4 named-color table** (148 keywords) instead of "anything that is not a keyword, function, or `var()`". A bare identifier that is not actually a valid CSS color (a typo, a custom ident) is no longer misreported as "uses a CSS named color".
- **`inline-typography` no longer flags a pseudo-element block** (`"&::after"`) — a patch cannot attach to a pseudo-element any more than it can to a descendant subtree, so it is now exempt exactly like one. Conversely, a descendant block (`"& h2"`) is **no longer unconditionally exempt**: when the selector matches an element this same tree actually declares, there IS a call site — the hint now points at moving the typography patch there instead of staying silent.
- Layer 4's exemption for the framework's own `[hidden] { display: none !important; }` base rule now imports the literal from `@domphy/core` (`HIDDEN_DISPLAY_NONE_CSS`, new core export) instead of carrying its own byte-copy.
- `diagnose()`'s internal surface-probe node cache is now kept across calls instead of being cleared after every one — safe since `@domphy/core`'s `ElementAttribute.addListener` composes onto a caller's `onSubscribe` instead of replacing it (see core's changelog); verified with `pnpm --filter @domphy/doctor verify:retention` (`node --expose-gc`), 0.5 MB growth over 50k resolutions against 3 cached surfaces, down from 51 MB before the core fix.
- `expandPatches()`'s own cost is now measured in isolation from module-import time (`pnpm --filter @domphy/doctor measure:expand-patches`) — ~30-45 µs/call on a 2-level composed element.
- `tests/**/*` is typechecked separately from `src/**/*` in doctor, `@domphy/mcp`, `@domphy/i18n` and `create-domphy` (`tsconfig.test.json` + `pnpm typecheck` running both) — a type error only a test file introduced no longer goes unnoticed.
- **doctor: custom elements are tags.** A key that is a valid custom element name is recognized as the element's tag (shared with `@domphy/core` via `isCustomElementName`), so a web-component tree no longer reports a false `unknown-tag` — and no longer skips every other rule for that node. `invalid-nesting` is skipped whenever the parent or the child is a custom element (no declared content model, no HTML-parser re-parenting risk). `unknown-tag` on a hyphenated key now explains the custom-element name rule. `isCustomElementName` is re-exported from doctor's internal shared module for rule authors.
- **doctor: new built-in rule `descendant-color-override`** (warning). Flags an element whose own `style` declares a scoped descendant block (`"& small"`, `"& > p"`, `"& img, & svg"`) setting `color`/`backgroundColor` when a declared descendant of that tag carries a `$` patch setting the same property to a DIFFERENT value — a descendant combinator is specificity (0,1,1) and a patch's own class only (0,1,0), so the ancestor silently voids the patch's contrast guarantee. `BUILTIN_RULE_IDS` (and the CLI's `--only`/`--exclude` validation) now has 23 ids.
- **doctor: `diagnose()`/`validate()`/`fix()` now analyze each element with its `$` patches applied** — composed exactly the way `ElementNode` does at runtime (core's own `merge()`, native last). A style, `dataTone`, `role`, `tabIndex`, event handler or `_doctorDisable` a patch contributes is part of what every rule sees; the host tag and declared children still come from the element itself. A patch's `_doctorDisable` now suppresses at every host it is applied to and unions with the element's own entries; `unused-doctor-disable` reports only entries the element declares itself.
- **doctor: theme-aware rules now resolve against the element's surface** (its own `dataTone`, or the nearest declared ancestor's) instead of the unshifted root, using the new `@domphy/theme` `resolveToneStep`. `low-contrast` no longer skips an element that declares its own `dataTone`, `color-shift-minimum` measures the real gap instead of an absolute step read at context 0, and both defer to each other so one problem is reported once. `low-contrast` also now walks nested selector/at-rule blocks (`&:hover`, `@media …`) with the cascade applied (reported at `info`), exempting inactive states and text-free pseudo-elements; `tone-background-inherit` exempts null-content decorative hosts; `raw-theme-value` no longer flags a `color-mix()` built entirely from theme tokens; `inline-typography` is now scoped to the element itself (a nested descendant block is a patch's contract, not a call site the rule can act on) and judges static/reactive declarations identically.
- **doctor (CLI): `domphy-doctor` installs a `jsdom` window before importing files**, so a module that touches `document` at import time is analyzed instead of failing to import (`jsdom` is a new optional peer, like `htmlhint`/`stylelint` for Layer 4; `--no-dom` opts out). TypeScript is loaded through tsx's `register()` so a module shared by many scanned files is evaluated once (a 2.6 GB heap-limit abort on a large docs tree is now a 0.3 GB run that completes); each report is streamed as its file finishes; a run that does not complete never exits 0 (an uncaught exception or unhandled rejection from a scanned module now exits 2 naming the CLI); a jsdom-shaped `<canvas>` import failure (no rendering context without the optional `canvas` package) now names why.
- **doctor: `--only`/`--exclude` reject an unknown rule id** with exit 2 instead of silently filtering every diagnostic away and exiting green; an unknown flag exits 2 with usage instead of an uncaught Node stack trace and exit 1. `BUILTIN_RULE_IDS` is now a named export.
- Layer 4 no longer reports `css/declaration-no-important` for the framework's own `[hidden] { display: none !important; }` base rule; an `!important` you wrote is still reported.

## 0.19.2

- CLI / diagnose shared helpers: extra factory-exec and contrast-literal coverage.

## 0.19.1

- `@domphy/palette` dependency dropped — the palette package was folded into `@domphy/theme`; the `raw-theme-value` chromametry helpers (`cssRgbToRgb`/`hexToRgb`/`rgbToLab`/`labToLch`) are now imported from there.
- `findTag` / `unknown-tag` now use the first own key as the tag (same contract as core `validate()`). `{ dvi, div }` fires `unknown-tag` instead of treating the later `div` as the tag.
- CLI `--no-factory-exec` also skips Layer 4 `new ElementNode` construction so `_onInit` is not executed.

## 0.18.15

- `htmlhint`/`stylelint` moved from hard `dependencies` to optional `peerDependencies` (kept as devDependencies for the repo's own tests) — `auditOutput` already imports them lazily and silently returns `[]` when absent, so installing the CLI no longer drags in stylelint unless Layer 4 is actually used. Matches the long-documented "optional peer deps" contract.

## 0.18.14

- `unknown-tone` and `middle-surface-anchor` now accept @domphy/theme's semantic tone aliases (`surface`, `hover`, `border`, `border-strong`, `muted`, `text`) as valid `dataTone` grammar — they resolve to their underlying `shift-N` before grammar/range checks, so `dataTone: "border-strong"` is treated identically to `dataTone: "shift-4"`.

## 0.18.1

- Add built-in rule `tone-background-inherit`: warns when `style.backgroundColor` resolves to a fixed shifted tone (var(--X-N) with N > 0) at base context instead of `themeColor(l, "inherit")`. Detected by running the reactive function with a no-op listener. Use `dataTone` on the container to shift the surface tone instead of hardcoding a tone in `backgroundColor`.

## 0.9.0

- Initial release: `diagnose(element)` static analyzer for Domphy element trees — flags inline typography, void-tag content, missing `_key` on dynamic lists, and unknown tags. `format()` for readable reports.
