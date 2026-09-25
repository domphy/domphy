# @domphy/core Changelog

## 0.22.1

**Fix: a reactive shorthand no longer wipes the longhands declared after it.** When a mounted node activated a reactive value (or a state changed it), `StyleProperty` wrote it through `CSSStyleDeclaration.setProperty()`, and setting a shorthand resets every longhand it covers regardless of source order. `inputCheckbox`'s tick (`border: <reactive>; border-top: 0; border-inline-start: 0`) therefore drew all four borders — a rotated box instead of a check — on every client-rendered checkbox since reactive values started activating after insert (0.21.x). The live rule now re-writes every declaration that follows the one it changed (and after a removal), so the CSSOM keeps the cascade the declared text states. `@domphy/ui`'s a11y matrix now asserts, for every interactive patch, that the live CSSOM equals the parsed `generateCSS()` text.

## 0.22.0

**Custom elements / web components are first-class.** A tag key that is a [valid custom element name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) renders as that element — no registration with Domphy needed. The tag key must be the FIRST key of the descriptor and may not be in the `data-*`/`aria-*` namespaces (both match the valid-custom-element-name production and would otherwise render the wrong element).

- Props follow the React 19 / Preact rule: a key naming a property of the element instance is assigned as a **property** (objects, arrays and functions reach the component intact, by reference, not deep-cloned); everything else is set as an attribute. Object/function values are assigned even before upgrade, so a lazily-defined element still receives them. Clearing or dropping a prop clears the property too.
- `onX` keeps its **case** on a custom element when it is not a standard DOM event: `"onsl-change"` listens to `sl-change`, `onMyEvent` to `MyEvent`. Standard events (`onClick` → `click`) are unchanged everywhere.
- SSR omits non-serializable props (no `[object Object]` in markup) and `mount()` assigns them during hydration.
- New exports: `isCustomElementName()` and the `CustomElement<Props>` type.

**CSS rule de-duplication + content-hashed style classes + per-root node ids.**

- Styled nodes with identical CSS now share one generated class instead of each inserting its own copy of the same rules (a content-hash registry) — measured 49% fewer stylesheet rules and 34% smaller SSR `<style>` output on the audited block corpus. Style sharing survives CSS value normalization (a declaration the parser rewrites, e.g. `#ffffff` → `rgb(255, 255, 255)`, no longer takes a node private on first activation). Cascade order is preserved when an element's style changes: an element that moves to its own class re-inserts its whole rule block in declaration order, so a conditional `@media` block still wins over the base block at equal specificity (previously it could invert the cascade). A reactive `class` keeps updating after its element leaves the shared style scope (it used to freeze at whatever the function last returned). The rule-count/SSR-bytes/CSSOM-size win is real, but is NOT a rendering-speed fix on its own — measured (`sidebarLeftRight` block, jsdom): the 62-70% rule-count cut buys only ~150ms of a ~1130ms total wall time (`insertRule` costs ~0.40ms/rule regardless of sharing; x1 mount 803ms→814ms, x2 919ms→1005ms, noise-level either way). DOM construction, not CSSOM rule insertion, dominates wall time at this scale.
- **`resetNodeIds()` is removed; node ids are scoped to the render root.** Each tree's root hands out its own `n0`, `n1`, … in construction order, so two server renders happening at once cannot influence each other's ids and an SSR host needs no per-request reset. **New `_idPrefix`** on a root descriptor distinguishes several roots in one document, the way React's `identifierPrefix` does for `useId` — give each root its own prefix when mounting several independent trees into one page, or ids built on `nodeId` will repeat across them.

**Reactivity**

- `effect(fn)` accepts a cleanup function returned from `fn` (Svelte 5 `$effect` / Preact-signals contract), and reactive resources created during a run are disposed when that run is superseded (Solid owner semantics).
- `computed` compares with `Object.is`, matching `State.set()` — a computed resolving to `NaN` no longer notifies downstream on every dependency write.
- `watch` runs its callback untracked, so a read inside the callback no longer becomes a watcher dependency (Vue 3 semantics).
- A runaway reactive loop now stops and reports instead of hanging: the scheduler counts re-runs of the same reaction within one flush and, past 100 (Vue 3's `RECURSION_LIMIT`), skips it and logs "Maximum recursive updates exceeded" instead of re-running forever with no diagnostic.
- `_onMount` fires bottom-up on a fresh render, matching hydration — a hook that measures its own subtree used to see an empty element on the render path.
- `ElementAttribute.addListener()` no longer leaks subscribers: it composes onto the caller's `onSubscribe` instead of replacing it, so unsubscribing actually releases the listener (measured with forced GC: 500 subscribe/release cycles went from 500 retained listeners to a constant 2).

**SSR / sanitizer**

- SSR no longer loses a leading newline inside `<pre>`/`<textarea>` — the HTML parser eats the first newline after those start tags, so it is now doubled the way the spec provides for.
- The `[hidden] { display: none !important }` base rule is inserted once the stylesheet exists instead of being marked done against a null sheet — a tree rendered into a shadow root whose host was still detached previously never got the rule at all. `generateCSS()` emits the same base rule the client injects, so an SSR `hidden` element with its own `display` no longer flashes before hydration.
- `rawHtml()`'s sanitizer drops `<base>` (re-targets every relative URL on the page — DOMPurify forbids it by default too), SVG animations that re-target a handler/URL attribute (`<set attributeName="onmouseover">`, `<animate attributeName="href">`), and `<meta http-equiv=refresh>`.
- Attribute names outside the ASCII XML Name production are dropped on both render paths instead of throwing on the client and breaking out of the attribute in SSR output.
- An empty reactive child no longer renders a zero-width space (an empty text node on the client, a comment anchor in SSR): `<button aria-label="Close">{null}</button>` is named from its label alone, and an empty `role="alert"` region stays empty.

**Types / dev warnings**

- `tabIndex`, `autoFocus`, `contentEditable` and `spellCheck` now typecheck in the camelCase spelling the runtime always accepted.
- Void tags accept only `null`: `{ hr: "" }` now warns in development like any other content on a void element. A single child still needs its array: `{ button: { span: "Save" } }` now warns (the runtime silently wrapped the bare object before).
- New export **`mergePartial(element)`** collapses an element's `$` patch array the way `ElementNode` does at runtime (patches expanded and composed left to right, the element's own keys last) without mutating the element it is given, for tooling that needs to inspect a tree's real composition order before it is constructed.

## 0.21.4

- **fix: runs on Chrome 88-class embedded browsers again** — the five `Object.hasOwn` calls (Chrome 93+) on the mount / attribute / context / behavior paths threw `Object.hasOwn is not a function` at the first mount inside SketchUp 2022 (CEF 88), blanking the host dialog. Replaced by an internal `hasOwn()` helper; `tests/legacy-engine.test.ts` traps the API so it cannot come back.

## 0.21.3

- Public entry re-exports `TextNode` (`export *` from `classes/TextNode.js`).
- CDN IIFE (`src/global.ts`) is `export * from "./index.js"` so `Domphy.ElementNode` sits on the namespace (not nested `.core`).

## 0.21.2

- StyleProperty CSS-escapes `;`, `}`, and `</style>` in interpolated style values; reactive style listeners unsubscribe on re-set (multi-state functions no longer leak).
- Computed that throws on first run is disposed; set-bailout and element-audit tests cover the reused-node contract.

## 0.21.1
- **fix: multi-hump aria attribute names** — `ariaActiveDescendant`, `ariaColCount`, `ariaPosinSet`, and `ariaSetSize` were missing from the attribute-name map and fell through to camel-to-kebab conversion, emitting invalid names like `aria-active-descendant` (spec: `aria-activedescendant`) that assistive technology never sees. Any app using these four typed keys was silently broken, client and SSR alike.
- **perf: keyed-list reconciliation and patch hot paths** — measured on a js-framework-benchmark-style harness (swap 186→37ms, remove 142→36ms, append 313→180ms, create-1k 206→145ms): `StyleList.patchCSS` no longer creates empty CSSOM rules on style-less patches and `StyleRule.remove()` is O(1) via an insert-time index hint; `ElementNode.patch()` short-circuits on a same-reference descriptor (reactive bindings inside keep their subscriptions); keyed moves now apply the minimal DOM move set (patience LIS — row removal = 0 moves, two-row swap = 2); `getTagName` is a Set lookup, `nodeId` skips hashing style-less nodes, and `cloneDescriptor()` removes the per-node O(depth) double-clone. New property-based tests (fast-check) pin the reused-node contract under randomized op sequences.

## 0.20.1
- `contentEditable` and `spellCheck` are enumerated attributes, not boolean ones: `contentEditable: false` now renders `contenteditable="false"` (previously the attribute was removed entirely, so a child of an editable ancestor stayed editable — exactly what `@domphy/editor` emits for atom nodes), `"plaintext-only"` passes through unchanged, and a reactive `true → false` transition works. SSR output fixed the same way.

## 0.20.0
- **Security (breaking default):** a string child is now rendered as TEXT. Previously any string that looked like HTML (`isHTML()`) was parsed into live DOM, so user-supplied values (comments, titles, form fields) could inject elements — only `on*` attributes and `javascript:` URLs were stripped, with no tag whitelist. Markup in a plain string is now escaped on both the client and in SSR output.
- Added `rawHtml(html)` / `RawHTML` / `isRawHTML(value)`: the explicit opt-in for rendering a string as markup. It still strips `<script>` elements, `on*` handler attributes and `javascript:` URLs (defense in depth — not a sanitizer for untrusted input). A reactive child may switch between a plain string and `rawHtml()`; crossing that boundary rebuilds the node.
- **Migration:** anywhere you passed markup as a string child expecting it to render (a Markdown renderer's output, a syntax highlighter, a generated SVG), wrap it: `{ div: svg }` → `{ div: rawHtml(svg) }`. Plain text children need no change.

## 0.19.3
- Types: `PartialElement` now includes optional `_doctorDisable` (`true | string | string[]`) so design-system patches can declare intentional doctor suppressions in TypeScript.

## 0.19.2
- fix `merge()`: no longer drop empty-string leaf values (`""`). Only `undefined`/`null` are skipped. Fixes decorative-image `alt: ""` and other valid empty HTML attributes being stripped during patch composition.

## 0.19.1
- Metadata only: fuller package description/keywords for npm. No runtime change.

## 0.1.5
- Initial release
## 0.1.7
- fix listener type
## 0.1.8
- move _notofier from AttributeList to ElementAttribute
## 0.19.0
- add `behavior(key, attach, props)` and `ElementNode.getBehavior(key)`: a per-node behavior contract (Svelte-action-like) for imperative state that must survive a reactive parent re-rendering a reused node — `attach` runs once per real DOM node, `update(props)` routes every later re-render's fresh props into that same instance, `destroy()` fires exactly once on removal
