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

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/avatar.ts [avatar]
:::



