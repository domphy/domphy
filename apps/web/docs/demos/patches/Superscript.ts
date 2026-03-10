import { type DomphyElement } from '@domphy/core'
import { paragraph, superscript } from "@domphy/ui"

const App: DomphyElement<"p"> = {
    p: [
        "x",
        {
            sup: "2",
            $: [superscript()],
        },
        " + y",
        {
            sup: "2",
            $: [superscript()],
        },
        " = z",
        {
            sup: "2",
            $: [superscript()],
        },
    ],
    $: [paragraph()],
}

export default App
