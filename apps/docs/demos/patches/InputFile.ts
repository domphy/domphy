import type { DomphyElement } from '@domphy/core'
import { inputFile, label } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

const App: DomphyElement<"div"> = {
    div: [
        {
            label: [
                "Upload avatar",
                {
                    input: null,
                    accept: "image/*",
                    $: [inputFile()],
                },
            ],
            $: [label()],
        },
        {
            label: [
                "Upload documents",
                {
                    input: null,
                    multiple: true,
                    $: [inputFile({ accentColor: "secondary" })],
                },
            ],
            $: [label()],
        },
        {
            label: [
                "Disabled input file",
                {
                    input: null,
                    disabled: true,
                    $: [inputFile()],
                },
            ],
            ariaDisabled: true,
            $: [label()],
        },
    ],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(4),
    },
}

export default App
