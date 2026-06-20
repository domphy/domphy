# @domphy/mcp

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/mcp/) · [npm](https://www.npmjs.com/package/@domphy/mcp)

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives MCP-capable AI agents (Claude Desktop, Cursor, …) first-class access to Domphy — so they can look up the real API and validate their own output instead of guessing.

## Tools

| Tool | Does |
| --- | --- |
| `domphy_list_patches` | every `@domphy/ui` patch with host tag + signature |
| `domphy_get_patch` | one patch's full contract (host tag, signature, doc, source) |
| `domphy_list_packages` | all `@domphy/*` packages with versions + descriptions |
| `domphy_rules` | the Domphy code-generation rules (`llms.txt`) |
| `domphy_diagnose` | run [`@domphy/doctor`](https://domphy.com/docs/doctor/) on a JSON element tree and return issues to fix |

Patch/package data is fetched live from `domphy.com` (always current with the latest release); `domphy_diagnose` runs locally.

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
