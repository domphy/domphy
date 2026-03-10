import { DomphyElement } from '@domphy/core'
import { unorderedList } from "@domphy/ui"

const App: DomphyElement<"ul"> = {
    ul: [
        { li: "Item one" },
        { li: "Item two" },
        { li: "Item three" },
    ],
    $: [unorderedList()],
}

export default App
