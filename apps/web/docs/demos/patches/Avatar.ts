import { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { avatar } from "@domphy/ui"

const App: DomphyElement<"div"> = {
    div: [
        { span: "AB", $: [avatar()] },
        { span: "JD", $: [avatar({ color: "success" })] },
        { span: "MK", $: [avatar({ color: "error" })] },
        { span: "RW", $: [avatar({ color: "warning" })] },
        {
            span: [{ img: null, src: "https://i.pravatar.cc/150?img=3", alt: "avatar" }],
            $: [avatar()],
        },
    ],
    style: {
        display: "flex",
        alignItems: "center",
        gap: themeSpacing(3),
    },
}

export default App
