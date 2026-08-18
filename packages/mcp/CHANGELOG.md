# @domphy/mcp

## 0.19.3

- `readBlockSource` resolves block files only against the configured manifest directory and `process.cwd()`. The implicit three-levels-up repo root is no longer a containment root — a path without `..` that only exists under a parent of the manifest is refused.
- `handleToolCall` sets `isError: true` when `domphy_diagnose` / `domphy_validate` / `domphy_fix` return a JSON parse or doctor-crash failure string.

## 0.19.2

- `domphy_tones` tool description updated: `@domphy/theme`'s new semantic tone aliases (`surface`, `hover`, `border`, `border-strong`, `muted`, `text`) are now valid and recommended over raw `shift-N` — the description no longer tells agents to avoid them.
- `SERVER_VERSION` synced with package.json (`0.19.2`).

## 0.10.0

- Initial release: stdio MCP server (`domphy-mcp`) exposing tools to list/get patches and packages, fetch the code-generation rules, and run `@domphy/doctor` on a JSON element tree.
