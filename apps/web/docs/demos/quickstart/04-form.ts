import { type DomphyElement } from "@domphy/core"
import { FormState } from "@domphy/ui"
import { form, field, inputText, button, label, formGroup } from "@domphy/ui"

const state = new FormState()

const App: DomphyElement<"form"> = {
    form: [
        {
            div: [
                { label: "Name", $: [label()] },
                {
                    input: null,
                    type: "text",
                    placeholder: "Enter your name",
                    $: [field("name"), inputText()],
                },
            ],
            $: [formGroup()],
        },
        {
            div: [
                { label: "Email", $: [label()] },
                {
                    input: null,
                    type: "email",
                    placeholder: "you@example.com",
                    $: [field("email"), inputText()],
                },
            ],
            $: [formGroup()],
        },
        {
            button: "Submit",
            type: "submit",
            $: [button({ color: "primary" })],
        },
    ],
    onSubmit: (e: Event) => {
        e.preventDefault()
        if (state.valid) alert(JSON.stringify(state.snapshot(), null, 2))
    },
    $: [form(state)],
}

export default App
