import type { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme";
import { inputSwitch } from "@domphy/ui";

const App: DomphyElement<"div"> = {
    div: [
        {
            input: null,
            $: [inputSwitch()]
        },
        {
            input: null,
            disabled: true,
            $: [inputSwitch()]
        },
        {
            input: null,
            checked: true,
            $: [inputSwitch()]
        },
        {
            input: null,
            checked: true,
            disabled: true,
            $: [inputSwitch()]
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
