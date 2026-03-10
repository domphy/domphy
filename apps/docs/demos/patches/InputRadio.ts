import type { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme";
import { inputRadio } from "@domphy/ui";

const App: DomphyElement<"div"> = {
    div: [
        {
            input: null,
            $: [inputRadio()]
        },
        {
            input: null,
            disabled: true,
            $: [inputRadio()]
        },
        {
            input: null,
            checked: true,
            $: [inputRadio()]
        },
        {
            input: null,
            checked: true,
            disabled: true,
            $: [inputRadio()]
        }
    ],
    style: {
        display: "flex",
        flexWrap: "wrap",
        rowGap: themeSpacing(8),
        columnGap: themeSpacing(4),
    },
}

export default App
