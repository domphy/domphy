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
  rule: string          // one of the 18 rule ids below, e.g. "inline-typography"
  severity: "error" | "warning" | "info"
  category?: string     // "structure" | "key" | "theme" | "typography" | "data-attr" | "visual"
  path: string          // "div > ul > li"
  message: string
  hint?: string
}
```

## Rules

The doctor implements 18 rules:

| Rule | Severity | Catches |
| --- | --- | --- |
| `missing-key` | warning | a **dynamic** list (from a reactive function) of element children missing `_key` |
| `unstable-key` | warning | a dynamic list whose `_key`s are the array index (`0, 1, 2, …`) — unstable across reorders |
| `duplicate-key` | error | two sibling elements sharing the same `_key` value |
| `unknown-tag` | warning | an element whose first key isn't a valid HTML/SVG tag (typo) |
| `void-content` | error | a void tag (`input`, `img`, `br`, …) with non-null content |
| `inline-typography` | warning | `fontSize`/`lineHeight`/`fontWeight`/`letterSpacing`/`fontFamily`/`textDecoration` literals in `style` — use a typography patch |
| `raw-theme-value` | info | a literal color (`#hex`, `rgb()`/`rgba()`, CSS named colors like `"red"`) in a color `style` prop — use `themeColor()` |
| `raw-spacing-value` | info | a literal `rem`/`em`/`px` spacing value in a spacing `style` prop — use `themeSpacing()` |
| `low-opacity` | warning/info | `style.opacity` < 0.6 on a control; info if hover-restore pattern (`&:hover: { opacity: '1' }`) is detected |
| `tone-background-inherit` | warning | `style.backgroundColor` resolves to a fixed shifted tone var instead of the inherit tone — use `dataTone` to shift the surface, not `backgroundColor` |
| `missing-color` | warning | element uses `themeColor()` for at least one styled prop but has no `style.color` — text color won't re-evaluate when the tone context shifts |
| `low-contrast` | warning | `style.color` and `style.backgroundColor` are both reactive theme vars but their shift-step gap is < 9 (insufficient contrast) |
| `dataTone-surface-contract` | warning | element sets `dataTone` but is missing `backgroundColor` and/or `color` — a tone context surface must declare both so children can guarantee readable contrast |
| `color-shift-minimum` | warning | element with `dataTone` sets `style.color` to a tone step < 9 — below the minimum for legible body text |
| `unknown-tone` | warning | a `dataTone` that isn't valid tone grammar, or whose offset is out of the 18-step ramp (0–17). Valid grammar includes the semantic aliases `surface`/`hover`/`border`/`border-strong`/`muted`/`text` |
| `middle-surface-anchor` | warning | a `dataTone` of `shift-4`…`shift-13` (mid-ramp surface anchor) that may collapse child contrast |
| `unknown-density` | warning/error | a `dataDensity` that isn't valid grammar, or whose offset is out of the 5-step range (0–4) |
| `unknown-size` | warning/error | a `dataSize` that isn't valid grammar, or whose offset is out of the 8-step range (0–7) |

By default the doctor **invokes reactive content functions** with a no-op listener to inspect their output (this is how `missing-key` is detected). Pass `{ runReactive: false }` if your reactive functions have side effects.

## CLI

`@domphy/doctor` ships a `domphy-doctor` binary that scans `.ts`/`.tsx`/`.js`/`.mjs` files or directories, extracts every exported Domphy element, and runs `diagnose()` on each:

```bash
npx domphy-doctor src/
```

Flags: `--only <rules>`, `--exclude <rules>`, `--no-reactive`, `--no-output` (skip Layer 4, see below), `--format text|json`. Exit code `1` when any error-severity diagnostic is found, `2` on a CLI/usage error. See the [configuration docs](https://domphy.com/docs/doctor/configuration) for the full flag reference.

## Layer 4: HTML/CSS output linting

`auditOutput(node, options?)` is an optional fourth layer: it builds the real HTML/CSS a Domphy `ElementNode` would render and runs it through `htmlhint` (structural/a11y) and `stylelint` (CSS quality). Both linters are optional peer deps — `npm install --save-dev htmlhint stylelint` to enable them; `auditOutput()` silently skips a linter that isn't installed. The `domphy-doctor` CLI calls this automatically (disable with `--no-output`).

```ts
import { ElementNode } from "@domphy/core"
import { auditOutput, type Layer4Options } from "@domphy/doctor"

const diags = await auditOutput(new ElementNode(MyApp), { path: "MyApp" })
```

## For AI agents

Run `diagnose()` on generated Domphy code and feed `format()` back to the model — it will fix the issues itself. This is the self-correction loop that lets agents write correct Domphy despite having little training data for it. See the repo `AGENTS.md` and [`llms.txt`](https://domphy.com/llms.txt) for the rules the doctor enforces.
