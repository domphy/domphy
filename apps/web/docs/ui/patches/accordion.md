<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Accordion from "../../demos/patches/Accordion.ts?raw"

</script>

# Accordion

Use `accordion` on a container of `<details>` elements to build a bordered accordion. In `type: "single"` mode (default), opening one item automatically closes all siblings. Pair with `details` patches on the child `<details>` elements.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `"single" \| "multiple"` | `"single"` | In single mode, opening one item closes all siblings. |
| `color` | `ThemeColor \| State<ThemeColor>` | `"neutral"` | Border and background tone. |
| `accentColor` | `ThemeColor \| State<ThemeColor>` | `"primary"` | Focus-outline tone on summary elements. |

<CodeEditor :code="Accordion" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/accordion.ts [accordion]
<<< ../../../../../packages/ui/src/patches/details.ts [details]
:::



