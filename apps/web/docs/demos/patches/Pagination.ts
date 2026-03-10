import { DomphyElement, toState } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { pagination } from "@domphy/ui"

const page = toState(1)
const page2 = toState(5)

const App: DomphyElement<"div"> = {
    div: [
        {
            div: [],
            $: [pagination({ value: page, total: 5 })],
        },
        {
            div: [],
            $: [pagination({ value: page2, total: 20 })],
        },
    ],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(4),
    },
}

export default App
