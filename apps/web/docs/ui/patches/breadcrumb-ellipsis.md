<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import BreadcrumbEllipsis from "../../demos/patches/BreadcrumbEllipsis.ts?raw"

</script>

# Breadcrumb Ellipsis

Use `breadcrumbEllipsis` on a `button` element to represent collapsed items in a breadcrumb trail. It renders an accessible trigger with hover and focus-visible states. Typically placed inside a `breadcrumb` nav alongside `link` items.

<CodeEditor :code="BreadcrumbEllipsis" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/breadcrumbEllipsis.ts [breadcrumbEllipsis]
<<< ../../../../../packages/ui/src/patches/breadcrumb.ts [breadcrumb]
:::



