import { DomphyElement } from '@domphy/core'
import { small } from "@domphy/ui"

const App: DomphyElement<"small"> = {
    small: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    $: [small()],
}

export default App
