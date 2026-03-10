import { DomphyElement } from '@domphy/core'
import { themeSpacing, themeColor } from '@domphy/theme'
import { button, popover, popoverArrow } from "@domphy/ui"

const content: DomphyElement<"div"> = {
    div: "Popover content",
    dataTone: "shift-6",
    style: {
        paddingBlock: themeSpacing(1),
        paddingInline: themeSpacing(3),
        borderRadius: themeSpacing(2),
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
