---
title: "Deploying"
description: "Deploy @domphy/press sites to Vercel, Netlify, and other platforms."
---

# Deploying

## CLI

```bash
# Build
npx domphy-press build

# Preview the build locally
npx domphy-press preview

# Dev server with live reload
npx domphy-press dev
```

Or via the programmatic API:

```ts
import { buildSite } from "@domphy/press"
import { config } from "./press.config.js"

await buildSite({ config, srcDir: config.srcDir, outDir: config.outDir })
```

## Vercel

Add a `vercel.json`:

```json
{
  "buildCommand": "domphy-press build",
  "outputDirectory": "dist"
}
```

Or set the **Output Directory** to `dist` in the Vercel project settings.

## Netlify

`netlify.toml`:

```toml
[build]
  command = "domphy-press build"
  publish = "dist"
```

## GitHub Pages

`.github/workflows/deploy.yml`:

```yaml
- name: Build
  run: npx domphy-press build

- name: Deploy
  uses: peaceiris/actions-gh-pages@v3
  with:
    publish_dir: ./dist
```

Set `base` in `press.config.ts` to your repo name (e.g. `"/my-repo/"`).

## Custom CSS

Override or extend the default theme CSS via `pressCSS`:

```ts
import { pressCSS } from "@domphy/press"

const customCss = pressCSS() + `
  .dp-header { background: hotpink; }
`
```

Pass `customCss` to your custom build script's HTML document function.
