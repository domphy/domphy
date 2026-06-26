---
title: "Client Setup"
description: "Connect @domphy/mcp to Claude Desktop, Claude Code, Cursor, and VS Code. Covers project vs global scope and the DOMPHY_ORIGIN env var."
---

# Client Setup

`@domphy/mcp` is a stdio MCP server. Any MCP-capable editor or agent host can connect to it by adding an entry to its MCP config file.

## Claude Desktop

Config file location:

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "domphy": {
      "command": "npx",
      "args": ["-y", "@domphy/mcp"]
    }
  }
}
```

Restart Claude Desktop after saving. The tools appear in the tool picker under "domphy".

## Claude Code

Claude Code supports MCP servers at two scopes.

### Project scope

Create or edit `.claude/settings.json` at the repo root:

```json
{
  "mcpServers": {
    "domphy": {
      "command": "npx",
      "args": ["-y", "@domphy/mcp"]
    }
  }
}
```

This config is committed to the repo, so every contributor gets the same Domphy context automatically.

### Global scope

Edit `~/.claude/settings.json` (macOS/Linux) or `%USERPROFILE%\.claude\settings.json` (Windows):

```json
{
  "mcpServers": {
    "domphy": {
      "command": "npx",
      "args": ["-y", "@domphy/mcp"]
    }
  }
}
```

Use global scope when you want the server available in every project without committing the config.

## Cursor

Create or edit `.cursor/mcp.json` at the repo root:

```json
{
  "mcpServers": {
    "domphy": {
      "command": "npx",
      "args": ["-y", "@domphy/mcp"]
    }
  }
}
```

Reload the Cursor window after saving (`Ctrl+Shift+P` → "Developer: Reload Window").

## VS Code

VS Code MCP support uses `.vscode/mcp.json`:

```json
{
  "servers": {
    "domphy": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@domphy/mcp"]
    }
  }
}
```

## Skipping the network on first run

`npx` downloads the package on first use. To avoid this delay, install globally first:

```bash
npm install -g @domphy/mcp
```

Then reference the binary directly:

```json
{
  "mcpServers": {
    "domphy": {
      "command": "domphy-mcp",
      "args": []
    }
  }
}
```

## Environment variables

### `DOMPHY_ORIGIN`

The server fetches live data (patches, packages, rules, tones) from `https://domphy.com` by default. Override this to point at a staging or local preview deploy:

```json
{
  "mcpServers": {
    "domphy": {
      "command": "npx",
      "args": ["-y", "@domphy/mcp"],
      "env": {
        "DOMPHY_ORIGIN": "http://localhost:5173"
      }
    }
  }
}
```

### `DOMPHY_APP_MANIFEST`

Points the server at your app's block registry file. See [App Blocks](./app-blocks.md) for the full workflow.

```json
{
  "mcpServers": {
    "domphy": {
      "command": "npx",
      "args": ["-y", "@domphy/mcp"],
      "env": {
        "DOMPHY_APP_MANIFEST": "./apps/web/public/app-manifest.json"
      }
    }
  }
}
```

## Verify the connection

Once connected, ask the agent: "List the Domphy packages." It should call `domphy_list_packages` and return a list like:

```
@domphy/core@0.17.0 — reactive core
@domphy/ui@0.17.0 — patches
@domphy/theme@0.17.0 — theme tokens
…
```

If the tool is not found, check that the config file is valid JSON and the correct path for your OS/editor, then restart the client.

## Authentication

`@domphy/mcp` does not require any API keys or tokens. The server fetches public documentation from `domphy.com` and runs the doctor locally. No credentials are needed.
