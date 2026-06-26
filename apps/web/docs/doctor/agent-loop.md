---
title: "Agent Loop"
description: "How to wire @domphy/doctor into an AI code-generation loop so the model gets mechanical feedback and self-corrects Domphy element trees."
---

# Agent Loop

The main purpose of `@domphy/doctor` is to give AI agents a mechanical feedback loop. Most LLMs have little Domphy training data and will produce violations on their first pass: inline typography, literal colors, missing `_key`, invented `dataTone` words. The doctor catches these and returns a structured text report the model can act on immediately.

## Why a separate loop step

A model generating Domphy UI code cannot introspect the framework rules reliably from training data alone. The doctor enforces the same rules as `llms.txt` / `AGENTS.md` mechanically — turning "the model might get it wrong" into "the model is told exactly what's wrong and can fix it." This collapses multi-round hallucination into a tight correction loop.

---

## Minimal loop

The simplest form: generate, diagnose, re-prompt if needed.

```ts
import { format, diagnose } from "@domphy/doctor"

async function generateAndValidate(prompt: string) {
  // Step 1: ask the model to generate a Domphy tree
  let generatedCode = await model.generate(prompt)
  let tree = evalTree(generatedCode)  // your eval/require step

  // Step 2: diagnose
  const report = format(diagnose(tree))

  if (report === "✓ No issues found.") {
    return tree  // done
  }

  // Step 3: give the report back to the model
  const corrected = await model.generate(
    `The following Domphy element tree has issues. Fix every item in the report.

${report}

Original code:
${generatedCode}`
  )

  return evalTree(corrected)
}
```

---

## Loop with autofix + remainder

Before handing the report to the model, apply `fix()` to clear lossless structural errors automatically. The model then only needs to resolve issues that require semantic intent.

```ts
import { fix, format } from "@domphy/doctor"

async function generateWithAutofix(prompt: string) {
  let code = await model.generate(prompt)
  let tree = evalTree(code)

  // Apply lossless fixes first (currently: void-content)
  const { tree: fixedTree, applied, report } = fix(tree)

  if (applied.length > 0) {
    console.log(`Auto-fixed ${applied.length} issue(s):`)
    for (const f of applied) console.log(`  [${f.rule}] ${f.path}: ${f.message}`)
  }

  if (report.ok && report.summary.warning === 0) {
    return fixedTree  // clean after autofix
  }

  // Hand only the remaining issues to the model
  const remaining = format(report.issues)
  const corrected = await model.generate(
    `Fix the following issues in your Domphy element tree:

${remaining}`
  )

  return evalTree(corrected)
}
```

---

## Full iterative loop

For a production agent loop, iterate until the report is clean or a maximum round count is reached:

```ts
import { fix, validate, format } from "@domphy/doctor"

const MAX_ROUNDS = 3

async function generateClean(prompt: string): Promise<unknown> {
  let code = await model.generate(prompt)

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const tree = evalTree(code)

    // Apply lossless fixes
    const { tree: fixedTree, report } = fix(tree)

    // Clean enough — accept
    if (report.ok && report.summary.warning === 0 && report.summary.info === 0) {
      return fixedTree
    }

    // Still has issues — format and re-prompt
    const issueText = format(report.issues)
    console.log(`Round ${round + 1} issues:\n${issueText}`)

    code = await model.generate(
      `You generated a Domphy element tree with the issues below.
` +
      `Fix every issue and return only the corrected TypeScript.

` +
      `Issues:\n${issueText}

` +
      `Your previous code:
${code}`
    )
  }

  // Return best effort after MAX_ROUNDS
  const { tree: finalTree } = fix(evalTree(code))
  return finalTree
}
```

---

## Using `validate()` as a pass/fail gate

When generating UI in a pipeline (for example a batch job generating page variants), use `validate().ok` as the gate:

```ts
import { validate, format } from "@domphy/doctor"

for (const variant of pageVariants) {
  const tree = generateTree(variant)
  const report = validate(tree)

  if (!report.ok) {
    // Errors block the pipeline
    throw new Error(
      `Generated tree for variant "${variant.name}" has errors:\n${format(report.issues)}`
    )
  }

  if (report.summary.warning > 0) {
    // Warnings are logged but do not block
    console.warn(`Variant "${variant.name}" has ${report.summary.warning} warning(s).`)
  }

  await deploy(variant.name, tree)
}
```

---

## What to include in the model prompt

For best results, give the model the framework rules before asking it to generate code. The two canonical sources:

- [`/llms.txt`](/llms.txt) — compact rules for context windows
- [`AGENTS.md`](https://github.com/domphy/domphy/blob/main/AGENTS.md) — full agent-oriented reference

A minimal system prompt pattern:

```ts
const systemPrompt = `
You are writing UI code for a Domphy application.
Domphy uses plain JavaScript objects, not JSX or React.
Every element is { tag: content, ...attributes }.

Rules:
- Use themeColor(l, tone, color) for all colors — no hex/rgb literals.
- Use themeSpacing(n) for all spacing — no px/rem/em literals.
- Use patches from @domphy/ui for typography — no inline fontSize/fontWeight.
- Dynamic list children from reactive functions must have a stable _key.
- Void tags (input, img, br) must have null content.
- dataTone values: "inherit" | "base" | "shift-N" | "increase-N" | "decrease-N" (N ≤ 17).
`
```

After generation, run the doctor and append the report to the next prompt turn:

```ts
const doctorReport = format(diagnose(tree))
if (doctorReport !== "✓ No issues found.") {
  nextPrompt += `\n\nDoctor report:\n${doctorReport}\nFix every listed issue.`
}
```

---

## MCP tools (remote agents)

[`@domphy/mcp`](/docs/ai) exposes the doctor as MCP tools so agents running over the wire (Claude, Cursor, Copilot Chat, custom tool-calling loops) can validate and fix trees without bundling `@domphy/doctor` locally.

| Tool | Returns |
| --- | --- |
| `domphy_diagnose` | `format(diagnose(tree))` — formatted text report |
| `domphy_validate` | `{ ok, issues, summary }` — structured `ValidationReport` |
| `domphy_fix` | `{ tree, applied, report }` — autofixed tree and remainder |

All three accept a JSON element tree as input. Reactive functions serialize as `null` over the wire (JSON does not carry functions), so `runReactive` is implicitly `false` for MCP calls — dynamic-list rules will not fire.

### Tool call pattern

An agent using tool-calling can validate inline:

```
User: Build a settings form with email and password fields.

Assistant: [generates tree, calls domphy_validate({ tree })]

domphy_validate response:
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

Assistant: [corrects the tree based on the report, calls domphy_fix({ tree }) to auto-apply lossless fixes]

domphy_fix response:
{
  "tree": { "div": [{ "input": null, "type": "email" }, ...] },
  "applied": [{ "rule": "void-content", "path": "div > input", "message": "..." }],
  "report": { "ok": true, "issues": [], "summary": { "error": 0, ... } }
}
```

### Discovery + validation

For agents generating code that should reuse existing app blocks, pair the doctor with `domphy_list_app_blocks` and `domphy_get_app_block`:

```
1. domphy_list_app_blocks()          — discover what's already built
2. domphy_get_app_block({ name })    — get the signature and example
3. [generate tree reusing blocks]
4. domphy_validate({ tree })         — check for violations
5. domphy_fix({ tree })              — apply lossless fixes
6. [report remaining issues to user]
```

This collapses the full agent workflow into five steps: discover → generate → validate → fix → surface remainder.

---

## Common patterns and what they produce

### Agent invents a color

```ts
// Agent generates
{ div: "Card", style: { backgroundColor: "#f0f4ff" } }

// Doctor reports
// i [raw-theme-value] div
//   Inline `backgroundColor` uses a literal color (#f0f4ff).
//   → Prefer a theme token — (l) => themeColor(l, "increase-4", "primary")
//     [perceptual LCH L=95 C=8 h=255°] — so theming and dark mode apply.

// Agent corrects
import { themeColor } from "@domphy/theme"
{ div: "Card", style: { backgroundColor: (l) => themeColor(l, "increase-4", "primary") } }
```

### Agent misuses dataTone

```ts
// Agent generates (common hallucination)
{ div: "Surface", dataTone: "surface" }
{ div: "Text", dataTone: "foreground" }

// Doctor reports
// ⚠ [unknown-tone] div
//   `dataTone` "surface" is not a valid tone.
//   → Use "inherit", "base", a number, or "shift-N"/"increase-N"/"decrease-N" with N ≤ 17.

// Agent corrects
{ div: "Surface", dataTone: "shift-1" }    // light surface
{ div: "Text", dataTone: "decrease-4" }    // dark text, relative to context
```

### Agent forgets _key

```ts
// Agent generates
import { toState } from "@domphy/core"
const list = toState(["A", "B", "C"])
{ ul: (l) => list.get(l).map(item => ({ li: item })) }

// Doctor reports
// ⚠ [missing-key] ul
//   Dynamic list child without `_key` — reordered/keyed lists need a stable
//   `_key` for correct reconcile.
//   → Add `_key: <stable id>` to each item produced by the reactive function.

// Agent corrects
{ ul: (l) => list.get(l).map((item, i) => ({ li: item, _key: i + 1 })) }
```
