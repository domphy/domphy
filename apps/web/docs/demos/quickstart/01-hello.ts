import { type DomphyElement, toMount } from "@domphy/core"
import { themeApply } from "@domphy/theme"

themeApply()

const App: DomphyElement<"div"> = {
    div: [
        { h1: "Hello, Domphy" },
        { p: "A plain object becomes a real DOM element." },
    ],
}

export default App
