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

> Build a login form with email and password using Domphy. Use `form` + `field` patches. Validate email format on submit.

The AI will follow Domphy conventions (plain objects, `$:` for patches, no JSX) without you having to repeat them.

## Keeping context fresh

Re-fetch `llms-full.txt` after each Domphy release to pick up new patches and rule changes:

```bash
# in your project root
curl -fsSL https://www.domphy.com/llms-full.txt -o AGENTS.md
```

Or pin to a specific version via the GitHub raw URL:

```
https://raw.githubusercontent.com/domphy/domphy/v0.1.48/apps/web/public/llms-full.txt
```

## What's in the bundle

The full dump contains, in order:

1. **Critical rules** — the small set of conventions that prevent the most common AI mistakes (typography patches, form wiring, reactivity loops).
2. **Quickstart** — install, hello world, reactive state, forms.
3. **Core docs** — syntax, reactivity, lifecycle, SSR, portal, patterns, API reference.
4. **Theme docs** — palette, size, tone, API.
5. **Query docs** — `@domphy/query` queries, mutations, caching, infinite queries, SSR hydration.
6. **Table docs** — `@domphy/table` columns, row models, sorting, filtering, pagination, selection.
7. **Every patch source file** — the authoritative contract for each of the 70+ patches in `@domphy/ui`. AI reads the actual TypeScript source, not a paraphrase.

This is everything an AI needs. Nothing is hidden behind documentation it cannot reach.
