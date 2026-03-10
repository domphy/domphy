import { DomphyElement } from '@domphy/core'
import { keyboard } from "@domphy/ui"

const App: DomphyElement<"kbd"> = {
    kbd: "Ctrl+K",
    $: [keyboard()],
}

export default App
