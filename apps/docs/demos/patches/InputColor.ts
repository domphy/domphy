import type { DomphyElement } from '@domphy/core'
import { inputColor, label } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

const App: DomphyElement<"div"> = {
    div: [
        {
            label: [
                "Primary color",
                {
                    input: null,
                    value: "#4f7cff",
                    $: [inputColor()],
                },
            ],
            $: [label()],
        },
        {
            label: [
                "Accent color",
                {
                    input: null,
                    value: "#2bc5a1",
                    $: [inputColor({ accentColor: "secondary" })],
                },
            ],
            $: [label()],
        },
    ],
    style: {
        display: "flex",
        flexWrap: "wrap",
        rowGap: themeSpacing(4),
        columnGap: themeSpacing(6),
    },
}

export default App
