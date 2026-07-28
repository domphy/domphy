# @domphy/markdown Changelog

## 0.19.2
- Requires @domphy/core >= 0.20.0 (string children are now text by default). Raw `html` MDAST nodes and string highlighter output are wrapped in `rawHtml()`, so a `case "html"` child and `{ code: ... }` now carry a `RawHTML` value instead of a bare string. `WalkHelper.walkChildren` returns `(string | RawHTML | DomphyElement)[]`.

## 0.19.1

- `parseMarkdown` / `createMarkdown` / frontmatter helpers for Domphy element trees.
- remark/unified pipeline powers the docs site.

## 0.19.0

- Initial public release.
