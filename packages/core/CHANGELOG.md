# @domphy/core Changelog

## 0.20.1
- `contentEditable` and `spellCheck` are enumerated attributes, not boolean ones: `contentEditable: false` now renders `contenteditable="false"` (previously the attribute was removed entirely, so a child of an editable ancestor stayed editable — exactly what `@domphy/editor` emits for atom nodes), `"plaintext-only"` passes through unchanged, and a reactive `true → false` transition works. SSR output fixed the same way.

## 0.20.0
- **Security (breaking default):** a string child is now rendered as TEXT. Previously any string that looked like HTML (`isHTML()`) was parsed into live DOM, so user-supplied values (comments, titles, form fields) could inject elements — only `on*` attributes and `javascript:` URLs were stripped, with no tag whitelist. Markup in a plain string is now escaped on both the client and in SSR output.
- Added `rawHtml(html)` / `RawHTML` / `isRawHTML(value)`: the explicit opt-in for rendering a string as markup. It still strips `<script>` elements, `on*` handler attributes and `javascript:` URLs (defense in depth — not a sanitizer for untrusted input). A reactive child may switch between a plain string and `rawHtml()`; crossing that boundary rebuilds the node.
- **Migration:** anywhere you passed markup as a string child expecting it to render (a Markdown renderer's output, a syntax highlighter, a generated SVG), wrap it: `{ div: svg }` → `{ div: rawHtml(svg) }`. Plain text children need no change.

## 0.19.3
- Types: `PartialElement` now includes optional `_doctorDisable` (`true | string | string[]`) so design-system patches can declare intentional doctor suppressions in TypeScript.

## 0.19.2
- fix `merge()`: no longer drop empty-string leaf values (`""`). Only `undefined`/`null` are skipped. Fixes decorative-image `alt: ""` and other valid empty HTML attributes being stripped during patch composition.

## 0.19.1
- Metadata only: fuller package description/keywords for npm. No runtime change.

## 0.1.5
- Initial release
## 0.1.7
- fix listener type
## 0.1.8
- move _notofier from AttributeList to ElementAttribute
## 0.19.0
- add `behavior(key, attach, props)` and `ElementNode.getBehavior(key)`: a per-node behavior contract (Svelte-action-like) for imperative state that must survive a reactive parent re-rendering a reused node — `attach` runs once per real DOM node, `update(props)` routes every later re-render's fresh props into that same instance, `destroy()` fires exactly once on removal
