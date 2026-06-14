# Building Domphy apps with AI

Domphy publishes two machine-readable context files so any AI assistant can generate correct Domphy code without guessing:

- **[`llms.txt`](https://www.domphy.com/llms.txt)** — curated index. Critical rules + links to every doc page and patch. Small, cheap to include in every prompt.
- **[`llms-full.txt`](https://www.domphy.com/llms-full.txt)** — one-shot full dump (~200 KB). Critical rules + quickstart + every core/theme doc + every patch source file. Use when you want the AI to have the whole framework in a single fetch.

Both files are auto-generated from the canonical docs and patch source on every release — they never drift.

## Pick the right file

| Scenario | File |
|----------|------|
| AI tool has a project-level rules file (one-time setup) | `llms-full.txt` |
| AI tool fetches docs on demand | point it at `llms.txt`, let it follow links |
| Pasting into a chat window for a single question | `llms.txt` (fits in context easily) |
| Pasting into a chat window for a multi-step build | `llms-full.txt` |

## Setup per tool

### Claude Code

Add Domphy as a project skill. Inside your project root:

```bash
mkdir -p .claude/skills/domphy
curl -fsSL https://www.domphy.com/llms-full.txt -o .claude/skills/domphy/SKILL.md
```

Then prepend this frontmatter to `SKILL.md`:

```markdown
---
name: domphy
description: Domphy UI framework — patch-based UI for native HTML. Use when code imports @domphy/*, uses ElementNode/toState/themeColor or patches like button()/card()/inputNumber(). Skip when using React/Vue/Solid/JSX.
---
```

Claude Code auto-loads the skill when it detects Domphy code in your project.

### Cursor

Save the file as a project rule:

```bash
curl -fsSL https://www.domphy.com/llms-full.txt -o .cursor/rules/domphy.mdc
```

Cursor reads `.cursor/rules/*.mdc` automatically.

### Codex / Aider / Copilot CLI

These tools read `AGENTS.md` at project root:

```bash
curl -fsSL https://www.domphy.com/llms-full.txt -o AGENTS.md
```

### ChatGPT / Gemini / claude.ai (web)

For a one-off question, paste the URL `https://www.domphy.com/llms-full.txt` into the chat — most chat UIs will fetch it. If the tool cannot fetch URLs, open the URL in a browser and paste the contents into the conversation as a system message.

For a project, save the file once and attach it to every conversation:

```bash
curl -fsSL https://www.domphy.com/llms-full.txt -o domphy-context.md
```

### GitHub Copilot (editor)

Copilot doesn't read external rules, but if you have `AGENTS.md` in the repo root, the Copilot Chat sidebar will use it as context:

```bash
curl -fsSL https://www.domphy.com/llms-full.txt -o AGENTS.md
```

## Prompt template

Once the rules file is in place, you can prompt naturally:

> Build a login form with email and password using Domphy. Use `@domphy/form` (`createForm`). Validate email format on change.

The AI will follow Domphy conventions (plain objects, `$:` for patches, no JSX) without you having to repeat them.

## Self-correcting with `@domphy/doctor`

The highest-leverage AI feature: install [`@domphy/doctor`](./doctor/) and have the agent run it on its own output, then fix what it reports.

```ts
import { diagnose, format } from "@domphy/doctor"

console.log(format(diagnose(App))) // paste the report back to the model
```

It flags the exact mistakes LLMs make — inline typography, void-tag content, missing `_key` on dynamic lists, typo tags. This is the feedback loop that closes the "little training data" gap: the model writes, the doctor checks, the model fixes. Wire it into your tool's task loop or CI.

## MCP server (`@domphy/mcp`)

For MCP-capable agents (Claude Desktop, Cursor, …), the [`@domphy/mcp`](https://www.npmjs.com/package/@domphy/mcp) server exposes Domphy as tools — no pasting required:

```json
{ "mcpServers": { "domphy": { "command": "npx", "args": ["-y", "@domphy/mcp"] } } }
```

Tools: `domphy_list_patches`, `domphy_get_patch`, `domphy_list_packages`, `domphy_rules`, and `domphy_diagnose` (runs the doctor). The agent looks up the real API before writing and validates after.

## Machine-readable manifest

[`manifest.json`](https://www.domphy.com/manifest.json) is a deterministic index of every package and every patch (name, host tag, signature, doc) — auto-generated each release. Tools and agents can query it directly instead of parsing docs.

## Keeping context fresh

Re-fetch `llms-full.txt` after each Domphy release to pick up new patches and rule changes:

```bash
# in your project root
curl -fsSL https://www.domphy.com/llms-full.txt -o AGENTS.md
```

Or pin to a tagged version via the GitHub raw URL:

```
https://raw.githubusercontent.com/domphy/domphy/<tag>/apps/web/public/llms-full.txt
```

## What's in the bundle

The full dump contains, in order:

1. **Critical rules** — the small set of conventions that prevent the most common AI mistakes (typography patches, forms via `@domphy/form`, reactivity, data-package adapters).
2. **Quickstart** — install, hello world, reactive state.
3. **Core docs** — syntax, reactivity, lifecycle, SSR, portal, patterns, API reference.
4. **Theme docs** — palette, size, tone, API.
5. **Package docs** — query, router, table, virtual, form, dnd, and app (`@domphy/*`).
6. **Every patch source file** — the authoritative contract for each patch in `@domphy/ui`. AI reads the actual TypeScript source, not a paraphrase.

Pair it with [`@domphy/doctor`](./doctor/) so the AI can verify and fix its own output.

This is everything an AI needs. Nothing is hidden behind documentation it cannot reach.
