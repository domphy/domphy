import { DomphyElement } from '@domphy/core'
import { button, tooltip } from "@domphy/ui"

const App: DomphyElement<"button"> = {
    button: "Hover Me",
    $: [button(), tooltip({ content: "Tooltip content" })]
}

export default App
