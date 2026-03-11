# Domphy

Domphy is a patch-based UI system for the web.

It is split into 3 packages:

- `@domphy/core` - rendering, reactivity, SSR, and CSS-in-JS runtime
- `@domphy/theme` - context-aware color, size, and spacing
- `@domphy/ui` - ready-made patches built on top of core and theme

Package sizes on the docs site are described as:

- `@domphy/core` - `30kb` minified
- `@domphy/theme` - `8kb` minified
- `@domphy/ui` - `80kb` minified

In rough ecosystem terms:

- `@domphy/core` is the runtime layer, comparable to `react-dom` + SSR rendering + CSS-in-JS in one package
- `@domphy/theme` and `@domphy/ui` together are the design-system layer, comparable to what many teams expect from MUI

## Documentation

Full documentation: [domphy.com](https://www.domphy.com)

- [Core docs](https://www.domphy.com/docs/core/)
- [Theme docs](https://www.domphy.com/docs/theme/)
- [UI docs](https://www.domphy.com/docs/ui/)
- [Integrations](https://www.domphy.com/docs/integrations/)

## Install

Most apps can start with:

```bash
npm install @domphy/ui
```

Or install packages separately:

```bash
npm install @domphy/core
npm install @domphy/theme
npm install @domphy/ui
```

## Monorepo

- `packages/core` - `@domphy/core`
- `packages/theme` - `@domphy/theme`
- `packages/ui` - `@domphy/ui`
- `apps/web` - docs website and demos
