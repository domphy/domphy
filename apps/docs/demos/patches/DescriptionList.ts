import { type DomphyElement } from '@domphy/core'
import { descriptionList } from "@domphy/ui"

const App: DomphyElement<"dl"> = {
    dl: [
        { dt: "Framework" },
        { dd: "Domphy UI" },
        { dt: "Language" },
        { dd: "TypeScript" },
        { dt: "Rendering" },
        { dd: "Fine-grained reactivity with ElementNode tree." },
        { dt: "Release" },
        { dd: "March 2026" },
    ],
    $: [descriptionList()],
}

export default App
