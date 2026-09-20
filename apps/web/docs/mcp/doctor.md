---
title: "Doctor Tools"
description: "Use domphy_diagnose, domphy_validate, and domphy_fix to check and repair Domphy element trees."
---

# Doctor Tools

Three tools in `@domphy/mcp` run [`@domphy/doctor`](../doctor/) on element trees locally — no network needed. They form a self-correction loop: an AI agent writes a tree, validates it, fixes safe issues automatically, then addresses the rest before returning the result.

Input/output schemas: [Tools Reference](./tools.md#domphy_diagnose). Rule catalog: [Doctor](/docs/doctor/#rules).

| Tool | Returns | Use when |
|---|---|---|
| `domphy_diagnose` | Formatted text (human-readable) | Quick visual check during development |
| `domphy_validate` | JSON `{ ok, issues, summary }` | Programmatic pass/fail decision |
| `domphy_fix` | JSON `{ tree, applied, report }` | Auto-fixing lossless issues then seeing what remains |

Pass the element tree as a **JSON string**. Reactive function values (`(l) => …`) are not JSON-serializable — the doctor skips those nodes on JSON input from an AI agent.

## Examples

### Issue found (`domphy_diagnose`)

```json
{
  "name": "domphy_diagnose",
  "arguments": {
    "element": "{\"input\": \"type here\"}"
  }
}
```

```
✗ [void-content] input
  Void tag "input" must have null content (got string).
  → Write { input: null, … } and put attributes as sibling keys.
```

Clean tree returns `✓ No issues found.`

### Multiple issues

```json
{
  "name": "domphy_diagnose",
  "arguments": {
    "element": "{\"div\": {\"p\": \"text\", \"style\": {\"fontSize\": \"20px\", \"color\": \"#333\"}}}"
  }
}
```

```
⚠ [inline-typography] div > p
  Inline `fontSize` — avoid inline typography styles.
  → Use a typography patch (paragraph()/heading()/small()/strong()/…) via $ so the theme owns the type scale.
i [raw-theme-value] div > p
  Inline `color` uses a literal color (#333).
  → Prefer a theme token — (l) => themeColor(l, "base", "neutral") [perceptual LCH L=20 C=0 h=0°] — so theming and dark mode apply.
```

### Pass/fail (`domphy_validate`)

`ok` is `false` when any `error`-severity diagnostic is present — warnings and info do not flip it.

```json
{
  "name": "domphy_validate",
  "arguments": {
    "element": "{\"input\": \"oops\"}"
  }
}
```

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
  "summary": { "error": 1, "warning": 0, "info": 0, "total": 1 }
}
```

### Auto-fix then report (`domphy_fix`)

Applies every **lossless** fix to a copy of the tree, then re-validates. Currently the only auto-applied fix is `void-content` (void tag content → `null`). Issues that need semantic intent (which tone, which typography patch) stay in `report`.

```json
{
  "name": "domphy_fix",
  "arguments": {
    "element": "{\"div\": [{\"input\": \"oops\"}, {\"p\": \"text\", \"style\": {\"fontSize\": \"20px\"}}]}"
  }
}
```

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

The tree's `input` is now `null`; the `p`'s inline `fontSize` is reported but not touched.

## Agent loop

1. Call `domphy_fix` — auto-corrects void-content issues.
2. Check `report.ok` on the returned report (or call `domphy_validate` and check `ok`).
3. If `false`, address the remaining `report.issues` before finishing.

Refuse to return a result when `ok` is `false` — that catches structural errors before they reach the user.
