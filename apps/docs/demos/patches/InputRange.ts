import { type DomphyElement } from '@domphy/core'
import { inputRange, label } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

const App: DomphyElement<"div"> = {
    div: [
        {
            label: [
                "Volume",
                {
                    input: null,
                    min: 0,
                    max: 100,
                    value: 35,
                    $: [inputRange()],
                },
            ],
            $: [label()],
        },
        {
            label: [
                "Balance",
                {
                    input: null,
                    min: 0,
                    max: 100,
                    value: 70,
                    $: [inputRange({ accentColor: "secondary" })],
                },
            ],
            $: [label()],
        },
        {
            label: [
                "Disabled",
                {
                    input: null,
                    min: 0,
                    max: 100,
                    value: 50,
                    disabled: true,
                    $: [inputRange()],
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
