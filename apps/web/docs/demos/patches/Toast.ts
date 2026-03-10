import { type DomphyElement, type ElementNode } from "@domphy/core"
import { themeSpacing } from "@domphy/theme"
import { button, toast } from "@domphy/ui"



const App: DomphyElement<"div"> = {
    div: [
        {
            button: "Show Toast",
            $: [button()],
            onClick: (_e, node) => {

                const toastEle = {
                    div: "Saved successfully",
                    $: [toast({ position: "bottom-right" })],
                }
                let toastNode = node.getRoot().children.insert(toastEle) as ElementNode
                setTimeout(() => toastNode.remove(), 3000)
            },
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
