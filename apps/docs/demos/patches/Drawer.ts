import { type DomphyElement, toState } from "@domphy/core"
import { themeSpacing } from "@domphy/theme"
import { button, drawer } from "@domphy/ui"

const open = toState(false)

const App: DomphyElement<"div"> = {
    div: [
        {
            button: "Open Drawer",
            $: [button()],
            onClick: () => open.set(true),
        },
        {
            dialog: "Drawer content",
            $: [drawer({ open, placement: "right" })],
        },
    ],
    style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "start",
        gap: themeSpacing(4),
    }
}

export default App
