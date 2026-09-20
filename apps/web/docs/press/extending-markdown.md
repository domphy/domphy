---
title: "Extending Markdown"
description: "There is no Markdown plugin API in @domphy/press yet."
---

# Extending Markdown

There is no config API for adding custom Markdown plugins. `SiteConfig.markdown` is typed `Record<string, never>` and is a no-op — reserved for a future release.

Authoring (containers, details, steps, code groups, file imports, badges, frontmatter) lives in [Markdown Features](/docs/press/markdown). The pipeline you can call yourself (`parseMarkdown`, `createMarkdown`, remark plugins) is in [Markdown](/docs/markdown/).
