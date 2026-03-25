import { type DomphyElement, toState } from "@domphy/core"
import { button, heading } from "@domphy/ui"

const count = toState(0)

const App: DomphyElement<"div"> = {
    div: [
        { h3: (l) => `Count: ${count.get(l)}`, $: [heading()] },
        {
            button: "Increment",
            onClick: () => count.set(count.get() + 1),
            $: [button({ color: "primary" })],
        },
        {
            button: "Reset",
            onClick: () => count.set(0),
            $: [button()],
        },
    ],
    style: { display: "flex", gap: "8px", alignItems: "center" },
}

export default App
