import { type DomphyElement } from '@domphy/core'
import { menu, menuItem } from "@domphy/ui"

const items = ["Home", "About", "Services", "Portfolio", "Contact"]

const App: DomphyElement<"nav"> = {
    nav: items.map(label => ({
        button: label,
        $: [menuItem()],
    })),
    $: [menu()]
}

export default App
