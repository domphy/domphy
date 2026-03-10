import { type DomphyElement } from '@domphy/core'
import { abbreviation, paragraph } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

const App: DomphyElement<"div"> = {
    div: [
        {
            p: [
                "Working with ",
                {
                    abbr: "API",
                    title: "Application Programming Interface",
                    $: [abbreviation()],
                },
                " design patterns improves maintainability.",
            ],
            $: [paragraph()],
        },
        {
            p: [
                "Use ",
                {
                    abbr: "SSR",
                    title: "Server-Side Rendering",
                    $: [abbreviation({ accentColor: "secondary" })],
                },
                " when first paint matters.",
            ],
            $: [paragraph()],
        },
    ],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(2),
    },
}

export default App
