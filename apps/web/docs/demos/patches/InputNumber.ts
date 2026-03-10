import { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { inputNumber } from "@domphy/ui"

const basic: DomphyElement<"input"> = {
    input: null,
    $: [inputNumber()],
    placeholder: "0",
}

const stepped: DomphyElement<"input"> = {
    input: null,
    $: [inputNumber()],
    min: "0",
    max: "1",
    step: "0.1",
    placeholder: "0.0",
}

const disabled: DomphyElement<"input"> = {
    input: null,
    $: [inputNumber()],
    disabled: true,
    value: "42",
}

const invalid: DomphyElement<"input"> = {
    input: null,
    $: [inputNumber()],
    ariaInvalid: "true",
    value: "-1",
}

const App: DomphyElement<"div"> = {
    div: [basic, stepped, disabled, invalid],
    style: {
        display: "flex",
        flexWrap: "wrap",
        gap: themeSpacing(4),
        alignItems: "center",
    },
}

export default App
