import { type DomphyElement } from '@domphy/core'
import { paragraph, strong } from "@domphy/ui"

const App: DomphyElement<"p"> = {
    p: [
        "Status: ",
        {
            strong: "Production Ready",
            $: [strong()],
        },
    ],
    $: [paragraph()],
}

export default App
