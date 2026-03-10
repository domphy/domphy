import { type DomphyElement } from '@domphy/core'
import { emphasis, paragraph } from "@domphy/ui"

const App: DomphyElement<"p"> = {
    p: [
        "Please read the ",
        {
            em: "important",
            $: [emphasis()],
        },
        " note before deployment.",
    ],
    $: [paragraph()],
}

export default App
