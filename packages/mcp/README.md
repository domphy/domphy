# @domphy/mcp

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/mcp/) · [npm](https://www.npmjs.com/package/@domphy/mcp)

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives MCP-capable AI agents (Claude Desktop, Cursor, …) first-class access to Domphy — so they can look up the real API and validate their own output instead of guessing.

## Tools

| Tool | Does |
| --- | --- |
| `domphy_list_patches` | every `@domphy/ui` patch with host tag + signature |
| `domphy_get_patch` | one patch's full contract (host tag, signature, props, example, doc, source) |
| `domphy_list_packages` | all `@domphy/*` packages with versions + descriptions |
| `domphy_rules` | the Domphy code-generation rules (`llms.txt`) to follow |
| `domphy_tones` | the valid tone names + theme color names for `themeColor()`/`dataTone` |
| `domphy_diagnose` | run [`@domphy/doctor`](https://domphy.com/docs/doctor/) on a JSON element tree and return issues to fix |
| `domphy_validate` | run the doctor's aggregate `validate()` — returns `{ ok, issues, summary }` with severity counts |
| `domphy_fix` | apply the doctor's lossless autofix — returns `{ tree, applied, report }` (only provably-safe fixes applied) |
| `domphy_list_app_blocks` | list the current app's OWN reusable Domphy blocks from its `app-manifest.json` |
| `domphy_get_app_block` | get one app block's full source + signature + jsdoc, by name |

Patch/package/rules/tones data is fetched live from `domphy.com` (always current with the latest release); `domphy_diagnose`/`domphy_validate`/`domphy_fix` run locally, and the app-block tools read the local `app-manifest.json`.

## Use

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "domphy": { "command": "npx", "args": ["-y", "@domphy/mcp"] }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{ "mcpServers": { "domphy": { "command": "npx", "args": ["-y", "@domphy/mcp"] } } }
```

Once connected, the agent can call `domphy_get_patch`/`domphy_rules` before writing code and `domphy_diagnose` after — the self-correction loop that lets it write correct Domphy despite thin training data.

Set `DOMPHY_ORIGIN` to point at a different docs origin (e.g. a preview deploy).
