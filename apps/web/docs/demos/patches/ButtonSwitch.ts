import { DomphyElement } from '@domphy/core'
import { buttonSwitch } from "@domphy/ui"

const App: DomphyElement<"button"> = {
    button: [
        {
            span: "",
        },
    ],
    $: [buttonSwitch()],
}

export default App
