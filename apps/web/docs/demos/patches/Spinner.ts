import { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { spinner } from "@domphy/ui"

const App: DomphyElement<"div"> = {
    div: [
        { span: null, $: [spinner()] },
        { span: null, $: [spinner({ color: "success" })] },
        { span: null, $: [spinner({ color: "error" })] },
        { span: null, $: [spinner({ color: "neutral" })] },
    ],
    style: {
        display: "flex",
        alignItems: "center",
        gap: themeSpacing(4),
    },
}

export default App
