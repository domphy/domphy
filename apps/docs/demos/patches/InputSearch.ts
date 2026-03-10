import type { DomphyElement } from '@domphy/core'
import { inputSearch, label } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

const App: DomphyElement<"div"> = {
    div: [
        {
            label: [
                "Search docs",
                {
                    input: null,
                    placeholder: "Search primitives...",
                    $: [inputSearch()],
                },
            ],
            $: [label()],
        },
        {
            label: [
                "Search users",
                {
                    input: null,
                    value: "Khanh",
                    $: [inputSearch({ accentColor: "secondary" })],
                },
            ],
            $: [label()],
        },
        {
            label: [
                "Disabled",
                {
                    input: null,
                    value: "readonly",
                    disabled: true,
                    $: [inputSearch()],
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
