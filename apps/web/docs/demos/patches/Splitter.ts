import { type DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { splitter, splitterPanel, splitterHandle } from "@domphy/ui"

const App: DomphyElement<"div"> = {
    div: [
        { div: "Left panel",  $: [splitterPanel()] },
        { div: null,          $: [splitterHandle()], style: { width: themeSpacing(1) } },
        { div: "Right panel", $: [splitterPanel()] },
    ],
    $: [splitter()],
    style: { height: themeSpacing(75) },
}

export default App
