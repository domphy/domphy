import { type DomphyElement, toState } from "@domphy/core"
import { themeSpacing } from "@domphy/theme"
import { button, dialog } from "@domphy/ui"

const open = toState(false)
const App: DomphyElement<"div"> = {
    div: [
        {
            button: "Open Dialog",
            $: [button()],
            onClick: () => open.set(true),
        },
        {
            dialog: [
                { h3: "Session Expired" },
                { p: "Your session has ended. Please sign in again to continue." },
                {
                    button: "Close",
                    onClick: () => open.set(false),
                    $: [button({ color: "primary" })],
                }
            ],
            $: [dialog({ open })],
        },
    ],
}

export default App