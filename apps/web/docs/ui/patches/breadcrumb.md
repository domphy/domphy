<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Breadcrumb from "../../demos/patches/Breadcrumb.ts?raw"

</script>

# Breadcrumb

Use `breadcrumb` on a `nav` element. It styles the inner `ol`/`ul` and `li` elements automatically. Mark the current page by setting `ariaCurrent: "page"` directly on the `li`. The separator is configured once via the `separator` prop.

Use `breadcrumbEllipsis` on a `button` element inside a `li` to represent collapsed breadcrumb items.

<CodeEditor :code="Breadcrumb" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breadcrumb | shift-5/shift-7 | inherit | 1 | 0 | 6 | — | — | — |
| breadcrumbEllipsis | shift-5/shift-7 | inherit | 1 | 0 | 6 | 0 | 1 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/breadcrumb.ts [breadcrumb]
<<< ../../../../../packages/ui/src/patches/breadcrumbEllipsis.ts [breadcrumbEllipsis]
:::


