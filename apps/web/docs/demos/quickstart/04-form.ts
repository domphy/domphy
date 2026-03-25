import { type DomphyElement } from "@domphy/core"
import { form, field, inputText, button, label, formGroup } from "@domphy/ui"

const App: DomphyElement<"form"> = {
    form: [
        {
            div: [
                { label: "Name", $: [label()] },
                {
                    input: null,
                    type: "text",
                    name: "name",
                    placeholder: "Enter your name",
                    $: [field({ required: true }), inputText()],
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
                    name: "email",
                    placeholder: "you@example.com",
                    $: [field({ required: true }), inputText()],
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
    $: [form({
        onSubmit: (values) => alert(JSON.stringify(values, null, 2)),
    })],
}

export default App
