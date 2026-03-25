import { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { select } from "@domphy/ui"

const items = [
    { label: "Select a fruit", value: "" },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Grapes", value: "grapes" },
    { label: "Pineapple", value: "pineapple" },
]

const basic: DomphyElement<"select"> = {
    select: items.map(item => {
        let opt: DomphyElement<"option"> = {
            option: item.label,
            value: item.value,
        }
        if (!item.value) {
            opt.selected = true
            opt.disabled = true
        }
        return opt
    }),
    $: [select()],
}

const disabled: DomphyElement<"select"> = {
    select: items.map(item => {
        let opt: DomphyElement<"option"> = {
            option: item.label,
            value: item.value,
        }
        if (!item.value) {
            opt.selected = true
            opt.disabled = true
        }
        return opt
    }),
    disabled: true,
    $: [select()],
}

const App: DomphyElement<"div"> = {
    div: [basic, disabled],
    style: {
        display: "flex",
        flexWrap: "wrap",
        rowGap: themeSpacing(9),
        columnGap: themeSpacing(4),
    },
}

export default App
