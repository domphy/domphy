---
title: "Configuration & API"
description: "How to configure @domphy/doctor, choose between diagnose/validate/fix, wire it into CI, and interpret the output structures."
---

# Configuration & API

This page covers the full programmatic surface of `@domphy/doctor`: when to use each entry point, how to configure analysis, and how to integrate the doctor into build pipelines and test suites.

## Entry Points

The package exposes three entry points, each suited to a different use case.

### `diagnose(element, options?)` — raw array

Returns a flat `Diagnostic[]`. Use this when you want to process results yourself — filter by severity, count by rule, or pipe into a custom formatter.

```ts
import { diagnose } from "@domphy/doctor"

const issues = diagnose(MyApp)

const errors = issues.filter(d => d.severity === "error")
const byRule = issues.reduce((acc, d) => {
  acc[d.rule] = (acc[d.rule] ?? 0) + 1
  return acc
}, {} as Record<string, number>)
```

### `validate(element, options?)` — structured report

Runs the same rules as `diagnose` but wraps the result in a `ValidationReport` with a pass/fail flag and severity counts. This is the recommended entry point for CI and programmatic gates.

```ts
import { validate } from "@domphy/doctor"

const report = validate(MyApp)

report.ok      // false when any error-severity issue is present
report.issues  // Diagnostic[] — same as diagnose()
report.summary // { error: 1, warning: 2, info: 0, total: 3 }
```

`ok` is `false` only when `summary.error > 0`. Warnings and info do not flip `ok`.

### `fix(element, options?)` — autofix + remainder

Applies every **lossless** fix to a deep copy of the tree and runs `validate()` on the result. Use this as the first step in an automated correction loop: apply what can be fixed automatically, then hand the remaining report to a human or model.

```ts
import { fix } from "@domphy/doctor"

const { tree, applied, report } = fix(MyApp)

// tree    — a copy with lossless fixes applied (reactive functions preserved)
// applied — [{ rule, path, message }] listing what changed
// report  — validate(tree): the issues that still need manual resolution
```

Currently only `void-content` has a lossless fix (clearing the tag value to `null`). All other rules require semantic intent the tree does not carry — the correct `_key`, which tone, which typography patch — so they remain in `report`.

---

## Options

### `DiagnoseOptions`

Both `diagnose()` and `validate()` (and `fix()`, which calls `validate()` internally) accept a `DiagnoseOptions` object as the second argument.

```ts
interface DiagnoseOptions {
  /**
   * Invoke reactive content functions `(listener) => …` with a no-op listener
   * to inspect their output. This is how `missing-key`, `unstable-key`, and
   * `duplicate-key` inside dynamic lists are found.
   *
   * Default: true
   * Set to false if your reactive functions have side effects.
   */
  runReactive?: boolean
}
```

#### `runReactive: true` (default)

The doctor calls each reactive function `(l) => …` with a no-op listener to inspect its output. This is safe for pure reactive functions — those that only read state and return an element tree.

```ts
import { toState } from "@domphy/core"
import { diagnose } from "@domphy/doctor"

const items = toState(["A", "B", "C"])

// The reactive function is invoked with a no-op listener.
// The doctor sees the returned list and can check for _key.
const issues = diagnose({
  ul: (l) => items.get(l).map(text => ({ li: text }))
})
// -> includes missing-key warning
```

#### `runReactive: false`

Pass `{ runReactive: false }` when reactive functions read from the DOM, dispatch events, start timers, or have any other side effect you do not want triggered during analysis.

```ts
const issues = diagnose(MyApp, { runReactive: false })
// dynamic-list rules (missing-key, unstable-key) won't fire;
// duplicate-key and all structural rules still run on static content.
```

---

## Output Structures

### `Diagnostic`

```ts
type Severity = "error" | "warning" | "info"

interface Diagnostic {
  rule: string     // e.g. "inline-typography"
  severity: Severity
  path: string     // human path to the node, e.g. "div > ul > li"
  message: string  // one-line description of the problem
  hint?: string    // how to fix it
}
```

### `ValidationReport`

```ts
interface ValidationReport {
  ok: boolean      // false when summary.error > 0
  issues: Diagnostic[]
  summary: {
    error: number
    warning: number
    info: number
    total: number
  }
}
```

### `FixResult`

```ts
interface FixResult {
  tree: unknown          // deep copy with lossless fixes applied
  applied: AppliedFix[]  // what changed
  report: ValidationReport // validate() on the fixed tree
}

interface AppliedFix {
  rule: string
  path: string
  message: string
}
```

---

## `format()` — human-readable output

`format(diagnostics)` converts a `Diagnostic[]` into a readable multi-line string. Pass it the output of `diagnose()` or `report.issues`.

```ts
import { diagnose, format } from "@domphy/doctor"

const output = format(diagnose(MyApp))
console.log(output)
```

Output format:

```
⚠ [inline-typography] div > p
  Inline `fontSize` — avoid inline typography styles.
  → Use a typography patch (paragraph()/heading()/…) via $ so the theme owns the type scale.
i [raw-theme-value] div > span
  Inline `color` uses a literal color (#ff0000).
  → Prefer a theme token — (l) => themeColor(l, "decrease-4", "error") …
✗ [void-content] div > input
  Void tag "input" must have null content (got string).
  → Write { input: null, … } and put attributes as sibling keys.
```

Severity icons:
- `✗` — error
- `⚠` — warning
- `i` — info

When there are no issues: `"✓ No issues found."`

```ts
if (format(diagnose(MyApp)) !== "✓ No issues found.") {
  // there are issues
}
```

---

## CI Integration

### Failing the build on errors

Use `validate()` as the programmatic gate. Only `error`-severity issues fail the build; warnings and info are surfaced but do not block.

```ts
// scripts/lint-ui.ts
import { validate, format } from "@domphy/doctor"
import { MyApp } from "../src/app"

const report = validate(MyApp)

if (report.summary.total > 0) {
  console.log(format(report.issues))
}

if (!report.ok) {
  console.error(`\n${report.summary.error} error(s) — build blocked.`)
  process.exit(1)
}
```

```json
// package.json
{
  "scripts": {
    "lint:ui": "tsx scripts/lint-ui.ts",
    "ci": "tsc --noEmit && vitest run && npm run lint:ui"
  }
}
```

### Warnings as a quality gate

To also block on warnings (stricter mode):

```ts
if (report.summary.error > 0 || report.summary.warning > 0) {
  console.log(format(report.issues))
  process.exit(1)
}
```

### Filtering by rule

```ts
const themeIssues = report.issues.filter(d =>
  d.rule === "raw-theme-value" || d.rule === "raw-spacing-value"
)

if (themeIssues.length > 0) {
  console.warn("Theme token gaps found:", themeIssues.length)
}
```

### Filtering by severity

```ts
const errors = report.issues.filter(d => d.severity === "error")
const structural = errors.filter(d =>
  d.rule === "void-content" || d.rule === "duplicate-key"
)
```

---

## Running on multiple trees

For a codebase with several top-level views, collect diagnostics from each and merge:

```ts
import { diagnose, format, validate } from "@domphy/doctor"
import { HomePage } from "../src/pages/home"
import { SettingsPage } from "../src/pages/settings"
import { DashboardPage } from "../src/pages/dashboard"

const pages = [
  { name: "home", tree: HomePage },
  { name: "settings", tree: SettingsPage },
  { name: "dashboard", tree: DashboardPage },
]

let hasErrors = false

for (const { name, tree } of pages) {
  const report = validate(tree)
  if (report.summary.total > 0) {
    console.log(`\n--- ${name} ---`)
    console.log(format(report.issues))
  }
  if (!report.ok) hasErrors = true
}

if (hasErrors) process.exit(1)
```

---

## Side-effect-free reactive functions

For best results, keep reactive functions pure — they should only read from state, not write to it, start timers, or dispatch events. The doctor calls them with a no-op listener; any subscription the function registers during that call is immediately discarded.

```ts
import { toState } from "@domphy/core"

const tasks = toState<Task[]>([])

// Fine — pure read; doctor can inspect the list
{
  ul: (l) => tasks.get(l).map(task => ({
    li: task.title,
    _key: task.id,
  }))
}

// Problematic — side effect inside reactive function
// Pass { runReactive: false } if you have this pattern
{
  div: (l) => {
    trackPageView()  // side effect — do not put this inside the reactive function
    return content.get(l)
  }
}
```
