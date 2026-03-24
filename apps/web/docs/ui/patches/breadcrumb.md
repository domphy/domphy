<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Breadcrumb from "../../demos/patches/Breadcrumb.ts?raw"

</script>

# Breadcrumb

Use `breadcrumb` on a `nav` element. It styles direct children automatically. Mark the current page by setting `ariaCurrent: "page"` directly on the current item. The separator is configured once via the `separator` prop.

Use `breadcrumbEllipsis` on a `button` element to represent collapsed breadcrumb items.

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



