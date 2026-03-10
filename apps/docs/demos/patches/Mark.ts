import { DomphyElement } from '@domphy/core'
import { mark } from "@domphy/ui"

const App: DomphyElement<"mark"> = {
    mark: "highlighted text",
    $: [mark()],
}

export default App
