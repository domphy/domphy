import { DomphyElement } from '@domphy/core'
import { tabs, tab, tabPanel } from "@domphy/ui"

const numbers = [1, 2, 3, 4, 5]

const App: DomphyElement<"div"> = {

    div: [
        {
            div: numbers.map(n => {
                return {
                    button: "Tab " + n,
                    $: [tab()],
                }
            }),
            style: {
                display: "flex",
            }
        },
        {
            div: numbers.map(n => {
                return {
                    div: "Panel " + n,
                    $: [tabPanel()],
                }
            }),
        }
    ],
    $: [tabs()]
}

export default App
