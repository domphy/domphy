import { type DomphyElement } from '@domphy/core'
import { horizontalRule, paragraph } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

const App: DomphyElement<"div"> = {
    div: [
        {
            p: "Section A content",
            $: [paragraph()],
        },
        {
            hr: null,
            $: [horizontalRule()],
        },
        {
            p: "Section B content",
            $: [paragraph()],
        },
        {
            hr: null,
            $: [horizontalRule({ color: "primary" })],
        },
        {
            p: "Section C content",
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
