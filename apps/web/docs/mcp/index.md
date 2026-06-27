---
title: "@domphy/mcp"
description: "MCP server exposing Domphy knowledge to AI assistants — patches, packages, rules, doctor, and app blocks."
---

# @domphy/mcp

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that exposes Domphy's knowledge base to AI assistants. Connect it to Cursor, VS Code, or any MCP-compatible tool to get accurate Domphy context without hallucination.

## What it gives AI assistants

- **Patch catalog** — full API of every `@domphy/ui` patch (host tag, props, style contract)
- **Package map** — all packages, their purpose, and when to use them
- **Rules** — the complete AGENTS.md rule set (tone model, doctor rules, naming conventions)
- **Doctor integration** — validate and fix Domphy element trees live
- **App block registry** — layout patterns from `@domphy/app`

## Installation

```bash
npm install -g @domphy/mcp
# or run directly:
npx @domphy/mcp
```

## Connect your MCP client

Add to your MCP client's config (see [Client Setup](./client-setup.md) for per-editor paths):

```json
{
  "mcpServers": {
    "domphy": {
      "command": "npx",
      "args": ["@domphy/mcp"]
    }
  }
}
```

## Tools reference

See the [Tools Reference](./tools.md) for all 10 tools with full input/output schemas.
