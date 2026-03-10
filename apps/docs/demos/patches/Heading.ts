import { DomphyElement } from '@domphy/core'
import { heading } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

const App: DomphyElement<"div"> = {
    div: [
        {
            h1: "Heading 1",
            $: [heading()],
        },
        {
            h2: "Heading 2",
            $: [heading()],
        },
        {
            h3: "Heading 3",
            $: [heading()],
        },
        {
            h4: "Heading 4",
            $: [heading()],
        },
        {
            h5: "Heading 5",
            $: [heading()],
        },
        {
            h6: "Heading 6",
            $: [heading()],
        },
    ],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(1),
    },
}

export default App
