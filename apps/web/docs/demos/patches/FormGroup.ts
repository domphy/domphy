import { type DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { formGroup, inputText, label } from "@domphy/ui"

const App: DomphyElement<"div"> = {
    div: [
        {
            fieldset: [
                { legend: "Horizontal" },
                { label: "Address", $: [label()] },
                { input: null, placeholder: "Street and number", $: [inputText()] },
                { p: "Street, apartment, suite, or unit" },
                { label: "City", $: [label()] },
                { input: null, placeholder: "Ho Chi Minh City", $: [inputText()] },
                { label: "Postal code", $: [label()] },
                { input: null, placeholder: "700000", $: [inputText()] },
                { p: "Optional for some addresses" },
            ],
            $: [formGroup()],
            style: { width: "100%", maxWidth: themeSpacing(176) },
        },
        {
            fieldset: [
                { legend: "Vertical" },
                { label: "Address", $: [label()] },
                { input: null, placeholder: "Street and number", $: [inputText()] },
                { p: "Street, apartment, suite, or unit" },
                { label: "City", $: [label()] },
                { input: null, placeholder: "Ho Chi Minh City", $: [inputText()] },
                { label: "Postal code", $: [label()] },
                { input: null, placeholder: "700000", $: [inputText()] },
                { p: "Optional for some addresses" },
            ],
            $: [formGroup({ layout: "vertical" })],
            style: { width: "100%", maxWidth: themeSpacing(176) },
        },
    ],
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(9) },
}

export default App
