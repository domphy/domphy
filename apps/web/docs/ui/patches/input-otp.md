<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputOTP from "../../demos/patches/InputOTP.ts?raw"

</script>

# Input OTP

Use the inputOTP patch to customize this component.

<CodeEditor :code="InputOTP" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inputOTP | n/a | n/a | 0 | 0 | 0 | 0 | 0 | 0 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputOTP.ts [inputOTP]
:::


