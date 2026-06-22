<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Link from "../../demos/patches/Link.ts?raw"

</script>

# Link

Apply the `link` patch to an `<a>` element to get themed text color, hover underline, visited-state styling, focus ring, and a disabled state. Must be used on an `<a>` element. Note that the defaults (`color: "primary"`, `accentColor: "secondary"`) differ from other text patches, which default to `"neutral"` and `"primary"`.

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



