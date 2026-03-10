import { type DomphyElement, toState } from "@domphy/core"
import { button, dialog, heading } from "@domphy/ui"

const open = toState(false)

const alertDialog: DomphyElement<"dialog"> = {
    dialog: [
        { h3: "Delete item?",                  $: [heading()] },
        { p: "This action cannot be undone." },
        {
            div: [
                { button: "Cancel",  $: [button()],                   onClick: () => open.set(false) },
                { button: "Delete",  $: [button({ color: "error" })],  onClick: () => open.set(false) },
            ],
            style: { display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" },
        },
    ],
    $: [dialog({ open })],
}

const App: DomphyElement<"div"> = {
    div: [
        { button: "Delete item", $: [button({ color: "error" })], onClick: () => open.set(true) },
        alertDialog,
    ],
    style: { display: "flex", flexDirection: "column", gap: "1rem" },
}

export default App
