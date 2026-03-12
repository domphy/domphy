import type { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme";
import { link } from "@domphy/ui";

const App: DomphyElement<"div"> = {
    div: [
        {
            a: "Link",
            href: "#",
            $: [link()]
        },
        {
            a: "Disabled Link",
            disabled: true,
            $: [link()]
        }
    ],
    style: {
        display: "flex",
        flexWrap: "wrap",
        rowGap: themeSpacing(9),
        columnGap: themeSpacing(4),
    },
}

export default App
