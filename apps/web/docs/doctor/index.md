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
  rule: string // "inline-typography" | "void-content" | "missing-key" | …
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
| `duplicate-key` | error | two siblings sharing the same `_key` value — the reconciler can't tell them apart |
| `unstable-key` | warning | a dynamic list whose `_key`s are the array index (`0, 1, 2, …`) — index keys shift on reorder/insert |

By default the doctor invokes reactive content functions with a no-op listener to inspect their output (this is how the dynamic-list rules are found). Pass `{ runReactive: false }` if your reactive functions have side effects.

`duplicate-key` is decidable on any sibling array — static or dynamic — so it is checked everywhere. `missing-key` and `unstable-key` are specific to **dynamic** lists, since only those go through keyed reconciliation.

## validate

`validate(element, options?)` is the aggregate entry point. It runs every rule and returns a structured report instead of a raw array:

```ts
import { validate } from "@domphy/doctor"

const report = validate(App)

report.ok      // false — there is at least one error-severity issue
report.issues  // Diagnostic[] — same as diagnose(App)
report.summary // { error: 1, warning: 2, info: 0, total: 3 }
```

```ts
interface ValidationReport {
  ok: boolean // true when there are no error-severity diagnostics
  issues: Diagnostic[]
  summary: { error: number; warning: number; info: number; total: number }
}
```

`ok` is false when any `error` diagnostic is present; warnings and info do not flip it. Use this as the single programmatic gate — for example fail CI when `!report.ok` — while `diagnose` / `format` remain available for raw access.

## In an AI loop

This is the point of the package. After the model generates a Domphy tree, run the doctor and return the report:

```ts
const report = format(diagnose(generatedApp))
if (report !== "✓ No issues found.") {
  // hand `report` back to the model and ask it to fix the listed issues
}
```

Most LLMs have little Domphy training data, so they learn it in-context from [`llms.txt`](/llms.txt) / [`AGENTS.md`](https://github.com/domphy/domphy/blob/main/AGENTS.md). The doctor enforces those same rules mechanically — turning "the model might get it wrong" into "the model gets told exactly what's wrong and fixes it." Wire it into your agent's task loop or CI.

## Large codebases

In a real app the model also needs to find and reuse the app's **own** building blocks, not just the framework surface. The repo ships an app-block registry generator, `apps/web/scripts/app-manifest.mjs`, which parses your app source with the TypeScript compiler API and emits one entry per exported Domphy block (function/const that returns an element tree):

```bash
node apps/web/scripts/app-manifest.mjs [srcDir] [outFile]
# defaults: srcDir = apps/web/docs/demos, outFile = apps/web/public/app-manifest.json
```

Each entry carries `{ name, kind, file, signature, jsdoc, exportKind }` — a machine-readable index an agent can browse the way `manifest.json` exposes the framework packages and `@domphy/ui` patches.

[`@domphy/mcp`](/docs/ai) wraps both halves as MCP tools so an agent gets validation **and** discovery over the wire:

| Tool | Does |
| --- | --- |
| `domphy_validate` | Runs the aggregate `validate()` on a JSON element tree, returning `{ ok, issues, summary }`. |
| `domphy_list_app_blocks` | Lists the app's own blocks (name, kind, signature, file) from `app-manifest.json`. |
| `domphy_get_app_block` | Returns one block's full source plus signature and jsdoc, by name. |

The loop becomes: list the app's blocks → reuse them → generate → `domphy_validate` → fix what it reports. The doctor is the validation half; the manifest is the discovery half.
