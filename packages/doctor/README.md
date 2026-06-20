# @domphy/doctor

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
  rule: string          // "inline-typography" | "void-content" | "missing-key" | "unknown-tag"
  severity: "error" | "warning" | "info"
  path: string          // "div > ul > li"
  message: string
  hint?: string
}
```

## Rules

| Rule | Severity | Catches |
| --- | --- | --- |
| `inline-typography` | warning | `fontSize`/`lineHeight`/`fontWeight`/`letterSpacing` literals in `style` — use a typography patch |
| `void-content` | error | a void tag (`input`, `img`, `br`, …) with non-null content |
| `missing-key` | warning | a **dynamic** list (from a reactive function) of element children missing `_key` |
| `unknown-tag` | warning | an element whose first key isn't a valid HTML/SVG tag (typo) |

By default the doctor **invokes reactive content functions** with a no-op listener to inspect their output (this is how `missing-key` is detected). Pass `{ runReactive: false }` if your reactive functions have side effects.

## For AI agents

Run `diagnose()` on generated Domphy code and feed `format()` back to the model — it will fix the issues itself. This is the self-correction loop that lets agents write correct Domphy despite having little training data for it. See the repo `AGENTS.md` and [`llms.txt`](https://domphy.com/llms.txt) for the rules the doctor enforces.
