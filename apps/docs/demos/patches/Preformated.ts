import { DomphyElement } from '@domphy/core'
import { preformated } from "@domphy/ui"

const App: DomphyElement<"pre"> = {
    pre: "const x = 1\nconsole.log(x)",
    $: [preformated()],
}

export default App
