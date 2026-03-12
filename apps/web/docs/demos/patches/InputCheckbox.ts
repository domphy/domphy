import type { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme";
import { inputCheckbox } from "@domphy/ui";

const App: DomphyElement<"div"> = {
    div: [
        {
            input: null,
            $: [inputCheckbox()]
        },
        {
            input: null,
            disabled: true,
            $: [inputCheckbox()]
        },
        {
            input: null,
            checked: true,
            $: [inputCheckbox()]
        },
        {
            input: null,
            checked: true,
            disabled: true,
            $: [inputCheckbox()]
        },
        {
            input: null,
            _onMount: (node) => (node.domElement as HTMLInputElement).indeterminate = true,
            $: [inputCheckbox()],

        },
        {
            input: null,
            disabled: true,
            _onMount: (node) => (node.domElement as HTMLInputElement).indeterminate = true,
            $: [inputCheckbox()],

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
