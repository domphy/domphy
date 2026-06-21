<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Progress from "../../demos/patches/Progress.ts?raw"

</script>

# Progress

Apply the progress patch to a native `<progress>` element to replace browser-default styling with a pill-shaped track and a themed fill that transitions smoothly. Use `color` for the track tone and `accentColor` for the filled value tone.

<CodeEditor :code="Progress" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/progress.ts [progress]
:::



