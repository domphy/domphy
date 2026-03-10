import { type DomphyElement, toState } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { toggle, toggleGroup } from "@domphy/ui"

const selected = toState("bold")

const App: DomphyElement<"div"> = {
    div: [
        { button: "Bold",      $: [toggle()], _key: "bold" },
        { button: "Italic",    $: [toggle()], _key: "italic" },
        { button: "Underline", $: [toggle()], _key: "underline" },
    ],
    $: [toggleGroup({ value: selected })],
    style: {
        display: "inline-flex",
        gap: themeSpacing(2),
    },
}

export default App
