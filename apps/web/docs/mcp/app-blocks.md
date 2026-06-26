---
title: "App Blocks"
description: "Generate app-manifest.json so AI agents can discover and reuse your app's own Domphy blocks and patches alongside the framework's built-in ones."
---

# App Blocks

The framework ships a manifest of its own patches (`@domphy/ui`) and packages. Your app has its own reusable Domphy building blocks — exported element constants and factory functions. The `domphy_list_app_blocks` and `domphy_get_app_block` tools expose those to AI agents, so they can reference your existing blocks instead of inventing duplicate code.

## What gets indexed

A **block** is an exported TypeScript constant whose value is a Domphy element tree:

```ts
// src/blocks/hero.ts
export const Hero: DomphyElement<"section"> = {
  section: { h1: "Welcome" }
}
```

A **patch** is an exported factory that takes props and returns an element:

```ts
// src/blocks/card.ts
/** A card with a title and body. */
export const Card = (props: { title: string; body: string }): DomphyElement<"article"> => ({
  article: [
    { h2: props.title },
    { p: props.body }
  ]
})
```

The scanner detects both forms using TypeScript type annotations (`DomphyElement`, `PartialElement`) and structural heuristics (an object literal whose first key is a known HTML tag).

## Generate app-manifest.json

Run the bundled script from the repo root:

```bash
node apps/web/scripts/app-manifest.mjs [srcDir] [outFile]
```

| Argument | Default |
|---|---|
| `srcDir` | `apps/web/docs/demos` |
| `outFile` | `apps/web/public/app-manifest.json` |

Example — scan your app's source and write to a custom path:

```bash
node apps/web/scripts/app-manifest.mjs src/blocks public/app-manifest.json
```

The script outputs a summary:

```
wrote public/app-manifest.json (12 blocks from 8 files: 5 block, 7 patch)
```

The manifest is a JSON array:

```json
[
  {
    "name": "Hero",
    "kind": "block",
    "file": "src/blocks/hero.ts",
    "signature": "Hero: DomphyElement<\"section\">",
    "jsdoc": "",
    "exportKind": "named"
  },
  {
    "name": "Card",
    "kind": "patch",
    "file": "src/blocks/card.ts",
    "signature": "Card(props: { title: string; body: string }): DomphyElement<\"article\">",
    "jsdoc": "A card with a title and body.",
    "exportKind": "named"
  }
]
```

## Point the server at the manifest

Set `DOMPHY_APP_MANIFEST` in your MCP client config to the manifest file's path:

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

The path is resolved relative to the process working directory (the repo root when launched by most editors). You can also use an absolute path.

If `DOMPHY_APP_MANIFEST` is not set, the server defaults to `./app-manifest.json` in the working directory.

## domphy_list_app_blocks

Lists every block and patch in the manifest with its kind, signature, and file.

**Input:** none

**Output:**

```
Hero [block] — Hero: DomphyElement<"section">  (src/blocks/hero.ts)
Card [patch] — Card(props: { title: string; body: string }): DomphyElement<"article">  (src/blocks/card.ts)
```

If the manifest file is absent:

```
No app-manifest found at "./app-manifest.json". Generate it with
`node apps/web/scripts/app-manifest.mjs <srcDir> <outFile>` and point
DOMPHY_APP_MANIFEST at the output (default ./app-manifest.json).
```

## domphy_get_app_block

Returns one block's full source file alongside its signature and jsdoc.

**Input:**

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Block name, e.g. `"Card"` |

**Output:**

```json
{
  "name": "Card",
  "kind": "patch",
  "file": "src/blocks/card.ts",
  "signature": "Card(props: { title: string; body: string }): DomphyElement<\"article\">",
  "jsdoc": "A card with a title and body.",
  "exportKind": "named",
  "source": "import type { DomphyElement } from \"@domphy/core\"\n\n/** A card with a title and body. */\nexport const Card = ..."
}
```

If the name is not found, the tool suggests near matches:

```
No app block named "Crd". Did you mean: Card?
```

The `source` field contains the full content of the file the block is declared in. If the file cannot be read (e.g. a path that moved since the manifest was generated), `source` contains an error note but all other fields are still present.

## Keeping the manifest fresh

Re-run the script whenever you add, rename, or remove exported blocks. A common pattern is to add it as a pre-dev hook or pre-commit step:

```json
{
  "scripts": {
    "manifest": "node apps/web/scripts/app-manifest.mjs src/blocks public/app-manifest.json",
    "dev": "npm run manifest && vite"
  }
}
```

## How the source path is resolved

The manifest stores repo-relative paths (e.g. `src/blocks/card.ts`). When `domphy_get_app_block` reads the source file, it tries three candidate paths in order:

1. `<manifestDir>/../../../<file>` — the default layout where the manifest lives at `apps/web/public/`
2. `<cwd>/<file>` — relative to the working directory
3. `<manifestDir>/<file>` — relative to the manifest itself

This means the server can read sources correctly whether the manifest is in `apps/web/public/`, the repo root, or any custom location.
