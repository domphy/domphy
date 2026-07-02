---
title: "Doctor Tools"
description: "Use domphy_diagnose, domphy_validate, and domphy_fix to check and repair Domphy element trees. Covers all rules, output shapes, and real examples."
---

# Doctor Tools

Three tools in `@domphy/mcp` run [`@domphy/doctor`](../doctor/) on element trees locally — no network needed. They form a self-correction loop: an AI agent writes a tree, validates it, fixes safe issues automatically, then addresses the rest before returning the result.

| Tool | Returns | Use when |
|---|---|---|
| `domphy_diagnose` | Formatted text (human-readable) | Quick visual check during development |
| `domphy_validate` | JSON `{ ok, issues, summary }` | Programmatic pass/fail decision |
| `domphy_fix` | JSON `{ tree, applied, report }` | Auto-fixing lossless issues then seeing what remains |

## domphy_diagnose

Pass the element tree as a **JSON string**. The tool parses it, runs every rule, and returns a formatted text report — one line per issue.

### Input

| Field | Type | Required |
|---|---|---|
| `element` | `string` | Yes — JSON of the element tree |

### Example — issue found

```json
{
  "name": "domphy_diagnose",
  "arguments": {
    "element": "{\"input\": \"type here\"}"
  }
}
```

Output:

```
✗ [void-content] input
  Void tag "input" must have null content (got string).
  → Write { input: null, … } and put attributes as sibling keys.
```

### Example — clean tree

```json
{
  "name": "domphy_diagnose",
  "arguments": {
    "element": "{\"div\": \"hello\"}"
  }
}
```

Output:

```
✓ No issues found.
```

### Example — multiple issues

```json
{
  "name": "domphy_diagnose",
  "arguments": {
    "element": "{\"div\": {\"p\": \"text\", \"style\": {\"fontSize\": \"20px\", \"color\": \"#333\"}}}"
  }
}
```

Output:

```
⚠ [inline-typography] div > p
  Inline `fontSize` — avoid inline typography styles.
  → Use a typography patch (paragraph()/heading()/small()/strong()/…) via $ so the theme owns the type scale.
i [raw-theme-value] div > p
  Inline `color` uses a literal color (#333).
  → Prefer a theme token — (l) => themeColor(l, "base", "neutral") [perceptual LCH L=20 C=0 h=0°] — so theming and dark mode apply.
```

## domphy_validate

Returns a structured JSON report suitable for programmatic use. `ok` is `false` when any `error`-severity diagnostic is present — warnings and info do not flip it.

### Output shape

```typescript
{
  ok: boolean
  issues: Array<{
    rule: string
    severity: "error" | "warning" | "info"
    path: string      // human path like "div > ul > li"
    message: string
    hint?: string
  }>
  summary: {
    error: number
    warning: number
    info: number
    total: number
  }
}
```

### Example

```json
{
  "name": "domphy_validate",
  "arguments": {
    "element": "{\"input\": \"oops\"}"
  }
}
```

Output:

```json
{
  "ok": false,
  "issues": [
    {
      "rule": "void-content",
      "severity": "error",
      "path": "input",
      "message": "Void tag \"input\" must have null content (got string).",
      "hint": "Write { input: null, … } and put attributes as sibling keys."
    }
  ],
  "summary": {
    "error": 1,
    "warning": 0,
    "info": 0,
    "total": 1
  }
}
```

## domphy_fix

Applies every **lossless** fix to a copy of the tree, then re-validates. Issues that require semantic intent (which tone to pick, which typography patch to use) are left untouched and appear in `report`.

Currently the only auto-applied fix is `void-content` — setting a void tag's content to `null`. All other rules need a human or model decision.

### Output shape

```typescript
{
  tree: unknown          // deep copy of the input with lossless fixes applied
  applied: Array<{
    rule: string
    path: string         // e.g. "div > input"
    message: string
  }>
  report: {              // validate() run on the fixed tree
    ok: boolean
    issues: Diagnostic[]
    summary: { error, warning, info, total }
  }
}
```

### Example

Input tree has a void tag with content (lossless fix) and an inline typography style (requires intent — stays in report):

```json
{
  "name": "domphy_fix",
  "arguments": {
    "element": "{\"div\": [{\"input\": \"oops\"}, {\"p\": \"text\", \"style\": {\"fontSize\": \"20px\"}}]}"
  }
}
```

Output:

```json
{
  "tree": {
    "div": [
      { "input": null },
      { "p": "text", "style": { "fontSize": "20px" } }
    ]
  },
  "applied": [
    {
      "rule": "void-content",
      "path": "div > input",
      "message": "Void tag <input> cannot have content — cleared to null."
    }
  ],
  "report": {
    "ok": true,
    "issues": [
      {
        "rule": "inline-typography",
        "severity": "warning",
        "path": "div > p",
        "message": "Inline `fontSize` — avoid inline typography styles.",
        "hint": "Use a typography patch (paragraph()/heading()/…) via $ so the theme owns the type scale."
      }
    ],
    "summary": { "error": 0, "warning": 1, "info": 0, "total": 1 }
  }
}
```

The tree's `input` is now `null`; the `p`'s inline `fontSize` is reported but not touched — changing it to a patch requires choosing which patch fits the intent.

## All rules

| Rule | Severity | What triggers it |
|---|---|---|
| `void-content` | error | A void tag (`input`, `img`, `br`, `hr`, …) has non-null content |
| `unknown-tag` | warning | The first key of an element object is not a known HTML/SVG tag |
| `inline-typography` | warning | `fontSize`, `lineHeight`, `fontWeight`, `letterSpacing`, `fontFamily`, or `textDecoration` is set inline instead of via a typography patch |
| `raw-theme-value` | info | A color-bearing style prop (`color`, `backgroundColor`, `border`, …) uses a hex, `rgb()`/`rgba()`, or `hsl()`/`hsla()` literal instead of `themeColor()` |
| `raw-spacing-value` | info | A spacing prop (`padding`, `margin`, `gap`, …) uses a literal `px`/`rem`/`em` value instead of `themeSpacing()` |
| `unknown-tone` | warning | `dataTone` is not valid grammar, or the offset `N` exceeds 17 (the ramp has 18 steps, 0–17) |
| `middle-surface-anchor` | warning | `dataTone: "shift-N"` where 4 ≤ N ≤ 13 — a mid-ramp anchor where child tones may collapse contrast |
| `unknown-density` | warning/error | `dataDensity` uses invalid grammar, `"shift-"` (which is reserved for tone), or N > 4 |
| `unknown-size` | warning/error | `dataSize` uses invalid grammar, `"shift-"`, or N > 7 |
| `missing-key` | warning | A dynamic list (reactive function returning multiple elements) has children without `_key` |
| `unstable-key` | warning | Every `_key` in a dynamic list equals its array index — index keys break on reorder |
| `duplicate-key` | error | Two siblings in a list share the same `_key` value |
| `low-opacity` | warning / info | `style.opacity` below 0.6 with no hover-restore (warning), or with a `&:hover: { opacity: '1' }` hover-reveal pattern (info) |
| `tone-background-inherit` | warning | `style.backgroundColor` resolves to a fixed shifted tone instead of `themeColor(l, "inherit")` |
| `missing-color` | warning | An element uses `themeColor()` for another style prop but has no `style.color` |
| `low-contrast` | warning | `style.color` and `style.backgroundColor` are same-family theme vars with a shift-step gap < 9 |
| `dataTone-surface-contract` | warning | `dataTone` (not `"inherit"`) is set but `style.backgroundColor` and/or `style.color` is missing |
| `color-shift-minimum` | warning | `dataTone` is set and `style.color` resolves to a theme var with shift step < 9 |

## Tips

**Pass JSON, not TypeScript.** The tools accept element trees as JSON strings. Reactive function values (`(l) => …`) are not JSON-serializable — the doctor skips those nodes when running on JSON input from an AI agent.

**Use `domphy_validate` to gate output.** An agent can call `domphy_validate` on every generated tree and refuse to return a result when `ok` is `false`. This catches structural errors before they reach the user.

**Combine fix and validate.** A typical agent loop:

1. Call `domphy_fix` — auto-corrects void-content issues.
2. Check `report.ok` on the returned report.
3. If `false`, address the remaining issues (the `report.issues` array) before finishing.
