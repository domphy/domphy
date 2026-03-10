<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Avatar from "../../demos/patches/Avatar.ts?raw"

</script>

# Avatar

Use the avatar patch on a `span` element. Put text (initials) or an `img` directly as children — the patch styles the container and automatically makes any child `img` cover the full area.

<CodeEditor :code="Avatar" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| avatar | shift-3/shift-8 | inherit | — | — | 8 | — | — | 50% |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/avatar.ts [avatar]
:::
