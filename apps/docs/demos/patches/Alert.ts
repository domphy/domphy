import { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { alert } from "@domphy/ui"

const info: DomphyElement<"div"> = {
    div: "Your session will expire in 10 minutes.",
    $: [alert({ color: "primary" })],
}

const success: DomphyElement<"div"> = {
    div: "Changes saved successfully.",
    $: [alert({ color: "success" })],
}

const warning: DomphyElement<"div"> = {
    div: "This action cannot be undone. Please review before continuing.",
    $: [alert({ color: "warning" })],
}

const error: DomphyElement<"div"> = {
    div: "Failed to connect. Check your network and try again.",
    $: [alert({ color: "error" })],
}

const App: DomphyElement<"div"> = {
    div: [info, success, warning, error],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(3),
        maxWidth: themeSpacing(120),
    },
}

export default App
