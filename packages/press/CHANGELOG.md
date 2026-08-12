# @domphy/press Changelog

## Unreleased
- perf(search): the search index is fetched on the first search intent (input focus or first keystroke, including the Ctrl/Cmd+K path) instead of on mount. It was the largest asset on a docs page — measured on the shapemetry docs site at 573,534 B of a 693,468 B cold page load, paid by every visitor whether or not they ever searched. A query typed while the fetch is in flight is replayed once the index resolves, so nothing is dropped; requests are shared per index URL, so two widgets on a page (or a re-mounted island) fetch once, and a failed fetch is forgotten so the next intent retries.

## 0.23.0
- Absorbed `@domphy/markdown`: the standalone package is gone from the monorepo; its source now lives in `src/markdown/` and its full public API (`parseMarkdown`, `markdownToDomphy`, `createMarkdown`, `walkMdast`, `splitFrontmatter`, `transformOutsideCodeBlocks`, `createUniqueSlugger`, `defaultSlugify` + types) is re-exported as plain named exports from the main entry — no new subpath export, and deliberately NOT added to the browser entrypoint (the remark pipeline stays Node/build-side). `TocEntry` was already exported by press and is shared. The `@domphy/markdown` peer dependency is gone; `yaml` (frontmatter parsing) is now a direct dependency.

## 0.21.10
- fix(layout): `themeConfig.footerMessage` is wrapped in `rawHtml()` again — after the core 0.20.0 "string children are text" flip, the footer rendered its `<a>` markup as literal text on every page.

## 0.21.9
- Requires @domphy/core >= 0.20.0 and @domphy/markdown >= 0.19.2 (string children are now text by default). Container-directive child arrays widened to accept `RawHTML`; fences, code groups and mermaid blocks keep rendering as markup via the walker's `rawHtml()` opt-in.

## 0.21.7
- feat: `wide: true` frontmatter drops the 1440px shell cap AND the prose content cap, for a page whose content is a wide artifact (a generated diagram, a broad table) rather than prose. Deliberately orthogonal to `layout`: `layout: "page"` also goes full width but removes the nav sidebar, which a wide reference page still wants. Without it the only way to show something wider than the cap was to let it overflow into a horizontal scrollbar, which is peeking rather than reading.

## 0.21.6
- fix(toc): give "On this page" links base left padding so the active left border is not flush against the label (nested levels stack indent on top of the base).

## 0.21.5
- feat(toc): aside "On this page" scroll-spy — `nav.dp-toc` links get `aria-current="true"` on click and while scrolling (sticky left border + brand color). Wired in `RUNTIME_SCRIPT` (no extra client bundle).

## 0.21.0
- feat: font hooks — the generated stylesheet now reads `var(--dp-font-sans, …)` (body), `var(--dp-font-mono, …)` (code), and `var(--dp-font-display, inherit)` (hero headline + content h1/h2), so a site can re-skin typography by defining the vars in `head` (e.g. alongside a Google Fonts link) without fighting source order. Unset vars fall back to the previous system/mono stacks. This also defines `--dp-font-mono`, which the hero install-command pill already referenced but nothing emitted.
- feat: `fullBleed: true` frontmatter for the home layout — drops the fixed 1100px main column and centers each top-level prose block individually, so bare island placeholders (live demos, e.g. a WebGL hero) can span edge-to-edge while markdown content keeps the landing width.
- refactor(hero): removed the gradient headline text (`linear-gradient` + `background-clip: text`) and the radial glow pseudo-element behind it — `hero.name` now renders solid `textStrong`. Hero action buttons are no longer hand-rolled pill styles; they render through the real `@domphy/ui` `button()`/`buttonGhost()` patches.
- refactor(features): feature cards no longer lift/cast a brand shadow on hover (`translateY(-2px)` + `box-shadow` removed) — hover is a subtle border-color change only.
