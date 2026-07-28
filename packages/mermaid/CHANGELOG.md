# @domphy/mermaid

## 0.18.2
- Requires @domphy/core >= 0.20.0 (string children are now text by default). `renderMermaidInTree` wraps the inline SVG in `rawHtml()`, so the wrapper `div`'s content is a `RawHTML` value instead of a bare string.

## 0.18.1

- `@mermaid-js/mermaid-cli` is an **optional** dependency (build-time SSG only). Client `mermaidClient()` needs only the optional peer `mermaid`.
- Build-time `renderMermaidInTree` SVG + client `mermaidClient()` patch.

## 0.18.0

- Initial public release.
