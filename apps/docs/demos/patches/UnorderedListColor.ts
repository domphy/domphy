import { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { unorderedList } from "@domphy/ui"

const App: DomphyElement<"div"> = {
    div: [
        {
            ul: [{ li: "One" }, { li: "Two" }],
            $: [unorderedList({ color: "primary" })],
        },
        {
            ul: [{ li: "One" }, { li: "Two" }],
            $: [unorderedList({ color: "success" })],
        },
    ],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(2),
    },
}

export default App
