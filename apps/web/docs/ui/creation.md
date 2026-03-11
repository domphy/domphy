# Creation

Create a new patch only after you understand `core`, `theme`, and the customization path.

The goal is to keep the patch API stable, predictable, and easy to scan in app code.

## Rules

- A patch is a function returning a `PartialElement`.
- A patch is not a component and does not own a tag-content pair.
- Keep one patch per file.
- Do not import other patches or local helper files into a patch file.
- Pass state through props or context. Do not hide state inside patch internals.
- Only include attributes that are really required, especially accessibility attributes.
- Declare DOM events flat on the partial object, not inside hooks.
- Only create sub-patches when parent and child really need shared context or behavior.
- The fastest way to start is copying a similar patch and editing it.

## Props

- Use one object parameter with a default of `{}`.
- Keep the prop surface minimal.
- Do not export the props type.
- Add a prop only when the value recurs often enough that inline override becomes awkward.
- `color` and `accentColor` are the common prop patterns across many patches.

## Styles

Apply styles in this order of preference:

1. Patch
2. Theme helper
3. Fixed raw CSS

Use an existing patch first. If no patch fits, use `themeSpacing()`, `themeSize()`, and `themeColor()`. Only fall back to raw fixed values when the system cannot express the value.

Overlay elements should use tone `shift-11`.

## Not To Do

- Do not put normal DOM event logic inside hooks; use flat event keys like `onClick`, `onInput`, and `onKeyDown` directly on the partial object instead. The main exception is `_onBeforeRemove`, where a DOM listener such as `transitionend` may be necessary because `done()` only exists there.
- Do not use `_key` as selected state, active id, or general business identity; keep `_key` only for child diffing during reactive updates.
- Do not reuse the same `DomphyElement` or `PartialElement` object across multiple inserts; create a fresh object each time with a factory function or inside the loop.
- Do not hide simple visual state changes inside hooks; if the change is really an attribute or style update, use reactive attributes or reactive style props directly.
- Do not skip `done()` in `_onBeforeRemove`; if `done()` is not called, the node will never finish removal.
- Do not create local helper functions inside patch files; keep the file as one patch factory so the structure stays predictable across the library.

## Tag-Name Contract

When a patch owns a complex layout with multiple named regions, and each region can be identified by a unique child tag, prefer CSS child selectors keyed by tag name instead of inventing sub-patches.

```text
div $[card()]
├── img      -> image area
├── h2 / h3  -> title
├── p        -> description
├── aside    -> extra slot
├── div      -> content
└── footer   -> actions
```

Use this pattern when:

- the layout has many distinct slots
- each slot already has a natural semantic tag
- sub-patches would only add naming overhead

If two different slots need the same tag, fall back to sub-patches.

## Reference Example

::: code-group
<<< ../../../../packages/ui/src/patches/button.ts [button]
:::

## When Not To Create A Patch

Some patterns should stay outside `@domphy/ui`.

| Pattern | Why no patch | Alternative |
| --- | --- | --- |
| Accordion | Native `<details>` / `<summary>` already provide the behavior. | [`details` patch](/docs/ui/patches/details) |
| Progress Circle | Needs fixed pixel geometry that does not fit the typography-based dimension rules. | SVG directly |
| Drag and Drop | Hit-testing, ghost elements, and sorting logic are beyond patch scope. | [SortableJS integration](/docs/integrations/sortablejs) |
| Form Validation | Validation belongs to the data layer, not the UI patch layer. | [Zod integration](/docs/integrations/zod) |
| Data Fetching / Async State | Loading and caching belong to data tools. | [TanStack Query integration](/docs/integrations/tanstack-query) |
| Routing | Routing is application-level, not element-level. | [page.js integration](/docs/integrations/pagejs) |
| i18n | Locale and translation state belong to a dedicated i18n system. | [i18next integration](/docs/integrations/i18next) |
