import { DomphyElement } from '@domphy/core'
import { orderedList } from "@domphy/ui"

const App: DomphyElement<"ol"> = {
    ol: [
        { li: "Item one" },
        { li: "Item two" },
        { li: "Item three" },
    ],
    $: [orderedList()],
}

export default App
