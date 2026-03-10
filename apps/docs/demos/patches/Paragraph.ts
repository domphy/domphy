import { DomphyElement } from '@domphy/core'
import { paragraph } from "@domphy/ui"

const App: DomphyElement<"p"> = {
    p: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    $: [paragraph()],
}

export default App
