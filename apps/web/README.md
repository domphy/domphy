# apps/web

This app is the Domphy documentation website, built with **DomphyPress**
(`@domphy/press`, `packages/press/`) — a static-site generator that runs on
`@domphy/app` + `@domphy/press` (it replaced VitePress).

- `pnpm build` — the real production build (`build.press.ts`): rebuilds every
  `@domphy/*` package, regenerates the manifests/llms-full.txt, then renders
  `apps/web/index.md` + `apps/web/docs` to `.vitepress/dist` (the existing
  deploy path) with the search index and islands bundle. `pnpm preview`
  serves that output on `:4173`.
- `pnpm dev` — `tsx build.press.ts --watch --port 3000`. Same island path as
  production: `runDev()` runs the full `build.press.ts` pipeline (home
  `index.md`, docs, search index, islands bundle) then `startDevServer` on
  port 3000, watching `docs/`, root `index.md`, and `islands-runtime.ts`.
  It is **not** the generic `domphy-press dev` CLI.

It contains two main parts:

- docs pages in `apps/web/docs`
- live demos and preview/editor helpers used by those docs (hydrated as Domphy islands)

The docs are not static text only. Many pages render real `@domphy/core`, `@domphy/theme`, and `@domphy/ui` examples directly inside the site, so documentation and manual testing happen in the same place.

In practice:

- guide pages explain the model and API
- demo files under `apps/web/docs/demos` provide runnable examples
- preview and editor components load those examples into interactive docs pages
