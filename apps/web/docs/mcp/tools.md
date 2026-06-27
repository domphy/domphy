---
title: "Tools Reference"
description: "Full reference for all 10 @domphy/mcp tools."
---

# Tools Reference

All tools communicate via the [MCP protocol](https://modelcontextprotocol.io/). They are automatically discovered after configuring the server in any MCP-compatible client.

## domphy_list_patches

List every `@domphy/ui` patch with its host tag and signature.

**Input:** none

**Output:** Newline-separated text — one entry per patch:
```
button <button> — button(props?: ButtonOptions)
card <article> — card(props?: CardOptions)
…
```

---

## domphy_get_patch

Get one patch's full contract: host tag, signature, props, example, jsdoc, and source.

**Input:**

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Patch name, e.g. `"button"` |

**Output:** JSON string with fields `{ name, hostTag, signature, props, doc, example, source }`.

---

## domphy_list_packages

List all `@domphy/*` packages with versions and descriptions.

**Input:** none

**Output:** Newline-separated text — one entry per package:
```
@domphy/core@0.19.0 — reactive core
@domphy/ui@0.19.0 — patches
…
```

---

## domphy_rules

Get the Domphy code-generation rules (`llms.txt`) — the complete guide for writing correct Domphy code.

**Input:** none

**Output:** string (full llms.txt content)

---

## domphy_tones

Get the valid tone names and theme color names for `themeColor()` and `dataTone`. Use this to avoid inventing tones like `"surface"` or `"text"` that don't exist.

**Input:** none

**Output:** `{ tones: string[], families: string[] }`

---

## domphy_diagnose

Run `@domphy/doctor` on a JSON Domphy element tree and return issues to fix.

Detected issues include: `inline-typography`, `void-content`, `unknown-tag`, missing/duplicate/unstable `_key`, and more.

**Input:**

| Field | Type | Description |
|---|---|---|
| `element` | `string` | JSON of the Domphy element tree |

**Output:** Array of `{ rule, path, message, severity }`.

---

## domphy_validate

Run `@domphy/doctor`'s aggregate `validate()` on a JSON element tree.

**Input:**

| Field | Type | Description |
|---|---|---|
| `element` | `string` | JSON of the Domphy element tree |

**Output:** `{ ok: boolean, issues: Issue[], summary: { error, warning, info } }`

---

## domphy_fix

Apply `@domphy/doctor`'s lossless autofix to a JSON element tree. Only provably-safe fixes are applied (e.g. `void-content`).

**Input:**

| Field | Type | Description |
|---|---|---|
| `element` | `string` | JSON of the Domphy element tree |

**Output:** `{ tree: AnyElement, applied: string[], report: Issue[] }`

---

## domphy_list_app_blocks

List the current app's reusable Domphy blocks from its `app-manifest.json` (name, kind, signature, file).

Run `scripts/app-manifest.mjs` first if `app-manifest.json` is absent.

**Input:** none

**Output:** Newline-separated text — one entry per block:
```
Hero [block] — Hero: DomphyElement<"section">  (src/blocks/hero.ts)
Card [patch] — Card(props: { title: string }): DomphyElement<"article">  (src/blocks/card.ts)
```

---

## domphy_get_app_block

Get one app block's full source, signature, and jsdoc by name.

**Input:**

| Field | Type | Description |
|---|---|---|
| `name` | `string` | App block name, e.g. `"App"` |

**Output:** JSON string with fields `{ name, kind, file, signature, jsdoc, exportKind, source }`.
