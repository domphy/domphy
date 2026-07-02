# apps/web

This app is the Domphy documentation website, built with **DomphyPress**
(`@domphy/press`, `packages/press/`) — a static-site generator that runs on
`@domphy/app` + `@domphy/markdown` (it replaced VitePress).

- `pnpm build` — the real production build (`build.press.ts`): rebuilds every
  `@domphy/*` package, regenerates the manifests/llms-full.txt, then renders
  `apps/web/index.md` + `apps/web/docs` to `.vitepress/dist` (the existing
  deploy path) with the search index and islands bundle. `pnpm preview`
  serves that output on `:4173`.
- `pnpm dev` — a fast content-only preview: runs the generic `domphy-press
  dev` CLI directly against `apps/web/docs` (port 3000, live rebuild on
  Markdown/TS changes). It does **not** replicate `build.press.ts`'s custom
  handling of the root `index.md` home page, search index, or islands bundle
  — use it for iterating on docs layout/content, but verify anything
  routing-, search-, or island-related against `pnpm build && pnpm preview`.

It contains two main parts:

- docs pages in `apps/web/docs`
- live demos and preview/editor helpers used by those docs (hydrated as Domphy islands)

The docs are not static text only. Many pages render real `@domphy/core`, `@domphy/theme`, and `@domphy/ui` examples directly inside the site, so documentation and manual testing happen in the same place.

In practice:

- guide pages explain the model and API
- demo files under `apps/web/docs/demos` provide runnable examples
- preview and editor components load those examples into interactive docs pages
