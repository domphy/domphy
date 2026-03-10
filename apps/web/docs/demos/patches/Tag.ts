import { DomphyElement } from '@domphy/core'
import { tag } from "@domphy/ui"

const App: DomphyElement<"span"> = {
    span: "Tag",
    $: [tag()],
}

export default App
