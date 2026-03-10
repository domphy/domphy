import { type DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { progress } from "@domphy/ui"

const App: DomphyElement<"div"> = {
    div: [
        {
            progress: null,
            max: 100,
            value: 35,
            $: [progress()],
        },
        {
            progress: null,
            max: 100,
            value: 72,
            $: [progress({ accentColor: "success" })],
        },
    ],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(4),
    },
}

export default App
