import { type DomphyElement, toState } from '@domphy/core'
import { button } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

const loading = toState(false)

const App: DomphyElement<"div"> = {
    div: [
        { button: "Basic", $: [button()] },
        { button: "Primary", $: [button({ color: "primary" })] },
        { button: "Secondary", $: [button({ color: "secondary" })] },
        { button: "Success", $: [button({ color: "success" })] },
        { button: "Warning", $: [button({ color: "warning" })] },
        { button: "Danger", $: [button({ color: "danger" })] },
        {
            button: "Disabled",
            disabled: true,
            $: [button({ color: "primary" })],
        },
        {
            button: (l) => loading.get(l) ? "Loading..." : "Click to Load",
            ariaBusy: (l) => loading.get(l),
            onClick: () => {
                loading.set(true)
                setTimeout(() => loading.set(false), 2000)
            },
            $: [button({ color: "primary" })],
        }
    ],
    style: {
        display: "flex",
        flexWrap: "wrap",
        rowGap: themeSpacing(8),
        columnGap: themeSpacing(4),
    },
}

export default App
