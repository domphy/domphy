# @domphy/press Changelog

## 0.21.5
- feat(toc): aside "On this page" scroll-spy — `nav.dp-toc` links get `aria-current="true"` on click and while scrolling (sticky left border + brand color). Wired in `RUNTIME_SCRIPT` (no extra client bundle).

## 0.21.0
- feat: font hooks — the generated stylesheet now reads `var(--dp-font-sans, …)` (body), `var(--dp-font-mono, …)` (code), and `var(--dp-font-display, inherit)` (hero headline + content h1/h2), so a site can re-skin typography by defining the vars in `head` (e.g. alongside a Google Fonts link) without fighting source order. Unset vars fall back to the previous system/mono stacks. This also defines `--dp-font-mono`, which the hero install-command pill already referenced but nothing emitted.
- feat: `fullBleed: true` frontmatter for the home layout — drops the fixed 1100px main column and centers each top-level prose block individually, so bare island placeholders (live demos, e.g. a WebGL hero) can span edge-to-edge while markdown content keeps the landing width.
- refactor(hero): removed the gradient headline text (`linear-gradient` + `background-clip: text`) and the radial glow pseudo-element behind it — `hero.name` now renders solid `textStrong`. Hero action buttons are no longer hand-rolled pill styles; they render through the real `@domphy/ui` `button()`/`buttonGhost()` patches.
- refactor(features): feature cards no longer lift/cast a brand shadow on hover (`translateY(-2px)` + `box-shadow` removed) — hover is a subtle border-color change only.
