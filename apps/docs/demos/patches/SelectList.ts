import { DomphyElement, toState } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { selectList, selectItem } from "@domphy/ui"

const fruits = ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]

const value = toState("apple")

const basic: DomphyElement<"div"> = {
    div: fruits.map(fruit => ({
        div: fruit,
        $: [selectItem({ value: fruit.toLowerCase() })],
    })),
    $: [selectList({ value, name: "fruit" })],
}

const multiValue = toState<string[]>([])

const multiple: DomphyElement<"div"> = {
    div: fruits.map(fruit => ({
        div: fruit,
        $: [selectItem({ value: fruit.toLowerCase() })],
    })),
    $: [selectList({ value: multiValue, multiple: true, name: "fruits" })],
}

const App: DomphyElement<"div"> = {
    div: [basic, multiple],
    style: {
        display: "flex",
        flexWrap: "wrap",
        gap: themeSpacing(8),
    },
}

export default App
