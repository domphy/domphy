<script setup lang="ts">

import Breadcrumb from "../../demos/patches/Breadcrumb.ts?raw"

</script>

# Breadcrumb

Use `breadcrumb` on a `nav` element. It styles direct children automatically (layout, separators, and marking the current item non-interactive), but does not paint `color` on them — each crumb (`link()` for non-current items, `strong()` for the current one, or any other patch) owns its own color. Mark the current page by setting `ariaCurrent: "page"` directly on the current item; wrap it in `strong()` for the usual "reads stronger" emphasis. The separator is configured once via the `separator` prop.

Use `breadcrumbEllipsis` on a `button` element to represent collapsed breadcrumb items.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Color tone for the breadcrumb. |
| `separator` | `string` | `"/"` | Separator character rendered between breadcrumb items. |

<CodeEditor :code="Breadcrumb" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/breadcrumb.ts [breadcrumb]
<<< ../../../../../packages/ui/src/patches/breadcrumbEllipsis.ts [breadcrumbEllipsis]
:::



