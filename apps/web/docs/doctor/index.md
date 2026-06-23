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
type Severity = "error" | "warning" | "info"

interface Diagnostic {
  rule: string // "inline-typography" | "void-content" | "missing-key" | …
  severity: Severity
  path: string // "div > ul > li"
  message: string
  hint?: string
}
```

`Severity` is exported from `@domphy/doctor` as its own named type.

## Rules

| Rule | Severity | Catches |
| --- | --- | --- |
| `inline-typography` | warning | `fontSize` / `lineHeight` / `fontWeight` / `letterSpacing` / `fontFamily` / `textDecoration` literals in `style` — use a typography patch |
| `raw-theme-value` | info | a literal hex/rgb/hsl color in a color style prop (`color`, `background`, `border`, `fill`, …). The hint uses **`@domphy/palette` chromametry** (CIELAB→LCH) to suggest the nearest `themeColor()` call with perceptual coordinates |
| `raw-spacing-value` | info | a literal `rem`/`em`/`px` value in a layout spacing prop (`padding`, `paddingBlock`, `paddingInline`, `margin`, `marginBlock`, `marginInline`, `gap`, …) — suggests `themeSpacing(n)` for consistent theme density |
| `unknown-tone` | warning | a `dataTone` value that isn't valid tone grammar (`inherit` / `base` / a number / `shift-N` / `increase-N` / `decrease-N` with N ≤ 17) — catches invented words like `surface` / `text`, and out-of-range offsets like `shift-25` |
| `middle-surface-anchor` | warning | a `dataTone: "shift-N"` where N is 4–13 — a mid-ramp surface anchor causes child tones to clamp and collapse contrast; prefer edge anchors (0–3 light, 14–17 dark) |
| `unknown-density` | warning / error | a `dataDensity` value that isn't `"inherit"` / `"increase-N"` / `"decrease-N"` (N ≤ 4), or uses `shift-` (invalid for density). Error when N > 4 (out of the 5-step scale). |
| `unknown-size` | warning / error | a `dataSize` value that isn't `"inherit"` / `"increase-N"` / `"decrease-N"` (N ≤ 7), or uses `shift-` (invalid for size). Error when N > 7 (out of the 8-step scale). |
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

## fix

`fix(element, options?)` applies the **lossless** fixes automatically and reports the rest:

```ts
import { fix } from "@domphy/doctor"

const { tree, applied, report } = fix(App)
// tree    — a copy with lossless fixes applied (reactive functions preserved)
// applied — [{ rule, path, message }] describing what changed
// report  — validate(tree): the issues that still need a human/model decision
```

Only provably-lossless transforms run (currently `void-content`: a void tag cannot render children, so its content is cleared to `null`). Anything that needs intent — which key, tone, color token, or typography patch — is never guessed; it stays in `report` for the model or you to resolve. This keeps autofix safe to apply blindly in an agent loop.

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
| `domphy_list_patches` | Lists all `@domphy/ui` patches with their host tag and signature. |
| `domphy_get_patch` | Gets one patch's full contract (host tag, signature, props, example, doc, source) by name. |
| `domphy_list_packages` | Lists all `@domphy/*` packages with versions and descriptions. |
| `domphy_rules` | Gets the Domphy code-generation rules (`llms.txt`) for AI agents to follow. |
| `domphy_tones` | Gets valid tone and theme color names for `themeColor()`/`dataTone` — avoids invented tones. |
| `domphy_diagnose` | Runs `diagnose()` on a JSON element tree and returns a formatted text report (`format(diagnose(...))`), without the structured `{ ok, issues, summary }` wrapper that `validate()` adds. |
| `domphy_validate` | Runs the aggregate `validate()` on a JSON element tree, returning `{ ok, issues, summary }`. |
| `domphy_fix` | Applies the lossless autofix to a JSON element tree, returning `{ tree, applied, report }`. |
| `domphy_list_app_blocks` | Lists the app's own blocks (name, kind, signature, file) from `app-manifest.json`. |
| `domphy_get_app_block` | Returns one block's full source plus signature and jsdoc, by name. |

The loop becomes: list the app's blocks → reuse them → generate → `domphy_validate` → fix what it reports. The doctor is the validation half; the manifest is the discovery half.
