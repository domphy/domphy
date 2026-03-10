import { type DomphyElement } from '@domphy/core'
import { paragraph, subscript } from "@domphy/ui"

const App: DomphyElement<"p"> = {
    p: [
        "H",
        {
            sub: "2",
            $: [subscript()],
        },
        "O is essential for life.",
    ],
    $: [paragraph()],
}

export default App
