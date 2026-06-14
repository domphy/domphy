# Doctor

`@domphy/doctor` is a static analyzer for Domphy element trees. It walks the plain-object tree — including the output of reactive `(listener) => …` functions — and flags non-idiomatic patterns. Its main job is to give **AI agents** (and humans) a feedback loop: generate code → `diagnose()` → fix what it reports.

Because Domphy UIs are plain objects, the doctor needs no parser and no build step.

## Install

```bash
npm install -D @domphy/doctor @domphy/core
```

`@domphy/core` is a peer dependency (the doctor reads its tag tables).

## Usage

```ts
import { diagnose, format } from "@domphy/doctor"

const App = {
  div: [
    { p: "Hello", style: { fontSize: "20px" } }, // inline typography
    { input: "oops" }, // void tag with content
    { dvi: "typo" }, // unknown tag
  ],
}

console.log(format(diagnose(App)))
```

```
⚠ [inline-typography] div > p
  Inline `fontSize` — avoid inline typography styles.
  → Use a typography patch (paragraph()/heading()/…) via $.
✗ [void-content] div > input
  Void tag "input" must have null content (got string).
⚠ [unknown-tag] div
  "dvi" is not a known HTML/SVG tag — likely a typo.
```

`diagnose(element, options?)` returns `Diagnostic[]`:

```ts
interface Diagnostic {
  rule: "inline-typography" | "void-content" | "missing-key" | "unknown-tag"
  severity: "error" | "warning" | "info"
  path: string // "div > ul > li"
  message: string
  hint?: string
}
```

## Rules

| Rule | Severity | Catches |
| --- | --- | --- |
| `inline-typography` | warning | `fontSize` / `lineHeight` / `fontWeight` / `letterSpacing` literals in `style` — use a typography patch |
| `void-content` | error | a void tag (`input`, `img`, `br`, …) with non-null content |
| `missing-key` | warning | a **dynamic** list (returned by a reactive function) of element children missing `_key` |
| `unknown-tag` | warning | an element whose first key isn't a valid HTML/SVG tag (typo) |

By default the doctor invokes reactive content functions with a no-op listener to inspect their output (this is how `missing-key` is found). Pass `{ runReactive: false }` if your reactive functions have side effects.

## In an AI loop

This is the point of the package. After the model generates a Domphy tree, run the doctor and return the report:

```ts
const report = format(diagnose(generatedApp))
if (report !== "✓ No issues found.") {
  // hand `report` back to the model and ask it to fix the listed issues
}
```

Most LLMs have little Domphy training data, so they learn it in-context from [`llms.txt`](/llms.txt) / [`AGENTS.md`](https://github.com/domphy/domphy/blob/main/AGENTS.md). The doctor enforces those same rules mechanically — turning "the model might get it wrong" into "the model gets told exactly what's wrong and fixes it." Wire it into your agent's task loop or CI.
