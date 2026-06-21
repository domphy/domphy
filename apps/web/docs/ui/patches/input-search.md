<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputSearch from "../../demos/patches/InputSearch.ts?raw"

</script>

# Input Search

Styles a search input with themed border, padding, placeholder color, native search decorations, hover, focus, and disabled states. Apply to an `<input type="search">` element — the patch sets `type: "search"`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` (or `State`) | `"neutral"` | Theme color tone for text, border, and placeholder. |
| `accentColor` | `ThemeColor` (or `State`) | `"primary"` | Theme color tone for the hover/focus ring. |

<CodeEditor :code="InputSearch" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputSearch.ts [inputSearch]
:::



