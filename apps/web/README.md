# apps/web

This app is the Domphy documentation website, built with **DomphyPress** — an
in-repo static-site generator (`apps/web/domphypress/`) that runs on `@domphy/app`
+ `@domphy/markdown` (it replaced VitePress). `pnpm build` renders `apps/web/docs`
to `.vitepress/dist` (the existing deploy path); `pnpm dev` serves + watches.

It contains two main parts:

- docs pages in `apps/web/docs`
- live demos and preview/editor helpers used by those docs (hydrated as Domphy islands)

The docs are not static text only. Many pages render real `@domphy/core`, `@domphy/theme`, and `@domphy/ui` examples directly inside the site, so documentation and manual testing happen in the same place.

In practice:

- guide pages explain the model and API
- demo files under `apps/web/docs/demos` provide runnable examples
- preview and editor components load those examples into interactive docs pages
