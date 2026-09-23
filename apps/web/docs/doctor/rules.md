---
title: "Rules Reference"
description: "Complete reference for all 23 @domphy/doctor rules — what each one catches, why it matters, and how to fix the violation."
---

# Rules Reference

`@domphy/doctor` runs 23 rules against a Domphy element tree. This page covers each rule in full: what triggers it, why the pattern is non-idiomatic, and how to write the correct version.

Severity levels:
- **error** — structurally invalid; the tree will not render correctly. `validate().ok` is `false` when any error is present.
- **warning** — works today but may break under theme changes, reconciliation, or future refactors.
- **info** — a soft recommendation; the tree renders correctly but bypasses a system the theme owns.

---

## `void-content` — error

Void HTML tags (`input`, `img`, `br`, `hr`, `meta`, `link`, `area`, `col`, `embed`, `param`, `source`, `track`, `wbr`) cannot have children. The DOM ignores any content provided, so setting content on them is always a bug.

```ts
// Bad — void tag with string content
{ input: "placeholder text" }
{ img: "logo" }
```

```ts
// Good — content is null; attributes are sibling keys
{ input: null, type: "text", placeholder: "Enter name" }
{ img: null, src: "/logo.png", alt: "Logo", width: 48 }
```

This is the only rule where `fix()` applies a lossless auto-correction: it sets the tag value to `null`. The fix is lossless because void tags cannot render children regardless, so clearing the content loses nothing.

---

## `invalid-nesting` — error

HTML content-model violations that browsers "repair" by re-parenting or discarding nodes. The repair changes the tree shape between server render and client mount, breaking SSR/hydration parity — so violations are errors, not warnings. Modeled on Svelte's `node_invalid_placement_ssr` and html-validate.

**Checked combinations (declared direct parent → child pairs only):**

- Flow/block content inside `<p>` (phrasing content only): `div`, `p`, `h1`–`h6`, `ul`, `ol`, `dl`, `blockquote`, `pre`, `table`, `form`, `fieldset`, `figure`, `figcaption`, `main`, `section`, `article`, `aside`, `header`, `footer`, `nav`, `hr`, `address`.
- Interactive content inside interactive content: `a` or `button` inside `<a>`, `a` or `button` inside `<button>`.
- `li` outside `ul`/`ol`/`menu`; `dt`/`dd` outside `dl`; `tr` outside `table`/`thead`/`tbody`/`tfoot`; `td`/`th` outside `tr`; `option` outside `select`/`optgroup`/`datalist`; `thead`/`tbody`/`tfoot`/`caption`/`colgroup` outside `table`.
- A direct element child of `ul`/`ol` that is not `li`/`script`/`template`.

```ts
// Bad — browser closes the <p> early and re-parents the <div>
{ p: [{ div: "Card" }] }

// Bad — interactive inside interactive
{ a: [{ button: "Click" }], href: "/" }

// Bad — li without a list parent
{ div: [{ li: "Item" }] }

// Bad — non-li child of ul
{ ul: [{ div: "Item" }] }
```

```ts
// Good
{ div: [{ p: "Intro" }, { div: "Card" }] }
{ button: [{ span: "Click" }] }
{ ul: [{ li: "Item" }] }
```

**Exempt (never flagged):** text content, reactive `(listener) => …` function results, `rawHtml()` content, `$`-patch/imperatively-inserted children (all invisible to the static tree), any pair where the parent or the child is a custom element (a web component has no declared content model, and the parser never re-parents around an unknown element — so hydration parity is not at risk), and everything inside `<svg>` subtrees — SVG has its own content model. `foreignObject` re-enters HTML, so HTML checks apply again inside it.

---

## `click-without-keyboard` — warning

An element with an `onClick` handler that is not inherently interactive and has no keyboard handler is mouse-only — an accessibility bug. Modeled on Svelte's `a11y_click_events_have_key_events` + `a11y_no_static_element_interactions`.

**Exempt (never flagged):**

- Natively interactive tags: `a`, `button`, `input`, `select`, `textarea`, `summary`, `label`.
- Elements with an interactive ARIA `role` (`button`, `link`, `menuitem`, `menuitemcheckbox`, `menuitemradio`, `tab`, `switch`, `checkbox`, `radio`, `option`, `treeitem`) or a `tabIndex`/`tabindex` attribute.
- Elements with a keyboard handler: `onKeyDown`, `onKeyUp`, or `onKeyPress`.
- Hidden elements: `hidden: true`, `aria-hidden: "true"`, or `style: { display: "none" }` — they are not pointer-reachable either.

A custom element is **not** exempt: doctor cannot see inside a web component, so `{ "my-widget": null, onClick }` is flagged unless it declares a `role` or `tabIndex`. If the component is natively interactive (it renders a `<button>` in its shadow root), suppress it with `_doctorDisable: "click-without-keyboard"`.

```ts
// Bad — mouse-only
{ div: "Open", onClick: () => open() }
```

```ts
// Good — keyboard handler + role + tabIndex
{ div: "Open", role: "button", tabIndex: 0, onClick: () => open(), onKeyDown: (e) => e.key === "Enter" && open() }

// Better — use a natively interactive element
{ button: "Open", onClick: () => open() }
```

---

## `missing-required-attribute` — error / warning

Required accessibility attributes that assistive technology depends on. Modeled on htmlhint's `alt-require`/`title-require` and Svelte's `a11y_missing_attribute`.

- **`<img>` without `alt`** — error. An empty `alt: ""` is valid (decorative image); `aria-label`, `aria-labelledby`, or `role: "presentation"` / `"none"` are accepted alternatives. Only a missing/`undefined` value is flagged.
- **`<iframe>` without `title`** — error.
- **`<a>` with `onClick` but no `href` and no `role`** — warning. A link without `href` is not focusable; it behaves like a button and should say so.

```ts
// Bad
{ img: null, src: "/logo.png" }
{ iframe: null, src: "https://example.com" }
{ a: "Save", onClick: () => save() }
```

```ts
// Good
{ img: null, src: "/logo.png", alt: "Domphy logo" }
{ img: null, src: "/divider.png", alt: "" }              // decorative
{ iframe: null, src: "https://example.com", title: "Example embed" }
{ a: "Save", role: "button", tabIndex: 0, onClick: () => save(), onKeyDown: (e) => e.key === "Enter" && save() }
// or just: { button: "Save", onClick: () => save() }
```

---

## `unknown-tag` — warning

The first key of an element must be a valid HTML or SVG tag, or a [valid custom element name](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name) — lowercase, with a hyphen after the first character. An unknown key is almost always a typo.

```ts
// Bad — "dvi" is not a tag
{ dvi: "Hello" }

// Bad — "Div" is not a tag (case-sensitive)
{ Div: "Hello" }

// Bad — a custom element name cannot contain uppercase
{ "My-Widget": "Hello" }
```

```ts
// Good
{ div: "Hello" }

// Good — a web component renders as-is; doctor skips the HTML
// content-model rules around it, since it has no declared content model
{ "my-widget": "Hello" }
```

Note: Reserved keys (`$`, `style`, `_key`, `_portal`, `_context`, `_metadata`), event handlers (`onClick`, `onChange`, …), and data/aria attributes are ignored when looking for the tag key. The rule only fires when there is exactly one unrecognized non-reserved key.

---

## `inline-typography` — warning

Typography properties set directly in `style` bypass the theme's type scale. Use a typography patch from `@domphy/ui` instead, so the theme owns the type ramp and changes propagate everywhere.

**Flagged properties:** `fontSize`, `lineHeight`, `fontWeight`, `letterSpacing`, `fontFamily`, `textDecoration`.

```ts
// Bad — literal typography in style
{ p: "Body text", style: { fontSize: "16px", lineHeight: 1.5 } }
{ h1: "Title", style: { fontWeight: "700", letterSpacing: "-0.02em" } }
{ a: "Link", style: { textDecoration: "none" } }
{ p: "Text", style: { fontFamily: "Arial, sans-serif" } }
```

```ts
import { paragraph, heading, link } from "@domphy/ui"

// Good — patches manage typography
{ p: "Body text", $: [paragraph()] }
{ h1: "Title", $: [heading()] }
{ a: "Link", href: "/", $: [link()] }
```

**The fix is per property**, and the diagnostic's hint names it:

| Property | Fix |
| --- | --- |
| `fontSize` | a typography patch, or `themeSize(l, "increase-N" \| "decrease-N")` for a one-off step |
| `lineHeight` | a typography patch — it sets the line-height belonging to the type step (a unitless multiplier like `1.5` is fine and not reported) |
| `fontWeight` | `themeWeight("light" \| "regular" \| "medium" \| "semibold" \| "bold" \| "extrabold" \| "black")` — or `strong()`/`heading()`, which set the weight belonging to the step |
| `letterSpacing` | `themeLetterSpacing("tighter" \| "tight" \| "normal" \| "wide" \| "wider" \| "widest")` |
| `fontFamily` | **remove it** — the themed root carries the sans stack and it inherits. To opt *out* (a code block, tabular figures): `themeFont("monospace" \| "sans-serif")` |
| `textDecoration` | the `link()`/`small()`/`strong()` patch that owns the text, or a cascade keyword (`"none"`, `"underline"`) |

`themeWeight`, `themeLetterSpacing` and `themeFont` are exported by `@domphy/theme` (`packages/theme/src/typography.ts`) and each returns a `var(--…)` reference, so a value written that way is theme-driven and never reported.

```ts
import { themeFont, themeLetterSpacing, themeWeight } from "@domphy/theme"

// Good — tokens for the properties a patch cannot express on its own
{ code: "npm i", style: { fontFamily: themeFont("monospace") } }
{ span: "Total", style: { fontWeight: themeWeight("semibold") } }
{ h2: "Title", $: [heading()], style: { letterSpacing: themeLetterSpacing("tight") } }
```

**Static and reactive forms are judged identically.** A reactive `(listener) => value` is a wrapper, not a different kind of declaration — it produces the same CSS — so the value it resolves to is what counts. A `var(--…)` reference or a `calc()` means the theme is in control, whichever way it is written; a literal stays a literal, and so does a **number**.

```ts
import { themeSize } from "@domphy/theme"

// Fine — resolves to var(--fontSize-N)
{ p: "Text", style: { fontSize: (l) => themeSize(l, "inherit") } }

// Fine — a theme var, static or reactive
{ pre: "…", style: { fontFamily: "var(--dp-font-mono, ui-monospace, monospace)" } }

// All four are the same declaration, and all four are flagged
{ p: "Text", style: { fontSize: "16px" } }
{ p: "Text", style: { fontSize: () => "16px" } }
{ p: "Text", style: { fontWeight: 500 } }
{ p: "Text", style: { fontWeight: () => 500 } }
```

Unitless `lineHeight` multipliers (`1.5`) and cascade keywords (`inherit`, `none`, `bold`, …) stay exempt in every form. A reactive value is left alone entirely under `{ runReactive: false }` — it cannot be evaluated, so the rule says nothing rather than guessing.

**Scope: the element itself.** The rule's whole prescription is "put a typography patch on this element via `$`", and `$` attaches to one element, never to a subtree. So a nested block whose selector reaches **descendants** is not checked:

```ts
// Checked — these style this element
{ div: "x", style: { fontSize: "13px" } }
{ div: "x", style: { "&:hover": { fontWeight: "700" } } }
{ div: "x", style: { "&::after": { fontSize: ".75em" } } }

// Not checked — these style OTHER elements
{ div: body, style: { "& h1": { fontSize: "30px" } } }
{ div: body, style: { "& :not(pre)>code": { fontSize: ".875em" } } }
```

**Conditional at-rules are this element's style.** Core re-runs its CSS builder with the *same* parent selector for `@media`, `@container`, `@supports` and `@layer`, so a declaration inside one is the element's own style under a condition — it is walked like the flat block, at any nesting depth, by every rule. (`@keyframes` and `@font-face` are not: a keyframe declares animation stops, and `@font-face` declares `fontFamily`/`fontWeight` *for the font it defines*.)

```ts
// Flagged — the responsive half of a stylesheet is still this element's type
{ div: "x", style: { "@media (max-width: 768px)": { fontSize: "13px" } } }

// Not flagged — a descendant target stays a descendant target inside a condition
{ div: body, style: { "@media (max-width: 768px)": { "& h1": { fontSize: "24px" } } } }
```

The split follows core's own selector join (`StyleList.getSelector`): a key starting with `&` is concatenated onto the element's selector, anything else is joined with a space and therefore reaches into the subtree. A descendant block type-sets markup the element's author does not construct — a Markdown or `rawHtml()` render, or whatever children a caller hands a layout patch — so there is no call site to move the declaration to, and a descendant selector is the only implementation available. This is the shape Tailwind Typography's `prose` and VitePress's `.vp-doc` take, and the one `card()`/`table()`'s own slot styles take.

The theme rules still run inside those blocks: a hard-coded hex or `px` is wrong no matter which element it lands on. And `descendant-color-override` covers the case where such a block silently defeats a patch on a declared descendant.

---

## `raw-theme-value` — info

Literal color values in color-bearing style properties bypass theming and dark mode. Any color that should respond to the theme must come from `themeColor()`.

**Flagged properties:** `color`, `backgroundColor`, `background`, `borderColor`, `border`, `outlineColor`, `outline`, `fill`, `stroke`.

**Flagged values (two cases):**

1. **Hex/function literals** — `#hex`, `rgb()`, `rgba()`, `hsl()`, `hsla()` — on all color-bearing properties, including shorthands like `border` and `background`.
2. **CSS named colors** — any plain string like `"red"`, `"white"`, `"black"`, `"cornflowerblue"` on direct color properties (`color`, `fill`, `stroke`, `backgroundColor`, `outlineColor`, `borderColor`, `caretColor`, `accentColor`, `columnRuleColor`, `textDecorationColor`). These bypass theming just as much as a hex literal but are easier to miss.

Keywords like `transparent`, `currentColor`, `inherit`, `none`, and `auto` are intentionally allowed — they carry no color meaning.

```ts
// Bad — literal hex colors
{ div: "Panel", style: { backgroundColor: "#f5f5f5" } }
{ span: "Note", style: { color: "rgb(80, 80, 80)" } }
{ div: "Card", style: { border: "1px solid #ccc" } }

// Bad — CSS named colors (also flagged as raw-theme-value)
{ span: "Error", style: { color: "red" } }
{ div: "Panel", style: { backgroundColor: "white" } }
{ svg: null, style: { fill: "black" } }
```

```ts
import { themeColor } from "@domphy/theme"

// Good — reactive theme token
{ div: "Panel", style: { backgroundColor: (l) => themeColor(l, "shift-1", "neutral") } }
{ span: "Note", style: { color: (l) => themeColor(l, "base", "neutral") } }
{ div: "Card", style: { borderColor: (l) => themeColor(l, "shift-3", "neutral") } }
{ span: "Error", style: { color: (l) => themeColor(l, "shift-9", "error") } }

// Keywords are fine
{ div: "Overlay", style: { backgroundColor: "transparent" } }
{ svg: null, style: { fill: "currentColor" } }
```

**`color-mix()` is judged by its arguments.** It produces no color of its own — it blends the colors handed to it ([CSS Color Module Level 5 §3](https://www.w3.org/TR/css-color-5/#color-mix)) — so a mix of nothing but theme tokens resolves through the theme at paint time exactly as `themeColor()` does. Its first argument is the colorspace, never a color.

```ts
// Fine — theme tokens being blended, plus the alpha idiom against transparent
{ div: "x", style: { borderColor: (l) => `color-mix(in srgb, ${themeColor(l, "shift-9", "primary")} 55%, ${themeColor(l, "shift-3")})` } }
{ div: "x", style: { backgroundColor: (l) => `color-mix(in srgb, ${themeColor(l, "shift-6")} 80%, transparent)` } }

// Flagged — a literal inside the mix is still a literal
{ div: "x", style: { backgroundColor: "color-mix(in srgb, red 50%, blue)" } }
{ div: "x", style: { backgroundColor: (l) => `color-mix(in srgb, ${themeColor(l, "shift-6")} 50%, #fff)` } }
```

**Hint quality:** For hex/rgb values the diagnostic hint includes a perceptual suggestion using CIELAB/LCH chromametry (via `@domphy/theme`). For example, a diagnostic on `color: "#0070f3"` produces:

```
→ Prefer a theme token — (l) => themeColor(l, "base", "primary")
  [perceptual LCH L=44 C=59 h=264°] — so theming and dark mode apply.
```

For CSS named colors the hint explains why they are flagged and points to `themeColor()`. The suggestion is an approximation to orient you toward the right color family and tone; adjust to match your design.

---

## `raw-spacing-value` — info

Literal `rem`, `em`, or `px` values in spacing properties bypass the theme's density system. Use `themeSpacing(n)` so spacing scales with `dataDensity`.

**Flagged properties:** `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`, `marginInline`, `marginBlock`, `marginInlineStart`, `marginInlineEnd`, `marginBlockStart`, `marginBlockEnd`, `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `paddingInline`, `paddingBlock`, `paddingInlineStart`, `paddingInlineEnd`, `paddingBlockStart`, `paddingBlockEnd`, `gap`, `rowGap`, `columnGap`.

`themeSpacing(n)` returns `n/4 em`, so `themeSpacing(4)` = `1em` ≈ `16px` at the default root font size.

```ts
// Bad — literal spacing bypasses density
{ div: "Card", style: { padding: "16px" } }
{ div: "Row", style: { gap: "1rem" } }
{ section: "Block", style: { marginBlock: "2em" } }
```

```ts
import { themeSpacing } from "@domphy/theme"

// Good — density-aware spacing
{ div: "Card", style: { padding: themeSpacing(4) } }       // 1em
{ div: "Row", style: { gap: themeSpacing(4) } }            // 1em
{ section: "Block", style: { marginBlock: themeSpacing(8) } } // 2em
```

Unitless `0` and keywords like `auto` / `inherit` are never flagged — they carry no density meaning.

**Exception:** reactive values are not flagged:

```ts
import { themeDensity, themeSpacing } from "@domphy/theme"

// Fine — dynamic spacing driven by density context
{ div: "Card", style: { padding: (l) => themeSpacing(themeDensity(l) * 4) } }
```

---

## `unknown-tone` — warning

`dataTone` controls which step in the color ramp the subtree uses as its surface anchor. The valid **string** grammar is the same list the runtime's `offsetTone()` accepts (`ElementTones` from `@domphy/theme`):

- `"inherit"` — use the parent's tone (default)
- `"base"` — the mid-lightness anchor for the current color family
- `"shift-N"` where N is 0–17 — absolute position in the 18-step ramp
- `"increase-N"` where N is 0–17 — lighter relative to the current context
- `"decrease-N"` where N is 0–17 — darker relative to the current context
- A semantic alias — `"surface"`, `"hover"`, `"border"`, `"border-strong"`, `"muted"`, `"text"` — each resolves to its underlying `shift-N` before grammar/range checks (see [Tone Aliases](/docs/theme/tone#semantic-aliases))

A real number (`dataTone: 3`) is accepted by the runtime and is not checked here (core preserves the JS type). Bare-numeric **strings** like `"3"` are invalid — `offsetTone()` throws for them.

Anything else is flagged, including made-up words like `"light"` / `"foreground"`, out-of-range offsets like `"shift-25"`, and bare-numeric strings.

```ts
// Bad
{ div: "Card", dataTone: "light" }       // not a tone
{ div: "Card", dataTone: "foreground" }  // not a tone (aliases are surface/text/…)
{ div: "Card", dataTone: "3" }           // bare-numeric string — runtime throws
{ div: "Card", dataTone: "shift-25" }    // out of range (max 17)
{ div: "Card", dataTone: "increase-18" } // out of range
```

```ts
// Good
{ div: "Card", dataTone: "base" }
{ div: "Card", dataTone: "shift-0" }       // lightest
{ div: "Card", dataTone: "shift-17" }      // darkest
{ div: "Card", dataTone: "increase-2" }    // 2 steps lighter than context
{ div: "Card", dataTone: "decrease-3" }    // 3 steps darker than context
{ div: "Card", dataTone: "surface" }       // semantic alias, same as "shift-1"
{ div: "Card", dataTone: "border-strong" } // semantic alias, same as "shift-4"
{ div: "Card", dataTone: 3 }               // real number — runtime accepts
```

---

## `middle-surface-anchor` — warning

A `shift-N` tone where N is 4–13 places the surface in the middle of the ramp. Children that derive their tones relatively (via `increase-N` / `decrease-N`) can clamp at the ramp edges, collapsing the contrast between background and foreground text.

```ts
// Bad — mid-ramp anchors
{ div: "Card", dataTone: "shift-4" }   // 4 is the first mid-ramp step
{ div: "Card", dataTone: "shift-9" }   // center of the ramp
{ div: "Card", dataTone: "shift-13" }  // 13 is the last mid-ramp step
```

```ts
// Good — edge anchors
{ div: "Light card", dataTone: "shift-1" }  // light surface (steps 0–3)
{ div: "Dark card", dataTone: "shift-16" }  // dark surface (steps 14–17)
```

Mid-ramp anchors (`shift-4` through `shift-13`) are intentionally valid grammar — the rule only warns, not errors. They are correct for highlighted or inverted regions where the contrast collapse is the intended effect. Suppress the warning mentally in those cases; the rule exists to catch accidental mid-anchoring, not deliberate use.

Only `shift-N` triggers this rule — `increase-N` and `decrease-N` express relative tone offsets, not surface anchors, so they are never flagged. Semantic aliases resolve to their underlying `shift-N` first, so mid-ramp aliases (`border-strong` = `shift-4`, `muted` = `shift-8`, `text` = `shift-9`) do trigger this rule the same as their numeric equivalent; edge-safe aliases (`surface` = `shift-1`, `hover` = `shift-2`, `border` = `shift-3`) do not.

---

## `unknown-density` — warning / error

`dataDensity` controls the spacing density scale. Valid values:

- `"inherit"` — use the parent density (default)
- `"increase-N"` where N is 0–4 — denser UI (tighter spacing)
- `"decrease-N"` where N is 0–4 — looser UI (more spacing)

`"shift-"` is not valid for density. N > 4 is an error (out of the 5-step scale: factors are 0.75, 1, 1.5, 2, 2.5).

```ts
// Bad — invalid grammar
{ div: "Form", dataDensity: "compact" }     // warning: unknown grammar
{ div: "Form", dataDensity: "shift-1" }    // warning: shift- not valid for density

// Bad — out of range
{ div: "Form", dataDensity: "increase-5" } // error: max is 4
{ div: "Form", dataDensity: "decrease-6" } // error: max is 4
```

```ts
// Good
{ div: "Compact form", dataDensity: "increase-2" }  // tighter spacing
{ div: "Spacious layout", dataDensity: "decrease-1" } // looser spacing
{ div: "Inherited", dataDensity: "inherit" }
```

---

## `unknown-size` — warning / error

`dataSize` controls the type size scale. Valid values:

- `"inherit"` — use the parent size (default)
- `"increase-N"` where N is 0–7 — larger text
- `"decrease-N"` where N is 0–7 — smaller text

`"shift-"` is not valid for size. N > 7 is an error (out of the 8-step scale).

```ts
// Bad — invalid grammar
{ div: "Label", dataSize: "large" }     // warning: unknown grammar
{ div: "Label", dataSize: "shift-2" }  // warning: shift- not valid for size

// Bad — out of range
{ div: "Label", dataSize: "increase-8" }  // error: max is 7
{ div: "Label", dataSize: "decrease-10" } // error: max is 7
```

```ts
// Good
{ div: "Large header area", dataSize: "increase-3" }
{ div: "Fine print region", dataSize: "decrease-1" }
{ div: "Normal", dataSize: "inherit" }
```

---

## `missing-key` — warning

When a **reactive function** (listener-based) returns a list of element children, each child that will participate in keyed reconciliation needs a `_key`. Without it the reconciler cannot match old children to new ones on re-render and must destroy and recreate the entire list.

```ts
import { toState } from "@domphy/core"

const items = toState(["Apple", "Banana", "Cherry"])

// Bad — dynamic list, no _key
{
  ul: (l) => items.get(l).map(text => ({ li: text }))
}
```

```ts
// Good — stable _key per item
{
  ul: (l) => items.get(l).map((text, i) => ({ li: text, _key: i + 1 }))
}

// Better — use a stable identity from the data itself
const tasks = toState([{ id: "a1", label: "One" }, { id: "a2", label: "Two" }])

{
  ul: (l) => tasks.get(l).map(task => ({ li: task.label, _key: task.id }))
}
```

This rule only fires for **dynamic** lists — those returned by a reactive `(listener) => …` function. Static arrays passed directly as content are not flagged because static lists never go through keyed reconciliation.

```ts
// Fine — static array, no reconcile, no _key needed
{ div: [{ header: "Top" }, { main: "Body" }, { footer: "Bottom" }] }
```

---

## `unstable-key` — warning

In a dynamic list, if every `_key` value exactly matches the item's array index (0, 1, 2, …), the keys are effectively index-based. Index keys defeat the purpose of keying: when items are inserted, removed, or reordered, the keys shift and the reconciler cannot track identity across renders.

```ts
// Bad — index keys (key === position)
{
  ul: (l) => tasks.get(l).map((task, i) => ({ li: task.label, _key: i }))
}
```

```ts
// Good — stable identity from the data
{
  ul: (l) => tasks.get(l).map(task => ({ li: task.label, _key: task.id }))
}
```

The rule is a heuristic: it fires when every `_key` in the returned list equals its array position (0, 1, 2, …). This is the exact runtime footprint of `.map((item, i) => ({ ..., _key: i }))`. Like `missing-key`, this only applies to dynamic lists.

---

## `duplicate-key` — error

Two siblings sharing the same `_key` value make it impossible for the reconciler to tell them apart. This fires on both static and dynamic sibling arrays.

```ts
// Bad — same _key on two siblings (static array)
{
  div: [
    { li: "First", _key: "item" },
    { li: "Second", _key: "item" }, // duplicate!
  ]
}

// Bad — same _key from a reactive list
{
  ul: (l) => records.get(l).map(r => ({ li: r.name, _key: r.category }))
  //                                                        ^^^ not unique
}
```

```ts
// Good — distinct keys
{
  div: [
    { li: "First", _key: "item-1" },
    { li: "Second", _key: "item-2" },
  ]
}
```

Unlike `missing-key` and `unstable-key`, `duplicate-key` is decidable for any sibling array — static or dynamic — because the keys are visible at the time the rule runs. Static arrays with duplicate keys are therefore also flagged.

---

## `tone-background-inherit` — warning

`style.backgroundColor` should always use `themeColor(l, "inherit")` — the tone that resolves to the current surface context. When you set `backgroundColor` to a fixed shifted tone (e.g. `themeColor(l, "shift-3")`), the background double-shifts when the element also has a `dataTone` set, producing incorrect surfaces.

Use `dataTone` to shift the surface context. Let `backgroundColor` always paint the surface in the current context:

```ts
// Bad — fixed shifted tone on backgroundColor
{ div: "Card", style: { backgroundColor: (l) => themeColor(l, "shift-3") } }

// Also bad — with dataTone too, this double-shifts
{ div: "Card", dataTone: "shift-2", style: { backgroundColor: (l) => themeColor(l, "shift-3") } }
```

```ts
// Good — shift the context via dataTone; paint surface as "inherit"
{
  div: "Card",
  dataTone: "shift-2",
  style: { backgroundColor: (l) => themeColor(l, "inherit") }
}
```

A **null-content** host is exempt, the same exemption `missing-color` and `low-contrast` make. An element declaring `{ span: null }` is a decorative chip — a chart legend swatch, a status dot, an icon glyph — whose whole job is to paint one fixed tone, and it has no children for a tone context to reach. The fix this rule prescribes is not available there: `dataTone` on a childless element shifts nothing, and a mid-ramp chip tone would trip `middle-surface-anchor` instead.

```ts
// Fine — a decorative swatch paints its tone directly
{
  span: null,
  ariaHidden: "true",
  style: {
    width: themeSpacing(2),
    height: themeSpacing(2),
    backgroundColor: (l) => themeColor(l, "shift-9", "primary"),
    color: (l) => themeColor(l, "shift-9", "primary"),
  },
}
```

---

## `missing-color` — warning

An element that uses `themeColor()` for at least one styled property (e.g. `backgroundColor`, `borderColor`) but has no `style.color` will have text color that doesn't re-evaluate when the tone context shifts. CSS `color` inheritance carries the computed value from the parent — not a live theme var — so the text can mismatch its surface after a tone shift.

```ts
// Bad — themed background, inherited color
{
  div: "Card",
  dataTone: "shift-1",
  style: {
    backgroundColor: (l) => themeColor(l, "inherit"),
    // no color: ... here
  }
}
```

```ts
// Good — both background and text color are reactive
{
  div: "Card",
  dataTone: "shift-1",
  style: {
    backgroundColor: (l) => themeColor(l, "inherit"),
    color: (l) => themeColor(l, "shift-9"),
  }
}
```

---

## `low-contrast` — warning (flat) / info (nested block)

When `style.color` and `style.backgroundColor` are both reactive theme vars (returning a `var(--X-N)` CSS var), the rule compares their ramp steps. A gap below `CONTRAST_SPAN` (9, exported by `@domphy/theme`) fails WCAG-level legibility: 9 is the index distance at which *every* pair of steps clears 4.5:1, at every position on the ramp, for every built-in role in both themes (derived in `DESIGN.md` §2.1, pinned by `packages/theme/tests/contrast.test.ts`).

**Both values are resolved against the element's own surface** — its `dataTone` if it declares one, otherwise the nearest declared ancestor's. Every `themeColor()` tone is relative to the surrounding tone context (`shift-N` mirrors once past the ramp midpoint, `increase-N`/`decrease-N` walk from it and clamp, plus the theme's edge bias), so the step a value lands on is a property of the pair *and* the surface. On a `dataTone: "shift-17"` surface `themeColor(l, "shift-9")` really paints `var(--neutral-7)` and `themeColor(l, "increase-2")` paints `var(--neutral-17)` — a gap of 10, which passes.

```ts
// Bad — shift-3 text on shift-1 bg = gap of only 2
{
  div: "Card",
  style: {
    backgroundColor: (l) => themeColor(l, "shift-1"),
    color: (l) => themeColor(l, "shift-3"),
  }
}
```

```ts
// Good — shift-11 text on shift-1 bg = gap of 10
{
  div: "Card",
  style: {
    backgroundColor: (l) => themeColor(l, "shift-1"),
    color: (l) => themeColor(l, "shift-11"),
  }
}
```

The rule only fires when both values are detected as theme vars from the same family (extracted from the CSS var string that `themeColor()` returns). If either prop is a literal or from a different family, the rule is skipped.

### Nested selector blocks

Nested blocks (`&:hover`, `&:active`, `@media …`, descendant selectors) are checked too, and they **cascade**: a declaration the block omits keeps the flat block's value, so `&:hover { background-color }` alone is measured against the base `color`. This is where the common regression lives — a hover background walking up toward the text tone.

```ts
// Flagged — the hover background lands 1 step from the inherited shift-9 text
{
  button: "Save",
  style: {
    color: (l) => themeColor(l, "text"),
    backgroundColor: (l) => themeColor(l, "inherit"),
    "&:hover": { backgroundColor: (l) => themeColor(l, "shift-8") },
  }
}
```

Nested findings are reported at **info**, not warning. A nested block is a transient state — hover, press, focus — and the design system explicitly sanctions a ±1/±2 interactive delta there, which by construction narrows the gap below `CONTRAST_SPAN` while the pointer is down. The finding is worth seeing; it must not block. A patch whose own state is deliberate declares `_doctorDisable: "low-contrast"` so the decision lives with the patch instead of surfacing at every call site (see `button()`'s solid variant and `breadcrumb()`'s separator).

Two kinds of nested block are skipped outright, because there is no contrast requirement to measure:

- **Inactive states** (`:disabled`, `[disabled]`, `[aria-disabled]`) — WCAG 2.1 SC 1.4.3 exempts text in an inactive user-interface component. A `:not([disabled])` group is stripped before the test, so it does not exempt the enabled state it guards.
- **Blocks that paint no text** — `::backdrop`, scrollbar/slider/progress pseudo-elements, and `::before`/`::after` whose `content` is absent, `""` or `none`. `::selection`, `::placeholder`, `::marker` and `::first-line` do render text and are still checked.

### Scope limit: a declared `dataTone` only

The surface this rule (and `color-shift-minimum`, and `tone-background-inherit`) resolves against is the nearest **declared** `dataTone` — an ancestor whose `dataTone` appears in the tree `diagnose()` was actually handed. A tone contributed at **runtime** instead — a portal's `node.children.insert(...)`, an imperative `_onMount` setting the attribute, a reactive branch that only sometimes renders a `dataTone` host — does not exist anywhere in that declared object graph, so there is nothing for a static walk to see. This is not specific to tone resolution: every rule in this file treats reactive/imperative content as a boundary, by the same design (see `exempts reactive-function content` throughout the test suite).

A real static fix would mean actually running the tree — constructing a real `ElementNode`, firing `_onInit`/`_onMount` — which is a fundamentally heavier analysis than Layer 1-3 performs anywhere else. That capability already exists, at the layer built for it: Layer 4 (`auditOutput`, `new ElementNode`) constructs the tree for real, so an `_onInit`-inserted portal's `dataTone` is present in the CSS/HTML it audits. Neither Layer 4 nor Layer 1-3 measures rendered contrast on a REAL page (real DOM, real browser layout, real computed styles after cascade) — for that, this repo's own browser-QA lanes run axe-core's `color-contrast` rule against the actually-rendered page (see the shared audit brief's "Real browser" section), which is the complementary check for whatever a static declared-tree walk cannot see, runtime-contributed tones included.

---

## `low-opacity` — warning / info

Interactive controls with `style.opacity` below 0.6 are difficult to see. The rule fires a **warning** when the opacity is below 0.6 with no hover-restore pattern detected, and an **info** when a `&:hover: { opacity: '1' }` style is present (hover-reveal is valid but the resting state should be at least 0.6 so the control is discoverable without hovering).

```ts
// Bad — 30% opacity with no hover restore
{ button: "Delete", style: { opacity: "0.3" } }
```

```ts
// Info-level — hover-reveal is acceptable but resting opacity should be ≥ 0.6
{
  button: "Delete",
  style: {
    opacity: "0.3",
    "&:hover": { opacity: "1" },  // detected as hover-reveal → info, not warning
  }
}
```

```ts
// Good
{ button: "Delete", style: { opacity: "0.7" } }
// Or full hover-reveal with a reasonable resting opacity
{ button: "Delete", style: { opacity: "0.6", "&:hover": { opacity: "1" } } }
```

Only string values are checked. Reactive opacity functions `(l) => ...` are skipped (they can't be evaluated without a real runtime).

---

## `dataTone-surface-contract` — warning

An element that sets `dataTone` (to any value other than `"inherit"`) creates a new tone context for its children. For that surface to be self-contained it must declare **both** `backgroundColor` (to paint the surface at the new tone) and `color` (to set the baseline text color, guaranteeing minimum legibility). If either is missing, child elements cannot rely on inherited contrast.

```ts
// Bad — sets dataTone but has no backgroundColor or color
{ div: "Card", dataTone: "shift-1" }

// Bad — sets dataTone + backgroundColor but no color
{
  div: "Card",
  dataTone: "shift-1",
  style: { backgroundColor: (l) => themeColor(l, "inherit") }
}
```

```ts
// Good — full surface contract
{
  div: "Card",
  dataTone: "shift-1",
  style: {
    backgroundColor: (l) => themeColor(l, "inherit"),
    color: (l) => themeColor(l, "shift-9"),
  }
}
```

---

## `color-shift-minimum` — warning

When an element declares `dataTone`, its text must sit at least `CONTRAST_SPAN` (9) ramp steps away from the surface that `dataTone` creates. The threshold is a **gap**, not an absolute step: `shift-N` is relative to the tone context, so on a `dataTone: "shift-17"` surface `themeColor(l, "shift-9")` resolves to step 7 and is perfectly legible (|16 − 7| = 9) even though 7 < 9. Both numbers come from `@domphy/theme` — the surface's own index from `resolveToneStep({ surface, tone: "inherit" })`, the text's from resolving `style.color` against that surface — so they are the steps the browser actually paints.

```ts
// Bad — 5 steps from the surface
{
  div: "Card",
  dataTone: "shift-1",
  style: {
    backgroundColor: "linear-gradient(var(--neutral-0), var(--neutral-1))",
    color: (l) => themeColor(l, "shift-5"),
  }
}
```

```ts
// Good — "text" clears the span from any surface
{
  div: "Card",
  dataTone: "shift-1",
  style: {
    backgroundColor: "linear-gradient(var(--neutral-0), var(--neutral-1))",
    color: (l) => themeColor(l, "text"),
  }
}
```

This rule only fires when `dataTone` is set and `style.color` resolves to a recognizable theme CSS var. It is a companion to `dataTone-surface-contract` — that rule requires the surface to declare both properties, this one checks the text clears the span.

**It defers to `low-contrast`.** When the element also declares a `backgroundColor` that resolves to a comparable theme var — the `themeColor(l, "inherit")` the surface contract asks for — the background *is* the surface, so `low-contrast` measures exactly this pair and reports it. Only one diagnostic is emitted. `color-shift-minimum` therefore covers what `low-contrast` cannot see: a background that is a gradient, an image or a literal, or one from a different color family. (The examples above use a gradient for that reason.)

---

## `descendant-color-override` — warning

A patch styles its host through **one generated class** — `.<generated> { color: var(--neutral-10) }`, specificity `(0,1,0)`. An ancestor's scoped `"& small"` block compiles to `.<generated> small { … }`, specificity `(0,1,1)`. The ancestor therefore wins on every browser regardless of injection order, and the patch's tone guarantee is discarded with **nothing at the descendant's own call site to show it**.

```ts
// Bad — the card's `& small` beats small()'s own color
{
  div: [
    { h3: feature.title, $: [heading()] },
    { small: feature.details, $: [small()] },   // small() sets shift-10
  ],
  dataTone: "shift-1",
  style: {
    backgroundColor: (l) => themeColor(l, "inherit"),
    color: (l) => themeColor(l, "shift-9"),
    "& small": {
      display: "block",
      color: (l) => themeColor(l, "shift-8"),   // (0,1,1) — wins
    },
  },
}
```

Measured in Chromium on exactly this tree: with the `color` line present the `<small>` renders `#707070` on the card's `#ededed` — **4.23:1**, below WCAG AA. Remove the line and the patch's own tone applies: `#565656` on `#ededed`, **6.27:1**.

```ts
// Good — scope layout here, leave the color to the patch
{
  div: [
    { h3: feature.title, $: [heading()] },
    { small: feature.details, $: [small({ color: "neutral" })] },
  ],
  dataTone: "shift-1",
  style: {
    backgroundColor: (l) => themeColor(l, "inherit"),
    color: (l) => themeColor(l, "shift-9"),
    "& small": { display: "block" },            // layout only
  },
}
```

To change the color, pass the patch's own `color` prop on the `<small>`, or shift the surface with `dataTone` so the patch resolves against it.

The rule is deliberately narrow, so it fires only where the conflict is provable from the tree alone:

- The selector must be `&` + a bare tag (`"& small"`, `"& > p"`, `"& img, & svg"`), a single class (`"& .caption"`), an attribute's presence (`"& [data-x]"`), or the universal selector (`"& > *"`). A pseudo-class or a compound/functional selector (`"& small:hover"`, `"& a[target]"`) is skipped — a pseudo-class describes a transient state rather than the resting color the patch guarantees, and a compound selector cannot be matched against the declared tree with confidence.
- The block must set `color` or `backgroundColor`. A layout-only block (`{ display: "block" }`) is fine and is the recommended fix.
- The element must **declare** a matching descendant whose color comes from a `$` patch OR was declared natively (`style: { color: … }` with no patch involved) — both generate the identical per-node class at `(0,1,0)`, so both are equally outranked. A prose container styling unpatched markup output — press's Markdown shell, for instance — never fires. Reactive content is a boundary, like every other declared-tree rule, and so is a reactive `class` value for the class-selector case.
- The block's value must **differ** from what the descendant would paint. A patch's own slot styling usually repeats it — `card()`'s `"& > p"` sets `themeColor(l, "text", color)`, exactly what `paragraph()` sets — and an override that changes nothing takes nothing away. Both values are resolved and compared; when either cannot be resolved (a reactive function needing a real runtime), the conflict is still reported.

The CLI's `--merge-patches` scan of `packages/ui/src` and a full run against the current tree found zero `low-contrast` findings across the current patch set (the 14 findings this rule once caught in @domphy/ui were fixed upstream).

### Scope limit: one declared tree, not the composed page

This rule (and every rule in this file) analyzes ONE tree per `diagnose()` call. It cannot see an EQUAL-specificity collision across two SEPARATE, independently-authored trees — a page shell's header nav declaring `"& a": { color: X }` and an unrelated flyout panel declaring its own `"& a": { color: Y }` — even when both are `(0,1,1)` and, if the flyout ever renders nested inside the header's DOM subtree at runtime, the browser's cascade (not selector specificity) decides the winner by injection order.

Detecting the SELECTOR TEXT collision itself would be cheap — Layer 4 already generates each tree's CSS, so two scanned files' output could be diffed for matching bare-selector-plus-property patterns with conflicting values. What makes this unsound to report is the other half: whether the two trees ever actually nest together in the real DOM is an APP-COMPOSITION fact, not something either file's own source exposes, and a codebase of any size declares many `& a` (or similar) overrides that never nest against each other. Reporting every syntactic match as a "collision" would be a heuristic with an overwhelming false-positive rate — flagging unrelated overrides across the whole codebase — which would erode trust in every other finding this tool reports (the same reasoning that keeps this rule's selector matching deliberately narrow, and pseudo-classes excluded, elsewhere on this page). Layer 4 does not implement this for the same reason: it audits one constructed `ElementNode`'s own output, not a whole assembled page, so it has no more composition knowledge than Layer 1-3 does.

Where this DOES get caught: once two components are actually mounted together, the browser has already resolved the real cascade, and the ACTUAL computed color at that point is exactly what an axe-core `color-contrast` check against the real rendered page measures — no static knowledge of which components nest is needed, because the DOM computation already did that work. Same complementary check as the runtime-`dataTone` scope limit above: this repo's browser-QA lanes (real Chromium, axe-core, both themes) are what catches a specificity collision that only exists once two independently-authored trees are actually composed.

---

## `unused-doctor-disable` — info

A `_doctorDisable` suppression entry that suppresses **nothing** on its element — modeled on ESLint v9's `reportUnusedDisableDirectives`. Stale suppressions rot silently: the rule you meant to silence may have been fixed long ago, or the id was never valid in the first place.

An entry is stale when:

- it names a **known rule** (built-in or custom via `options.rules`) that produced no diagnostic on this element, or
- it **matches no known rule id at all** — e.g. a typo like `"low-contrst"`. This is the highest-value case: the suppression silently disables nothing, so the diagnostic says the id matches no known rule.
- `_doctorDisable: true` is stale only when it suppressed **zero** diagnostics (as long as any rule fired on the element, "suppress all" is doing work and cannot be proven stale).

Suppression scope is per-element: an entry is "used" when the named rule fired on the element itself (or an array-level rule like `missing-key` fired at the element's own path) — descendant diagnostics are never suppressed, so they never count as usage.

Only entries the element declares **itself** are ever reported. A `$` patch may carry its own `_doctorDisable` (and it suppresses at every host it is applied to — see [Configuration & API](/docs/doctor/configuration)), but whether it fires depends on the patch's props and the host, and the call site could not remove it in any case.

```ts
// Bad — low-contrast never fires here; the entry is stale
{ div: "Card", _doctorDisable: "low-contrast" }

// Bad — "low-contrst" matches no known rule (typo)
{ div: "Card", _doctorDisable: "low-contrst" }

// Bad — true suppresses all, but nothing fired on this element
{ div: "Card", _doctorDisable: true }
```

```ts
// Good — inline-typography fires and is suppressed; the stale entry is removed
{ p: "Body", style: { fontSize: "20px" }, _doctorDisable: ["inline-typography"] }
```

Usage is measured against the diagnostics the rules actually produced, before the `only`/`exclude` output filter — so `exclude: ["low-contrast"]` hides the rule's diagnostics but does **not** turn a suppression that consumed one stale. The rule itself is suppressible like any other: `_doctorDisable: "unused-doctor-disable"` on the same element silences its report there, and `exclude: ["unused-doctor-disable"]` turns it off globally.
