<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Card from "../../demos/patches/Card.ts?raw"

</script>

# Card

Use the card patch to customize this component.

<CodeEditor :code="Card" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/card.ts [card]
:::



