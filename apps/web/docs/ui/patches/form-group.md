<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import FormGroup from "../../demos/patches/FormGroup.ts?raw"

</script>

# Form Group

Use the formGroup patch to lay out label + input pairs inside a `<fieldset>`. Unlike other patches that only style the element itself, formGroup defines a grid layout contract for its children: `legend`, `label`, inputs, and help text (`p`).

<CodeEditor :code="FormGroup" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/formGroup.ts [formGroup]
:::



