<script setup lang="ts">

import Details from "../../demos/patches/Details.ts?raw"

</script>

# Details

Use `details` on a `details` element. It styles a native disclosure widget: the `summary` child gets a themed header with a rotating chevron indicator, and the body content gets an expand/collapse transition. The `color` prop controls the surface and text tone. The `accentColor` prop controls the summary focus outline tone. The `duration` prop sets the transition speed in milliseconds (default `240`).

<CodeEditor :code="Details" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/details.ts [details]
:::



