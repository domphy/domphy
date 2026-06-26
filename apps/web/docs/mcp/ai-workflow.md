---
title: "AI Workflow"
description: "How AI agents should compose the 10 @domphy/mcp tools into a reliable write-and-verify loop for generating correct Domphy code."
---

# AI Workflow

`@domphy/mcp` is designed around one insight: AI models have thin training data for Domphy, so they hallucinate patches, invent tone names, and write inline styles instead of theme tokens. The tools give agents a live feedback loop — look up the real API before writing, validate the output after.

This page describes how to compose the 10 tools into a reliable coding workflow.

## The five-step loop

```
1. domphy_rules          ← load the code-generation rules once per session
2. domphy_get_patch       ← look up any patch you plan to use
3. domphy_tones           ← check valid tone names before calling themeColor()
4. domphy_validate        ← validate the generated tree
5. domphy_fix             ← auto-fix lossless issues; address the remainder
```

This loop catches errors that would otherwise reach the user silently.

### Step 1 — Load the rules

At the start of any Domphy coding task, the agent calls `domphy_rules` to retrieve the full `llms.txt` code-generation guide. This file is the single authoritative source for:

- element syntax (`{ tag: content, style: {}, … }`)
- reactivity patterns (`toState`, `computed`, `effect`, listener parameter `l`)
- which things are patches vs. raw elements
- naming conventions (`_key`, `_portal`, `_context`)
- what the doctor rules mean

```json
{ "name": "domphy_rules", "arguments": {} }
```

The rules are fetched live from `domphy.com` so they always match the installed package version.

### Step 2 — Look up patches before using them

Before writing `button(...)` or `card(...)`, the agent should look up the patch's actual signature and props:

```json
{
  "name": "domphy_get_patch",
  "arguments": { "name": "button" }
}
```

The returned object includes:

```json
{
  "name": "button",
  "hostTag": "button",
  "signature": "button(props?: { color?: ThemeColor })",
  "props": [
    { "name": "color", "type": "ThemeColor", "optional": true, "doc": "Theme color family." }
  ],
  "doc": "A themed button.",
  "example": "{ button: \"Click me\", $: button() }",
  "source": "packages/ui/src/patches/button.ts"
}
```

Without this step, an agent that has not seen a recent Domphy snapshot will invent a plausible but wrong signature — wrong prop names, wrong host tag, or calling a patch that does not exist.

To discover what patches are available, call `domphy_list_patches` first:

```json
{ "name": "domphy_list_patches", "arguments": {} }
```

Output lists every patch with its host tag and signature:

```
button <button> — button(props?: { color?: ThemeColor })
card <article> — card(props?: { color?: ThemeColor })
inputText <input> — inputText(props?: { … })
…
```

### Step 3 — Check tones before calling themeColor()

`themeColor(l, tone, colorFamily)` only accepts valid tones. Inventing a tone name like `"surface"` or `"text"` silently produces the wrong color. Before using `themeColor()`, call:

```json
{ "name": "domphy_tones", "arguments": {} }
```

The response is the raw JSON from `tones.json` — a list of valid tone identifiers (e.g. `"base"`, `"inherit"`, `"shift-0"` through `"shift-17"`, `"increase-N"`, `"decrease-N"`) and the available color family names (`"primary"`, `"neutral"`, `"error"`, `"warning"`, `"success"`, …).

### Step 4 — Validate the generated tree

After generating a tree, run it through `domphy_validate` before returning it:

```json
{
  "name": "domphy_validate",
  "arguments": {
    "element": "{\"div\": {\"input\": \"search here\"}}"
  }
}
```

Check `ok` in the response. If `ok` is `false`, there are `error`-severity issues that must be fixed:

```json
{
  "ok": false,
  "issues": [
    {
      "rule": "void-content",
      "severity": "error",
      "path": "div > input",
      "message": "Void tag \"input\" must have null content (got string).",
      "hint": "Write { input: null, … } and put attributes as sibling keys."
    }
  ],
  "summary": { "error": 1, "warning": 0, "info": 0, "total": 1 }
}
```

### Step 5 — Fix and address remaining issues

Call `domphy_fix` on the same tree. It applies every lossless fix (currently `void-content`) and returns what remains:

```json
{
  "name": "domphy_fix",
  "arguments": {
    "element": "{\"div\": {\"input\": \"search here\"}}"
  }
}
```

Response:

```json
{
  "tree": { "div": { "input": null } },
  "applied": [
    {
      "rule": "void-content",
      "path": "div > input",
      "message": "Void tag <input> cannot have content — cleared to null."
    }
  ],
  "report": { "ok": true, "issues": [], "summary": { "error": 0, "warning": 0, "info": 0, "total": 0 } }
}
```

Use `tree` from the response as the corrected starting point, then address any remaining issues in `report.issues` (those require intent — a model decision, not an automatic fix).

## Discover your app's existing blocks

Before writing a new block, check whether your app already has one that fits:

```json
{ "name": "domphy_list_app_blocks", "arguments": {} }
```

If you find a match, fetch its full source to understand its signature and reuse it:

```json
{
  "name": "domphy_get_app_block",
  "arguments": { "name": "Hero" }
}
```

See [App Blocks](./app-blocks.md) for how to generate the `app-manifest.json` file that powers these tools.

## Full example interaction

Here is the complete sequence an agent follows to generate a themed card section:

**1. Load rules**
```json
{ "name": "domphy_rules", "arguments": {} }
```

**2. Check available patches**
```json
{ "name": "domphy_list_patches", "arguments": {} }
```

**3. Get the card patch signature**
```json
{ "name": "domphy_get_patch", "arguments": { "name": "card" } }
```

**4. Check valid tone names**
```json
{ "name": "domphy_tones", "arguments": {} }
```

**5. Generate the tree, then validate**
```json
{
  "name": "domphy_validate",
  "arguments": {
    "element": "{\"section\": [{\"article\": \"...\", \"$\": \"card()\"}], \"dataTone\": \"shift-2\"}"
  }
}
```

**6. Fix any lossless issues**
```json
{
  "name": "domphy_fix",
  "arguments": { "element": "…" }
}
```

**7. Return the verified tree to the user.**

## Why not skip validation?

Without the validate/fix loop:

- `{ input: "placeholder text" }` renders nothing — void tags ignore content silently in some environments.
- `themeColor(l, "surface", "primary")` picks the wrong color — `"surface"` is not a tone.
- Inline `fontSize: "16px"` bypasses the theme's type scale — dark mode, density scaling, and custom themes all break.

The doctor catches all of these. Running it adds one extra tool call and prevents an entire class of silent bugs from reaching the user.
