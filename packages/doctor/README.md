# @domphy/doctor

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/doctor/) · [npm](https://www.npmjs.com/package/@domphy/doctor)

A static analyzer for Domphy element trees. It walks the plain-object tree and flags non-idiomatic patterns, giving humans — and especially **AI agents** — a feedback loop to self-correct generated code.

Because Domphy UIs are plain objects, the doctor can inspect them directly (no parser, no build step), including the output of reactive `(listener) => …` functions.

## Install

```bash
npm install @domphy/doctor @domphy/core
```

`@domphy/core` is a peer dependency (the doctor reads its tag tables).

## Usage

```ts
import { diagnose, format } from "@domphy/doctor"

const App = {
  div: [
    { p: "Hello", style: { fontSize: "20px" } },   // inline typography
    { input: "oops" },                              // void tag with content
    { dvi: "typo" },                                // unknown tag
  ],
}

const issues = diagnose(App)
console.log(format(issues))
// ⚠ [inline-typography] div > p
//   Inline `fontSize` — avoid inline typography styles.
//   → Use a typography patch (paragraph()/heading()/…) via $.
// ✗ [void-content] div > input
//   Void tag "input" must have null content (got string).
// ⚠ [unknown-tag] div
//   "dvi" is not a known HTML/SVG tag — likely a typo.
```

`diagnose(element, options?)` returns `Diagnostic[]`:

```ts
interface Diagnostic {
  rule: string          // one of the 23 rule ids below, e.g. "inline-typography"
  severity: "error" | "warning" | "info"
  category?: string     // "structure" | "key" | "theme" | "typography" | "data-attr" | "visual"
  path: string          // "div > ul > li"
  message: string
  hint?: string
}
```

## Rules

The doctor implements 23 rules:

| Rule | Severity | Catches |
| --- | --- | --- |
| `missing-key` | warning | a **dynamic** list (from a reactive function) of element children missing `_key` |
| `unstable-key` | warning | a dynamic list whose `_key`s are the array index (`0, 1, 2, …`) — unstable across reorders |
| `duplicate-key` | error | two sibling elements sharing the same `_key` value |
| `unknown-tag` | warning | an element whose first key isn't a valid HTML/SVG tag or [custom element name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) (typo) |
| `void-content` | error | a void tag (`input`, `img`, `br`, …) with non-null content |
| `inline-typography` | warning | `fontSize`/`lineHeight`/`fontWeight`/`letterSpacing`/`fontFamily`/`textDecoration` literals in `style` — use a typography patch, or the `@domphy/theme` token the hint names per property (`themeWeight()`, `themeLetterSpacing()`, `themeFont()`; `fontFamily` usually just goes away, since the themed root's stack inherits). Static and reactive forms are judged identically (`fontWeight: 500` and `() => 500` are the same declaration; a `var(--…)`/`calc()` is theme-driven either way). Scoped to the element itself — `&:hover`/`&::after` and conditional at-rules (`@media`/`@container`/`@supports`/`@layer`) included, at any depth — while a nested block reaching descendants (`"& h1"`, `"& > p"`) type-sets markup with no call site to patch and is not checked |
| `raw-theme-value` | info | a literal color (`#hex`, `rgb()`/`rgba()`, CSS named colors like `"red"`) in a color `style` prop — use `themeColor()`. A `color-mix()` is judged by its arguments: a mix of nothing but `var(--…)` tokens is not a raw value |
| `raw-spacing-value` | info | a literal `rem`/`em`/`px` spacing value in a spacing `style` prop — use `themeSpacing()` |
| `low-opacity` | warning/info | `style.opacity` < 0.6 on a control; info if hover-restore pattern (`&:hover: { opacity: '1' }`) is detected |
| `tone-background-inherit` | warning | `style.backgroundColor` resolves to a fixed shifted tone var instead of the inherit tone — use `dataTone` to shift the surface, not `backgroundColor` (null-content decorative hosts, e.g. swatches/glyphs, are exempt) |
| `missing-color` | warning | element uses `themeColor()` for at least one styled prop but has no `style.color` — text color won't re-evaluate when the tone context shifts (null-content decorative hosts, e.g. swatches/glyphs, are exempt) |
| `low-contrast` | warning / info | `style.color` and `style.backgroundColor` both resolve to theme vars but their ramp gap is < `CONTRAST_SPAN` (9) — insufficient contrast. Both are resolved against the element's own surface (its `dataTone`, or the nearest declared ancestor's), since every `themeColor()` tone is relative to the tone context. Nested blocks (`&:hover`, `@media …`) are checked with the CSS cascade applied and reported at **info** |
| `dataTone-surface-contract` | warning | element sets `dataTone` but is missing `backgroundColor` and/or `color` — a tone context surface must declare both so children can guarantee readable contrast |
| `color-shift-minimum` | warning | element with `dataTone` puts its text fewer than `CONTRAST_SPAN` (9) ramp steps from the surface that `dataTone` creates — a gap, not an absolute step (on a `shift-17` surface `themeColor(l, "shift-9")` resolves to step 7 and is legible). Defers to `low-contrast` when the element's own `backgroundColor` already supplies that pair |
| `unknown-tone` | warning | a `dataTone` that isn't valid tone grammar, or whose offset is out of the 18-step ramp (0–17). Valid grammar includes the semantic aliases `surface`/`hover`/`border`/`border-strong`/`muted`/`text` |
| `middle-surface-anchor` | warning | a `dataTone` of `shift-4`…`shift-13` (mid-ramp surface anchor) that may collapse child contrast |
| `unknown-density` | warning/error | a `dataDensity` that isn't valid grammar, or whose offset is out of the 5-step range (0–4) |
| `unknown-size` | warning/error | a `dataSize` that isn't valid grammar, or whose offset is out of the 8-step range (0–7) |
| `invalid-nesting` | error | HTML content-model violations the browser re-parents (breaking SSR/hydration): flow content in `<p>`, `a`/`button` inside `a`/`button`, `li`/`dt`/`dd`/`tr`/`td`/`th`/`option`/table-section tags with the wrong parent, non-`li` element child of `ul`/`ol`. Declared direct parent-child pairs only — reactive content, `rawHtml`, and SVG subtrees are exempt |
| `click-without-keyboard` | warning | an `onClick` on a non-interactive element (not a/button/input/select/textarea/summary/label, no interactive role, no `tabIndex`) without a keyboard handler — hidden elements exempt |
| `missing-required-attribute` | error (warning for `a`) | `<img>` without `alt` (`aria-label`/`aria-labelledby`/`role: "presentation"\|"none"` accepted), `<iframe>` without `title`; `<a>` with `onClick` but no `href`/`role` is a warning |
| `descendant-color-override` | warning | a scoped `"& <tag>": { color }` / `{ backgroundColor }` block on an element whose declared `<tag>` descendants carry a patch that sets the same prop **to a different value** — the descendant selector is specificity (0,1,1) and the patch's own class only (0,1,0), so the patch's tone is silently overridden |
| `unused-doctor-disable` | info | a `_doctorDisable` entry that suppresses nothing on its element — the named rule fired no diagnostic there, `_doctorDisable: true` consumed nothing, or the id matches no known rule (typo detection, à la ESLint's `reportUnusedDisableDirectives`). Only entries the element declares itself are checked, never a `# @domphy/doctor

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/doctor/) · [npm](https://www.npmjs.com/package/@domphy/doctor)

A static analyzer for Domphy element trees. It walks the plain-object tree and flags non-idiomatic patterns, giving humans — and especially **AI agents** — a feedback loop to self-correct generated code.

Because Domphy UIs are plain objects, the doctor can inspect them directly (no parser, no build step), including the output of reactive `(listener) => …` functions.

## Install

```bash
npm install @domphy/doctor @domphy/core
```

`@domphy/core` is a peer dependency (the doctor reads its tag tables).

## Usage

```ts
import { diagnose, format } from "@domphy/doctor"

const App = {
  div: [
    { p: "Hello", style: { fontSize: "20px" } },   // inline typography
    { input: "oops" },                              // void tag with content
    { dvi: "typo" },                                // unknown tag
  ],
}

const issues = diagnose(App)
console.log(format(issues))
// ⚠ [inline-typography] div > p
//   Inline `fontSize` — avoid inline typography styles.
//   → Use a typography patch (paragraph()/heading()/…) via $.
// ✗ [void-content] div > input
//   Void tag "input" must have null content (got string).
// ⚠ [unknown-tag] div
//   "dvi" is not a known HTML/SVG tag — likely a typo.
```

`diagnose(element, options?)` returns `Diagnostic[]`:

```ts
interface Diagnostic {
  rule: string          // one of the 23 rule ids below, e.g. "inline-typography"
  severity: "error" | "warning" | "info"
  category?: string     // "structure" | "key" | "theme" | "typography" | "data-attr" | "visual"
  path: string          // "div > ul > li"
  message: string
  hint?: string
}
```

## Rules

The doctor implements 23 rules:

| Rule | Severity | Catches |
| --- | --- | --- |
| `missing-key` | warning | a **dynamic** list (from a reactive function) of element children missing `_key` |
| `unstable-key` | warning | a dynamic list whose `_key`s are the array index (`0, 1, 2, …`) — unstable across reorders |
| `duplicate-key` | error | two sibling elements sharing the same `_key` value |
| `unknown-tag` | warning | an element whose first key isn't a valid HTML/SVG tag or [custom element name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) (typo) |
| `void-content` | error | a void tag (`input`, `img`, `br`, …) with non-null content |
| `inline-typography` | warning | `fontSize`/`lineHeight`/`fontWeight`/`letterSpacing`/`fontFamily`/`textDecoration` literals in `style` — use a typography patch |
| `raw-theme-value` | info | a literal color (`#hex`, `rgb()`/`rgba()`, CSS named colors like `"red"`) in a color `style` prop — use `themeColor()` |
| `raw-spacing-value` | info | a literal `rem`/`em`/`px` spacing value in a spacing `style` prop — use `themeSpacing()` |
| `low-opacity` | warning/info | `style.opacity` < 0.6 on a control; info if hover-restore pattern (`&:hover: { opacity: '1' }`) is detected |
| `tone-background-inherit` | warning | `style.backgroundColor` resolves to a fixed shifted tone var instead of the inherit tone — use `dataTone` to shift the surface, not `backgroundColor` (null-content decorative hosts, e.g. swatches/glyphs, are exempt) |
| `missing-color` | warning | element uses `themeColor()` for at least one styled prop but has no `style.color` — text color won't re-evaluate when the tone context shifts (null-content decorative hosts, e.g. swatches/glyphs, are exempt) |
| `low-contrast` | warning / info | `style.color` and `style.backgroundColor` are both reactive theme vars but their shift-step gap is < 9 (insufficient contrast). Nested blocks (`&:hover`, `@media …`) are checked with the CSS cascade applied and reported at **info** |
| `dataTone-surface-contract` | warning | element sets `dataTone` but is missing `backgroundColor` and/or `color` — a tone context surface must declare both so children can guarantee readable contrast |
| `color-shift-minimum` | warning | element with `dataTone` sets `style.color` to a tone step < 9 — below the minimum for legible body text |
| `unknown-tone` | warning | a `dataTone` that isn't valid tone grammar, or whose offset is out of the 18-step ramp (0–17). Valid grammar includes the semantic aliases `surface`/`hover`/`border`/`border-strong`/`muted`/`text` |
| `middle-surface-anchor` | warning | a `dataTone` of `shift-4`…`shift-13` (mid-ramp surface anchor) that may collapse child contrast |
| `unknown-density` | warning/error | a `dataDensity` that isn't valid grammar, or whose offset is out of the 5-step range (0–4) |
| `unknown-size` | warning/error | a `dataSize` that isn't valid grammar, or whose offset is out of the 8-step range (0–7) |
| `invalid-nesting` | error | HTML content-model violations the browser re-parents (breaking SSR/hydration): flow content in `<p>`, `a`/`button` inside `a`/`button`, `li`/`dt`/`dd`/`tr`/`td`/`th`/`option`/table-section tags with the wrong parent, non-`li` element child of `ul`/`ol`. Declared direct parent-child pairs only — reactive content, `rawHtml`, and SVG subtrees are exempt |
| `click-without-keyboard` | warning | an `onClick` on a non-interactive element (not a/button/input/select/textarea/summary/label, no interactive role, no `tabIndex`) without a keyboard handler — hidden elements exempt |
| `missing-required-attribute` | error (warning for `a`) | `<img>` without `alt` (`aria-label`/`aria-labelledby`/`role: "presentation"\|"none"` accepted), `<iframe>` without `title`; `<a>` with `onClick` but no `href`/`role` is a warning |
| `descendant-color-override` | warning | a scoped `"& <tag>": { color }` / `{ backgroundColor }` block on an element whose declared `<tag>` descendants carry a patch that sets the same prop **to a different value** — the descendant selector is specificity (0,1,1) and the patch's own class only (0,1,0), so the patch's tone is silently overridden |
| `unused-doctor-disable` | info | a `_doctorDisable` entry that suppresses nothing on its element — the named rule fired no diagnostic there, `_doctorDisable: true` consumed nothing,  patch's |

Every rule reads the element's **effective** props — the element with its `# @domphy/doctor

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/doctor/) · [npm](https://www.npmjs.com/package/@domphy/doctor)

A static analyzer for Domphy element trees. It walks the plain-object tree and flags non-idiomatic patterns, giving humans — and especially **AI agents** — a feedback loop to self-correct generated code.

Because Domphy UIs are plain objects, the doctor can inspect them directly (no parser, no build step), including the output of reactive `(listener) => …` functions.

## Install

```bash
npm install @domphy/doctor @domphy/core
```

`@domphy/core` is a peer dependency (the doctor reads its tag tables).

## Usage

```ts
import { diagnose, format } from "@domphy/doctor"

const App = {
  div: [
    { p: "Hello", style: { fontSize: "20px" } },   // inline typography
    { input: "oops" },                              // void tag with content
    { dvi: "typo" },                                // unknown tag
  ],
}

const issues = diagnose(App)
console.log(format(issues))
// ⚠ [inline-typography] div > p
//   Inline `fontSize` — avoid inline typography styles.
//   → Use a typography patch (paragraph()/heading()/…) via $.
// ✗ [void-content] div > input
//   Void tag "input" must have null content (got string).
// ⚠ [unknown-tag] div
//   "dvi" is not a known HTML/SVG tag — likely a typo.
```

`diagnose(element, options?)` returns `Diagnostic[]`:

```ts
interface Diagnostic {
  rule: string          // one of the 23 rule ids below, e.g. "inline-typography"
  severity: "error" | "warning" | "info"
  category?: string     // "structure" | "key" | "theme" | "typography" | "data-attr" | "visual"
  path: string          // "div > ul > li"
  message: string
  hint?: string
}
```

## Rules

The doctor implements 23 rules:

| Rule | Severity | Catches |
| --- | --- | --- |
| `missing-key` | warning | a **dynamic** list (from a reactive function) of element children missing `_key` |
| `unstable-key` | warning | a dynamic list whose `_key`s are the array index (`0, 1, 2, …`) — unstable across reorders |
| `duplicate-key` | error | two sibling elements sharing the same `_key` value |
| `unknown-tag` | warning | an element whose first key isn't a valid HTML/SVG tag or [custom element name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) (typo) |
| `void-content` | error | a void tag (`input`, `img`, `br`, …) with non-null content |
| `inline-typography` | warning | `fontSize`/`lineHeight`/`fontWeight`/`letterSpacing`/`fontFamily`/`textDecoration` literals in `style` — use a typography patch |
| `raw-theme-value` | info | a literal color (`#hex`, `rgb()`/`rgba()`, CSS named colors like `"red"`) in a color `style` prop — use `themeColor()` |
| `raw-spacing-value` | info | a literal `rem`/`em`/`px` spacing value in a spacing `style` prop — use `themeSpacing()` |
| `low-opacity` | warning/info | `style.opacity` < 0.6 on a control; info if hover-restore pattern (`&:hover: { opacity: '1' }`) is detected |
| `tone-background-inherit` | warning | `style.backgroundColor` resolves to a fixed shifted tone var instead of the inherit tone — use `dataTone` to shift the surface, not `backgroundColor` (null-content decorative hosts, e.g. swatches/glyphs, are exempt) |
| `missing-color` | warning | element uses `themeColor()` for at least one styled prop but has no `style.color` — text color won't re-evaluate when the tone context shifts (null-content decorative hosts, e.g. swatches/glyphs, are exempt) |
| `low-contrast` | warning / info | `style.color` and `style.backgroundColor` are both reactive theme vars but their shift-step gap is < 9 (insufficient contrast). Nested blocks (`&:hover`, `@media …`) are checked with the CSS cascade applied and reported at **info** |
| `dataTone-surface-contract` | warning | element sets `dataTone` but is missing `backgroundColor` and/or `color` — a tone context surface must declare both so children can guarantee readable contrast |
| `color-shift-minimum` | warning | element with `dataTone` sets `style.color` to a tone step < 9 — below the minimum for legible body text |
| `unknown-tone` | warning | a `dataTone` that isn't valid tone grammar, or whose offset is out of the 18-step ramp (0–17). Valid grammar includes the semantic aliases `surface`/`hover`/`border`/`border-strong`/`muted`/`text` |
| `middle-surface-anchor` | warning | a `dataTone` of `shift-4`…`shift-13` (mid-ramp surface anchor) that may collapse child contrast |
| `unknown-density` | warning/error | a `dataDensity` that isn't valid grammar, or whose offset is out of the 5-step range (0–4) |
| `unknown-size` | warning/error | a `dataSize` that isn't valid grammar, or whose offset is out of the 8-step range (0–7) |
| `invalid-nesting` | error | HTML content-model violations the browser re-parents (breaking SSR/hydration): flow content in `<p>`, `a`/`button` inside `a`/`button`, `li`/`dt`/`dd`/`tr`/`td`/`th`/`option`/table-section tags with the wrong parent, non-`li` element child of `ul`/`ol`. Declared direct parent-child pairs only — reactive content, `rawHtml`, and SVG subtrees are exempt |
| `click-without-keyboard` | warning | an `onClick` on a non-interactive element (not a/button/input/select/textarea/summary/label, no interactive role, no `tabIndex`) without a keyboard handler — hidden elements exempt |
| `missing-required-attribute` | error (warning for `a`) | `<img>` without `alt` (`aria-label`/`aria-labelledby`/`role: "presentation"\|"none"` accepted), `<iframe>` without `title`; `<a>` with `onClick` but no `href`/`role` is a warning |
| `descendant-color-override` | warning | a scoped `"& <tag>": { color }` / `{ backgroundColor }` block on an element whose declared `<tag>` descendants carry a patch that sets the same prop **to a different value** — the descendant selector is specificity (0,1,1) and the patch's own class only (0,1,0), so the patch's tone is silently overridden |
| `unused-doctor-disable` | info | a `_doctorDisable` entry that suppresses nothing on its element — the named rule fired no diagnostic there, `_doctorDisable: true` consumed nothing, or the id matches no known rule (typo detection, à la ESLint's `reportUnusedDisableDirectives`). Only entries the element declares itself are checked, never a `# @domphy/doctor

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/doctor/) · [npm](https://www.npmjs.com/package/@domphy/doctor)

A static analyzer for Domphy element trees. It walks the plain-object tree and flags non-idiomatic patterns, giving humans — and especially **AI agents** — a feedback loop to self-correct generated code.

Because Domphy UIs are plain objects, the doctor can inspect them directly (no parser, no build step), including the output of reactive `(listener) => …` functions.

## Install

```bash
npm install @domphy/doctor @domphy/core
```

`@domphy/core` is a peer dependency (the doctor reads its tag tables).

## Usage

```ts
import { diagnose, format } from "@domphy/doctor"

const App = {
  div: [
    { p: "Hello", style: { fontSize: "20px" } },   // inline typography
    { input: "oops" },                              // void tag with content
    { dvi: "typo" },                                // unknown tag
  ],
}

const issues = diagnose(App)
console.log(format(issues))
// ⚠ [inline-typography] div > p
//   Inline `fontSize` — avoid inline typography styles.
//   → Use a typography patch (paragraph()/heading()/…) via $.
// ✗ [void-content] div > input
//   Void tag "input" must have null content (got string).
// ⚠ [unknown-tag] div
//   "dvi" is not a known HTML/SVG tag — likely a typo.
```

`diagnose(element, options?)` returns `Diagnostic[]`:

```ts
interface Diagnostic {
  rule: string          // one of the 23 rule ids below, e.g. "inline-typography"
  severity: "error" | "warning" | "info"
  category?: string     // "structure" | "key" | "theme" | "typography" | "data-attr" | "visual"
  path: string          // "div > ul > li"
  message: string
  hint?: string
}
```

## Rules

The doctor implements 23 rules:

| Rule | Severity | Catches |
| --- | --- | --- |
| `missing-key` | warning | a **dynamic** list (from a reactive function) of element children missing `_key` |
| `unstable-key` | warning | a dynamic list whose `_key`s are the array index (`0, 1, 2, …`) — unstable across reorders |
| `duplicate-key` | error | two sibling elements sharing the same `_key` value |
| `unknown-tag` | warning | an element whose first key isn't a valid HTML/SVG tag or [custom element name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) (typo) |
| `void-content` | error | a void tag (`input`, `img`, `br`, …) with non-null content |
| `inline-typography` | warning | `fontSize`/`lineHeight`/`fontWeight`/`letterSpacing`/`fontFamily`/`textDecoration` literals in `style` — use a typography patch |
| `raw-theme-value` | info | a literal color (`#hex`, `rgb()`/`rgba()`, CSS named colors like `"red"`) in a color `style` prop — use `themeColor()` |
| `raw-spacing-value` | info | a literal `rem`/`em`/`px` spacing value in a spacing `style` prop — use `themeSpacing()` |
| `low-opacity` | warning/info | `style.opacity` < 0.6 on a control; info if hover-restore pattern (`&:hover: { opacity: '1' }`) is detected |
| `tone-background-inherit` | warning | `style.backgroundColor` resolves to a fixed shifted tone var instead of the inherit tone — use `dataTone` to shift the surface, not `backgroundColor` (null-content decorative hosts, e.g. swatches/glyphs, are exempt) |
| `missing-color` | warning | element uses `themeColor()` for at least one styled prop but has no `style.color` — text color won't re-evaluate when the tone context shifts (null-content decorative hosts, e.g. swatches/glyphs, are exempt) |
| `low-contrast` | warning / info | `style.color` and `style.backgroundColor` are both reactive theme vars but their shift-step gap is < 9 (insufficient contrast). Nested blocks (`&:hover`, `@media …`) are checked with the CSS cascade applied and reported at **info** |
| `dataTone-surface-contract` | warning | element sets `dataTone` but is missing `backgroundColor` and/or `color` — a tone context surface must declare both so children can guarantee readable contrast |
| `color-shift-minimum` | warning | element with `dataTone` sets `style.color` to a tone step < 9 — below the minimum for legible body text |
| `unknown-tone` | warning | a `dataTone` that isn't valid tone grammar, or whose offset is out of the 18-step ramp (0–17). Valid grammar includes the semantic aliases `surface`/`hover`/`border`/`border-strong`/`muted`/`text` |
| `middle-surface-anchor` | warning | a `dataTone` of `shift-4`…`shift-13` (mid-ramp surface anchor) that may collapse child contrast |
| `unknown-density` | warning/error | a `dataDensity` that isn't valid grammar, or whose offset is out of the 5-step range (0–4) |
| `unknown-size` | warning/error | a `dataSize` that isn't valid grammar, or whose offset is out of the 8-step range (0–7) |
| `invalid-nesting` | error | HTML content-model violations the browser re-parents (breaking SSR/hydration): flow content in `<p>`, `a`/`button` inside `a`/`button`, `li`/`dt`/`dd`/`tr`/`td`/`th`/`option`/table-section tags with the wrong parent, non-`li` element child of `ul`/`ol`. Declared direct parent-child pairs only — reactive content, `rawHtml`, and SVG subtrees are exempt |
| `click-without-keyboard` | warning | an `onClick` on a non-interactive element (not a/button/input/select/textarea/summary/label, no interactive role, no `tabIndex`) without a keyboard handler — hidden elements exempt |
| `missing-required-attribute` | error (warning for `a`) | `<img>` without `alt` (`aria-label`/`aria-labelledby`/`role: "presentation"\|"none"` accepted), `<iframe>` without `title`; `<a>` with `onClick` but no `href`/`role` is a warning |
| `descendant-color-override` | warning | a scoped `"& <tag>": { color }` / `{ backgroundColor }` block on an element whose declared `<tag>` descendants carry a patch that sets the same prop **to a different value** — the descendant selector is specificity (0,1,1) and the patch's own class only (0,1,0), so the patch's tone is silently overridden |
| `unused-doctor-disable` | info | a `_doctorDisable` entry that suppresses nothing on its element — the named rule fired no diagnostic there, `_doctorDisable: true` consumed nothing,  patch's |

 patches applied, composed exactly the way `ElementNode` does at runtime (each patch expanded, composed left to right, the native element last so it wins). A style, `dataTone`, `role`, `tabIndex` or `_doctorDisable` a patch contributes is therefore part of what is analyzed. The host tag always comes from the element itself, never from a patch.

By default the doctor **invokes reactive content functions** with a no-op listener to inspect their output (this is how `missing-key` is detected). Pass `{ runReactive: false }` if your reactive functions have side effects.

## CLI

`@domphy/doctor` ships a `domphy-doctor` binary that scans `.ts`/`.tsx`/`.js`/`.mjs` files or directories, extracts every exported Domphy element, and runs `diagnose()` on each:

```bash
npx domphy-doctor src/
```

Flags: `--only <rules>`, `--exclude <rules>`, `--no-reactive`, `--no-output` (skip Layer 4, see below), `--no-factory-exec` (never invoke exported functions as zero-arg factories — suppresses `factory-threw` warnings on component-library files whose factories require props; also skips Layer 4 `ElementNode` construction, which would run `_onInit`), `--no-dom` (skip installing a DOM — by default, when the scanned project has the optional peer `jsdom` installed, a `window`/`document` is put on `globalThis` so modules that touch the DOM at import time are analyzed instead of failing to import), `--merge-patches` (a `$`-patch factory like `button()` returns a tagless `PartialElement`, normally walked as a plain container and never actually checked — this synthesizes it onto the host tag its JSDoc `@hostTag` names, or `"div"`, and diagnoses that instead), `--format text|json`. Each export is analyzed once per run (a barrel re-exported by many files is not re-diagnosed per file), and the report is streamed as each file finishes. Exit code `1` when any error-severity diagnostic is found or a file failed to import, `2` on a CLI/usage error or a run that did not complete (crash, unhandled rejection in a scanned module, out of memory — a lint CLI must never exit `0` over code it did not check) — which includes a `--only`/`--exclude` rule id that matches no rule (`BUILTIN_RULE_IDS` is exported for the valid set), so a typo cannot silently filter every diagnostic away and exit green. See the [configuration docs](https://domphy.com/docs/doctor/configuration) for the full flag reference.

## Layer 4: HTML/CSS output linting

`auditOutput(node, options?)` is an optional fourth layer: it builds the real HTML/CSS a Domphy `ElementNode` would render and runs it through `htmlhint` (structural/a11y) and `stylelint` (CSS quality). Both linters are optional peer deps — `npm install --save-dev htmlhint stylelint` to enable them; `auditOutput()` silently skips a linter that isn't installed. The `domphy-doctor` CLI calls this automatically (disable with `--no-output`).

```ts
import { ElementNode } from "@domphy/core"
import { auditOutput, type Layer4Options } from "@domphy/doctor"

const diags = await auditOutput(new ElementNode(MyApp), { path: "MyApp" })
```

The framework's own base rule — `[hidden] { display: none !important; }`, which `ElementNode.generateCSS()` prepends to every root stylesheet and whose `!important` is load-bearing — is exempt from `css/declaration-no-important`; it is not user-editable, so flagging it on every tree was unactionable. An `!important` you wrote is still reported.

## For AI agents

Run `diagnose()` on generated Domphy code and feed `format()` back to the model — it will fix the issues itself. This is the self-correction loop that lets agents write correct Domphy despite having little training data for it. See the repo `AGENTS.md` and [`llms.txt`](https://domphy.com/llms.txt) for the rules the doctor enforces.
