import { DomphyElement } from '@domphy/core'
import { divider } from "@domphy/ui"

const App: DomphyElement<"div"> = {
    div: "Section",
    $: [divider()],
}

export default App
