import { DomphyElement, toState } from '@domphy/core'
import { button, transitionGroup } from "@domphy/ui"

const list = toState([1, 2, 3, 4])
const App: DomphyElement<"div"> = {
    div: [
        {
            button: "Shuffle",
            onClick: () => list.set([...list.get()].sort(() => Math.random() - 0.5)),
            $: [button()],
        },
        {
            ul: (listener) => list.get(listener).map((id) => ({
                li: "Item " + id,
                _key: id,
            })),
            $: [transitionGroup()],
        },
    ],
}

export default App
