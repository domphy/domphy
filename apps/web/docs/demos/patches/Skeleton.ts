import { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { skeleton } from "@domphy/ui"

const App: DomphyElement<"div"> = {
    div: [
        {
            div: null,
            $: [skeleton()],
            style: { width: "100%", height: themeSpacing(5) },
        },
        {
            div: null,
            $: [skeleton()],
            style: { width: "75%", height: themeSpacing(5) },
        },
        {
            div: null,
            $: [skeleton({ radius: 99 })],
            style: { width: themeSpacing(12), height: themeSpacing(12) },
        },
    ],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(3),
        maxWidth: themeSpacing(80),
    },
}

export default App
