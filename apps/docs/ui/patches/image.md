<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Image from "../../demos/patches/Image.ts?raw"

</script>

# Image

Use the image patch to customize this component.

<CodeEditor :code="Image" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| image | shift-1 | inherit | n>=1 | 2 | 6n+4 | 2 | 4 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/image.ts [image]
:::
