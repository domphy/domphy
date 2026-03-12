import { DomphyElement } from '@domphy/core'
import { themeDensity, themeSpacing, themeColor } from '@domphy/theme'
import { button, popover, popoverArrow } from "@domphy/ui"

const content: DomphyElement<"div"> = {
    div: "Popover content",
    dataTone: "shift-6",
    style: {
        paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
        paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
        borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
        backgroundColor: (listener) => themeColor(listener),
        color: (listener) => themeColor(listener, "shift-6"),
    },
    $: [popoverArrow({ placement: "bottom"})]
}
const App: DomphyElement<"button"> = {
    button: "Open popover",
    $: [button(), popover({ openOn: "hover",placement: "bottom", content })]
}

export default App
