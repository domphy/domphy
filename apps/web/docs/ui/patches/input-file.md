<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputFile from "../../demos/patches/InputFile.ts?raw"

</script>

# Input File

Styles a native file input with a themed upload button, border, hover, focus, and disabled states. Apply to an `<input type="file">` element — the patch sets `type: "file"`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` (or `State`) | `"neutral"` | Theme color tone for text, border, and the upload button. |
| `accentColor` | `ThemeColor` (or `State`) | `"primary"` | Theme color tone for the hover/focus ring. |

<CodeEditor :code="InputFile" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputFile.ts [inputFile]
:::



