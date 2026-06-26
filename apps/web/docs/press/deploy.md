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

Layout element styles come from Domphy's `generateCSS()` via inline `style:{}` on each element — no class-targeted CSS strings for layout. To customize:

- **Slot override** — replace a layout region with a custom Domphy element using `themeConfig.slots` (recommended — stays in `generateCSS()`).
- **Extra global CSS** — inject a `<style>` block via `config.head`.
- **Theme tokens** — use `themeColor`/`themeSpacing` from `@domphy/theme`; they return CSS variable references so dark mode works automatically.

See [Customization](/docs/press/customization) for full examples.
