<script setup lang="ts">

import Link from "../../demos/patches/Link.ts?raw"

</script>

# Link

Apply the `link` patch to an `<a>` element to get themed text color, hover underline, visited-state styling, focus ring, and a disabled state. Must be used on an `<a>` element. Note that the defaults (`color: "primary"`, `accentColor: "secondary"`) differ from other text patches, which default to `"neutral"` and `"primary"`.

WAI-ARIA APG: an `<a>` with no `href` is not natively focusable or keyboard-operable. When the host has no `href`, `link()` adds `role="link"`, `tabIndex={0}`, and Enter/Space activation so a scripted (no-href) link stays operable — a real `href` makes all three a no-op, since `<a href>` is already natively focusable with an implicit `role="link"`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ValueOrState<ThemeColor>` | `"primary"` | Base color tone for the link text. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"secondary"` | Accent color tone for visited and focus states. |

<CodeEditor :code="Link" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/link.ts [link]
:::



