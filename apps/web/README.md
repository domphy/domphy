# apps/web

This app is the Domphy documentation website, built with VitePress.

It contains two main parts:

- docs pages in `apps/web/docs`
- live demos and preview/editor helpers used by those docs

The docs are not static text only. Many pages render real `@domphy/core`, `@domphy/theme`, and `@domphy/ui` examples directly inside the site, so documentation and manual testing happen in the same place.

In practice:

- guide pages explain the model and API
- demo files under `apps/web/docs/demos` provide runnable examples
- preview and editor components load those examples into interactive docs pages
