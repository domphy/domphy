<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Command from "../../demos/patches/Command.ts?raw"

</script>

# Command

Build a command palette with three coordinated patches. Apply `command()` to the outer container — it creates a shared context that carries a live query `State`. Place a `commandSearch()` input inside to wire the text field into that query, then add `commandItem()` entries that hide themselves automatically when their text does not match the current query.

<CodeEditor :code="Command" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/command.ts [command]
:::



