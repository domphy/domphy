# DomphyPress POC — `@domphy/app` production-readiness for docs SSG

A proof-of-concept that renders real Domphy docs through `@domphy/app` to static HTML, to test whether `@domphy/app` is production-ready as the spine of a documentation site (a future "DomphyPress").

## What it does

`build.mjs` reads 3 real docs (`quickstart.md`, `core/syntax.md`, `ui/patches/button.md`), converts each markdown → a Domphy element tree (via `markdown-it` → single-root inline-HTML), builds a docs layout (sidebar + content) in Domphy, defines one route per page with `defineRoutes` + `createApp`, then calls `app.renderToString(url)` per route and writes static HTML to `dist-poc/`.

Run: build `core, theme, floating, ui, app`, then `cd experiments/domphypress && pnpm install --ignore-workspace && node build.mjs`.

## Result: ✅ valid static HTML

| url | status | bytes |
|---|---|---|
| `/` | 200 | 1043 |
| `/quickstart` | 200 | 2542 |
| `/syntax` | 200 | 11145 |
| `/button` | 200 | 969 |
| `/does-not-exist` | 404 | 155 |

Verified: headings/code/tables render; Metadata `title`+`template` resolves into `<head>`; active sidebar `navLink()` emits `aria-current="page"` during SSR; per-element scoped CSS emitted; 404 returns the not-found block with status 404. Pure Node — no jsdom.

## `@domphy/app` verdict: production-ready as an SSG/SSR spine

It cleanly does SSG for docs and produces valid, framework-free static HTML. `renderToString(url) → { html, css, head, status, bootstrapScript }` makes the SSG loop trivial; nested `layout` maps to a docs shell. **No bugs found in `@domphy/app` or `@domphy/core`.**

## Gaps (design boundaries, not bugs) — the authoring layer a real DomphyPress must add

1. **Inline-HTML keeps only one root node** (`core` `TextNode` uses `template.content.firstChild`) — wrap each doc in one `<div>`, or a multi-root markdown string silently drops content after the first element.
2. **No markdown story** (expected) — syntax highlighting, TOC/anchors, container directives, includes are the integrator's job.
3. **VitePress-coupled docs lose content** — pages whose body lives in `:::details`, `!!!include!!!`, `<CodeEditor>` render thin (`button.md` → 969 bytes). A finding about the *existing docs*, not about app.
4. **`renderToString` recompiles the route tree per call** — correct per-request isolation, but no compile-once/render-many path for large SSG batches.
5. **Whole-app hydration only** — no islands/partial hydration; static HTML degrades gracefully though.
6. **Per-page CSS duplication** — SSG would want shared/critical-CSS extraction.
7. **Typography patches enforce host tag via `console.error`** — use correct host tags (`h1`/`p`) to avoid noisy SSR.

## Conclusion

`@domphy/app` is a production-quality routing/SSR/metadata spine for docs **today**. A real DomphyPress is a well-scoped *authoring layer on top* (markdown→Domphy pipeline with highlighting/TOC/directives, a render-many + CSS-dedup SSG entry, an islands mode) — not a rewrite of `@domphy/app`. The full docs migration is that authoring layer; this POC proves the spine works.
