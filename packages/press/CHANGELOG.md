# @domphy/press Changelog

## 0.24.1

- Republish of 0.24.0 with no code change: the 0.24.0 tarball was published with raw `workspace:` dependency specifiers (published with `npm publish` instead of `pnpm publish`), so it could not be installed outside this monorepo. 0.24.0 is deprecated on npm.

## 0.24.0
- fix(build): root-relative links and images written in Markdown are prefixed with `config.base` (new `RenderDocOptions.base`, `MdastWalkOptions.transformUrl`). On a `base: "/docs/"` deploy every in-content link previously 404'd — only nav/sidebar hrefs were prefixed.
- fix(serve): `startServer`/`startDevServer` take the site `base` and serve at that prefix; `domphy-press preview`/`dev` read it from the config. A sub-path build used to 404 on every request locally.
- fix(theme): follow `prefers-color-scheme` when no `dp-theme` choice is stored. The document ships `data-theme="light"` plus `<meta name="color-scheme" content="light dark">`, so a system-dark visitor got a light page with dark UA chrome.
- fix(a11y): nav flyout and locale-switcher triggers are `<button>`s. They were `<span>`s revealed by `:focus-within`, which nothing could satisfy — the submenus were unreachable by keyboard entirely (WCAG 2.1.1).
- fix(a11y): the top-level site nav is rendered into the mobile drawer. On a doc page below 860px the header nav is `display:none` and the drawer only held the sidebar, so the site nav was unreachable on a phone.
- fix(a11y): hydrated search input carries an accessible name (`SearchWidgetOptions.label`, default "Search documentation") — `role="combobox"` had only a placeholder.
- fix(a11y): `aria-expanded` on the menu toggle, sidebar-group toggles and nav flyouts; `aria-pressed` on the theme toggle; <kbd>Escape</kbd> returns focus to the menu toggle instead of dropping it on `<body>`; GFM task-list checkboxes are named for their state ("done"/"not done") rather than left nameless — the item text is already announced as the list item's content; the announcement bar is an `<aside>` landmark.
- fix(a11y): markdown tables are wrapped in a focusable, named scroll region (`div.dp-table-scroll[role=region][tabindex=0]`) instead of the `<table>` itself carrying `display:block; overflow-x:auto`. The old rule made the table the scroll container — unreachable by keyboard (axe `scrollable-region-focusable`) — and `display:block` drops the table's semantics in several screen readers. The accessible name is numbered per document so two tables do not become two identically-named landmarks.
- fix(a11y): visible focus for the code-group tabs (the real controls are 0×0 radios — the ring is forwarded to the matching label) and for the code copy button (`opacity:0` until hover, now until focus too).
- fix(a11y): contrast pass over the whole shell, derived from the theme's K=9 contrast span (text on a shift-N surface needs shift-(N+9), see AGENTS.md). Essential chrome (header nav, TOC, prev/next, doc footer, sidebar labels, social icons) moves off shift-6 (2.77:1) onto `text`; text on shift-1 surfaces (admonitions, table headers, inline code, code-group tabs, badges, feature cards, flyout panels) to shift-10, and on shift-2 surfaces (code-block title bar, active code-group tab, hovered panel row, `mark`) to shift-11 — the active tab's shift-10 still measured 4.32:1 against the docs site's saturated amber brand. axe-core on the sample site: 29 → 0 violations light, 19 → 0 dark.
- fix(layout): no horizontal page scroll at 375px — the header toolbar now shrinks instead of overflowing (measured 425px of scrollWidth), and prose wraps long unbroken tokens (508px).
- fix(layout): the mobile drawer opens below the live header bottom edge, so an announcement bar no longer pushes the header under it.
- fix(highlight): code blocks sit on the page surface instead of a shift-1 tint, and the light Shiki theme is `github-light-high-contrast`. A syntax theme's palette is calibrated against its own near-white/near-black background, so repainting it on a tint voided the calibration for every token at once (`github-light` on `#ededed`: keyword 3.91:1, comment 4.11:1, attribute 2.98:1; the high-contrast theme's comment tone still only 4.30:1). On `#ffffff` / `#000000` every token either theme emits clears 4.5:1. The block is delimited by its existing 1px outline plus the tinted title/tab bars.
- perf(search): `queryIndex` no longer walks the whole vocabulary. The parsed index and its sorted term list are memoized per index string, exact/prefix matches come from a binary-searched range, fuzzy candidates are rejected on a length test, and scoring uses typed arrays instead of `Map`/`Set`. On the docs site's 1.3 MB index (3085 entries, 8855 terms): 74 ms → 1.5 ms for a two-letter query and 28–65 ms → ≤ 6 ms for three-term queries, i.e. inside one frame. Results are byte-identical to the previous implementation.
- `pressCSS()` ships the `.sr-only` rule the footnotes section's visually hidden label already referenced.
- feat(exports): `@domphy/press/browser` ships the Markdown pipeline (`parseMarkdown`, `markdownToDomphy`, `createMarkdown`, `walkMdast`, `splitFrontmatter`, `transformOutsideCodeBlocks`, `createUniqueSlugger`, `defaultSlugify` + their types). The pipeline itself never needed Node — only `createMarkdown({ math: true })` did, and resolving the optional `remark-math` peer now lives in a Node-only module behind the main entry. DOM-only consumers previously had to deep-import `packages/press/src/markdown/index.ts` (the docs playground did), which dragged `process`/`require`/`node:module` into their typecheck and bundle. `math: true` on the browser entry throws with the "pass remark-math via `plugins`" hint.

## 0.23.2
- feat(markdown): parse VitePress/markdown-it `==mark==`, `~sub~`, `^sup^` and GitHub gemoji shortcodes (`:tada:` → 🎉). GFM strikethrough is `~~…~~` only (`singleTilde: false`) so `H~2~O` is subscript. Wired in both `parseMarkdown`/`createMarkdown` and the site `renderDoc` pipeline; the walker emits `mark`/`sub`/`sup` elements (unknown nodes used to unwrap to plain text).
- fix(layout): `themeConfig.announcementBar.text` is wrapped in `rawHtml()` like `footerMessage` — after the core 0.20.0 "string children are text" flip, an `<a>` in the bar rendered as literal text.
- Public types: main entry re-exports `BuildOptions` / `FeatureConfig` / `HeroConfig` (browser entry: FeatureConfig/HeroConfig only).

## 0.23.1
- fix(markdown): resolve reference-style links and images against their definitions (same `a`/`img` shape as inline, including `sanitizeUrl`) instead of dropping `linkReference`/`imageReference` nodes. GFM footnotes (`[^label]`) render as numbered superscript refs plus a collected `section.footnotes` footer (mdast-util-to-hast / GitHub id contract); unused definitions stay out of the body.
- docs(markdown): syntax-reference matches the walker — heading `header-anchor` child, soft-break as one string, raw HTML via `rawHtml()` + `sanitizeHTMLString`.
- fix(serve): resolve each candidate and require its realpath stays under the site root, so absolute URLs (`/etc/passwd`) and `%2e%2e` / symlink escapes cannot leave the preview directory.
- fix(build): skip locale directories when discovering the default locale so `vi/guide.md` is not registered twice (first write used to win as localeKey `/`).
- fix(highlight): escape the fence `lang` before interpolating it into the `language-*` class.
- fix(layout): match locale prefixes on a segment boundary so `/vi` does not claim `/video`.
- fix(build): validate mermaid `{ cdn }` as http(s) and JSON-stringify it into `import()`.
- fix(build): emit `dir="rtl"` on `<html>` for RTL `lang` values (`ar`, `he`, `fa`, `ur`, …).
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
