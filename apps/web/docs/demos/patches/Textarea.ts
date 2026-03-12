import type { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme";
import { textarea } from "@domphy/ui";

const App: DomphyElement<"div"> = {
    div: [
        {
            textarea: "Enter text...",
            $: [textarea()]
        },
        {
            textarea: "Disabled",
            disabled: true,
            $: [textarea()]
        },
        {
            textarea: "Long content example, try typing more text, Long content example, try typing more text",
            $: [textarea()]
        },
    ],
    style: {
        display: "flex",
        flexWrap: "wrap",
        rowGap: themeSpacing(9),
        columnGap: themeSpacing(4),
    },
}

export default App
