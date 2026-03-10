import type { DomphyElement } from '@domphy/core'
import { inputDateTime, label } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

const App: DomphyElement<"div"> = {
    div: [
        {
            label: [
                "Date",
                {
                    input: null,
                    value: "2026-03-05",
                    $: [inputDateTime({ mode: "date" })],
                },
            ],
            $: [label()],
        },
        {
            label: [
                "Time",
                {
                    input: null,
                    value: "14:30",
                    $: [inputDateTime({ mode: "time" })],
                },
            ],
            $: [label()],
        },
        {
            label: [
                "Date and time",
                {
                    input: null,
                    value: "2026-03-05T14:30",
                    $: [inputDateTime({ mode: "datetime-local", accentColor: "secondary" })],
                },
            ],
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
