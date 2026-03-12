import { DomphyElement, toState } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { combobox, selectList, selectItem } from "@domphy/ui"

const fruits = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Blueberry", value: "blueberry" },
    { label: "Cherry", value: "cherry" },
    { label: "Grapes", value: "grapes" },
    { label: "Mango", value: "mango" },
    { label: "Pineapple", value: "pineapple" },
    { label: "Strawberry", value: "strawberry" },
]

// Single select
const selected = toState<string | null>("cherry")

const singleDropdown: DomphyElement<"div"> = {
    div: fruits.map(f => ({ div: f.label, $: [selectItem({ value: f.value })] })),
    $: [selectList({ value: selected })],
}

const single: DomphyElement<"div"> = {
    div: [],
    $: [combobox({ value: selected, options: fruits, content: singleDropdown })],
}

// Multiple select
const multiSelected = toState<string[]>([])

const multiDropdown: DomphyElement<"div"> = {
    div: fruits.map(f => ({ div: f.label, $: [selectItem({ value: f.value })] })),
    $: [selectList({ value: multiSelected, multiple: true })],
}

const multiple: DomphyElement<"div"> = {
    div: [],
    $: [combobox({ value: multiSelected, options: fruits, content: multiDropdown, multiple: true })],
}

const App: DomphyElement<"div"> = {
    div: [single, multiple],
    style: {
        display: "flex",
        flexWrap: "wrap",
        rowGap: themeSpacing(9),
        columnGap: themeSpacing(4),
    },
}

export default App
