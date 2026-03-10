# UI
The `@domphy/ui` package is the official collection of Patches. Each patch is a `PartialElement` object from `@domphy/core` that applies styles, attributes, or behaviors to any element. A patch does not render a new element — it transforms an existing one by merging into it. Patches are designed with minimal props and context awareness, reducing the effort needed to read documentation while ensuring simple, flexible customization.

```typescript
import { button, tooltip } from "@domphy/ui"

const submitButton = {
    button: "Submit",
    $: [
        button({ color: "primary" }),
        tooltip({ content: "Submit the form" }),
    ]
}
```

All patches in `@domphy/ui` automatically apply the context-aware Tone and Size systems from `@domphy/theme`. No manual color tokens or spacing values are required.

The patch documentation is structured as a flat catalog. The sections below serve as usage-oriented references rather than strict source layers.

## Patches Dimensions

All dimension values are spacing units (`U`). Base unit: `U = fontSize / 4`. Formula: `Height = NLines × 6 + 2 × WrappingLevel`.

The table below covers the main size families. Multi-part or behavior-first patches such as [Card](/ui/patches/card), [Command](/ui/patches/command), [Input OTP](/ui/patches/input-otp), [Splitter](/ui/patches/splitter), [Toggle](/ui/patches/toggle), and `toggleGroup()` are documented on their own pages.

| Height | Patches |
| --- | --- |
| 1px | (Separators) [Horizontal Rule](/ui/patches/horizontal-rule) |
| 2U | [Progress](/ui/patches/progress), [Popover Arrow](/ui/patches/popover-arrow) |
| 4U | [Input Checkbox](/ui/patches/input-checkbox), [Input Radio](/ui/patches/input-radio), [Input Range](/ui/patches/input-range), [Input Switch](/ui/patches/input-switch) |
| 6U | [Code](/ui/patches/code), [Keyboard](/ui/patches/keyboard), [Mark](/ui/patches/mark), [Abbreviation](/ui/patches/abbreviation), [Badge](/ui/patches/badge), [Breadcrumb Ellipsis](/ui/patches/breadcrumb), [Emphasis](/ui/patches/emphasis), [Heading](/ui/patches/heading), [Icon](/ui/patches/icon), [Label](/ui/patches/label), [Link](/ui/patches/link), [Small](/ui/patches/small), [Spinner](/ui/patches/spinner), [Strong](/ui/patches/strong), [Subscript](/ui/patches/subscript), [Superscript](/ui/patches/superscript), [Tag](/ui/patches/tag), [Skeleton](/ui/patches/skeleton), [Toggle](/ui/patches/toggle)  |
| 6n U | [Breadcrumb](/ui/patches/breadcrumb), [Ordered List](/ui/patches/ordered-list), [Paragraph](/ui/patches/paragraph), [Unordered List](/ui/patches/unordered-list), [Description List](/ui/patches/description-list) |
| 8U | [Avatar](/ui/patches/avatar), [Button](/ui/patches/button), [Button Switch](/ui/patches/button-switch), [Combobox](/ui/patches/combobox), [Divider](/ui/patches/divider), [Input Color](/ui/patches/input-color), [Input Date Time](/ui/patches/input-date-time), [Input File](/ui/patches/input-file), [Input Number](/ui/patches/input-number), [Input Search](/ui/patches/input-search), [Input Text](/ui/patches/input-text), [Menu Item](/ui/patches/menu), [Pagination](/ui/patches/pagination), [Select](/ui/patches/select), [Select Box](/ui/patches/select-box), [Select Item](/ui/patches/select-list), [Select List](/ui/patches/select-list), [Tab](/ui/patches/tabs), [Tooltip](/ui/patches/tooltip) |
| 8n U | [Table](/ui/patches/table) |
| (6n+4) U | [Alert](/ui/patches/alert), [Blockquote](/ui/patches/blockquote), [Details](/ui/patches/details), [Figure](/ui/patches/figure), [Image](/ui/patches/image), [Popover](/ui/patches/popover), [Preformated](/ui/patches/preformated), [Tabs](/ui/patches/tabs), [Textarea](/ui/patches/textarea), [Toast](/ui/patches/toast) |
| — | (Layout Regions) [Dialog](/ui/patches/dialog), [Drawer](/ui/patches/drawer), [Form Group](/ui/patches/form-group), [Menu](/ui/patches/menu), [Tab Panel](/ui/patches/tabs) |
| — | (Behavior) [TransitionGroup](/ui/patches/transition-group) |

The formula applies to elements at or above the **6U baseline** — the height of one body text line, which is the most visually dominant unit in any layout. Elements intentionally sized below this baseline follow a proportional sub-scale of **2U / 4U / 6U** (ratio 1:2:3). Input Checkbox, Input Radio, and Input Switch have a 4U visual indicator inside a 6U hit area and auto-align correctly. Progress (2U) and Input Range (4U) are full-element sub-baseline sizes and require manual vertical alignment when placed inline.

## Customization

!!!include(snippets/customization.md)!!!

## Creation

This guide aims to ensure API stability, minimize breaking changes, and provide a strong developer experience. Before creating a new patch, understand Core and the design system, then try customizing existing patches first. Only create a new patch when genuine reuse across multiple projects is necessary.

**Rules:**

- A patch is a function returning a `PartialElement` — a `DomphyElement`-shaped object without a `tag:content` pair.
- Each patch must be independent. Do not import other patches or local files.
- Keep one patch per file. Do not bundle multiple patches into a single module.
- Pass state via props or read it from context. Never mix state into patch internals.
- Only include strictly required attributes, such as accessibility attributes (`role`, `aria-*`).
- Declare events (`onClick`, `onKeyDown`, etc.) flat in the partial object — not inside hooks. Nesting event listeners inside hooks creates deep, hard-to-read callback chains and makes it difficult to see at a glance what a patch responds to. The only valid exception is writing a DOM event listener (e.g. `transitionend`) inside `_onBeforeRemove`, because `done()` — which must be called to complete the removal — is only available in that hook's scope.
- Only create sub-patches (e.g. `commandSearch`, `commandItem`, `tab`, `tabPanel`, `cardHeader`, `cardBody`) when the component genuinely requires shared context between parent and child (e.g. `Tabs` coordinating active state).
- The fastest way to start is by copying and modifying an existing patch.

**Props:**

- Props must be a single object parameter (`{}`) with minimal keys to preserve stability and call-site readability. Do not export the props type.
- Only add a prop when a value recurs frequently enough that inline overriding becomes impractical.
- `color` (defaults to `neutral`) and `accentColor` (defaults to `primary` for indicators, focus states, etc.) are the standard props used across most patches.

**Styles:**

Apply styles in priority order — always prefer the highest level that applies:

1. **Patch** — if a patch already covers the visual need, use it. Never write raw CSS when a patch exists. Example: use `small()` instead of `fontSize: "0.875em"`, use `paragraph()` instead of `lineHeight: "1.5"`.
2. **Theme** — if no patch applies, use theme functions: `themeSpacing()`, `themeSize()`, `themeColor()`. These values are context-aware and scale with the design system.
3. **Fixed** — only when neither a patch nor a theme function can express the value (e.g., `border: "none"`, `display: "flex"`, `1px` separators).

- Strictly adhere to `@domphy/theme` rules.
- Overlay elements should use tone `shift-11` (invert).

### Tag-name contract (template pattern)

When a patch defines a complex layout with multiple named regions — and the regions can be identified by their HTML tag — use CSS child selectors keyed by tag name instead of creating sub-patches. Each direct child tag maps to exactly one layout slot. The patch owns the entire layout; the user only places semantic elements.

```
div $[card()]
├── img        → image area  (full width)
├── h2 / h3   → title area  (col 1)
├── p          → description (col 1)
├── aside      → extra slot  (col 2, spans title + desc)
├── div        → content     (full width)
└── footer     → actions     (full width, flex row)
```

This is implemented with `grid-template-areas` hardcoded inside the patch. Unused slots collapse to zero height automatically — no placeholder elements needed. The contract is: **one tag = one slot**. Looking at the tag tells you its position; no sub-patch names to remember.

Use this pattern when:
- The layout has 4 or more distinct regions that cannot be naturally nested.
- All slots are identifiable by a unique HTML tag among direct children.
- Sub-patches would only add naming overhead without providing shared state or behavior.

This pattern scales to more complex templates (e.g. a dashboard tile with `header`, `aside`, `section`, `figure`, `footer`) as long as each slot uses a distinct tag. When two slots need the same tag, fall back to sub-patches.

### Example button patch
::: code-group
<<< ../../../packages/ui/src/patches/button.ts [button]
:::

## Excludes

These patterns are intentionally not shipped as patches. Either the browser already provides the behavior natively, the design constraint cannot be satisfied within `@domphy/theme` rules, or an external library handles it better than a patch ever could.

| Pattern | Why no patch | Alternative |
| --- | --- | --- |
| Accordion | `<details>` / `<summary>` provide open/close natively with no JS — a patch would only add visual style, not behavior. | [`details` patch](/ui/patches/details) |
| Progress Circle | Requires a fixed pixel dimension (SVG `r` or `border-radius: 50%`), which conflicts with the typography-based size formula in `@domphy/theme`. No correct size can be computed at theme level. | SVG directly with `stroke-dashoffset` animation |
| Drag and Drop | Sorting, reordering, and cross-list drag require hit-testing, ghost elements, and scroll handling — far beyond what a patch can own. | [SortableJS integration](/integrations/sortablejs) |
| Form Validation | Schema validation, error mapping, and async rules belong to the data layer, not the UI layer. A patch cannot own validation logic without violating the data/UI boundary. | [Zod integration](/integrations/zod) |
| Data Fetching / Async State | Loading, caching, refetch, and error state are data concerns. Wrapping them in a patch blurs ownership and increases abstraction for no gain. | [TanStack Query integration](/integrations/tanstack-query) |
| Routing | Page transitions and URL-to-view mapping are application-level concerns, not element-level. | [page.js integration](/integrations/pagejs) |
| i18n | Translation lookup, locale switching, and pluralization belong to a dedicated i18n library. A patch cannot own locale state without leaking data concerns into UI. | [i18next integration](/integrations/i18next) |
