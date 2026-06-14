import type { DomphyElement } from "@domphy/core";
import { createForm } from "@domphy/form/domphy";
import { button, formGroup, inputText, label } from "@domphy/ui";

const myForm = createForm<{ name: string; email: string }>({
  defaultValues: { name: "", email: "" },
  onSubmit: ({ value }) => alert(JSON.stringify(value, null, 2)),
});

const name = myForm.field<string>("name");
const email = myForm.field<string>("email");

const App: DomphyElement<"form"> = {
  form: [
    {
      div: [
        { label: "Name", $: [label()] },
        {
          input: null,
          type: "text",
          placeholder: "Enter your name",
          $: [inputText()],
          value: (l) => name.value(l),
          onInput: (e) =>
            name.handleChange((e.target as HTMLInputElement).value),
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
          $: [inputText()],
          value: (l) => email.value(l),
          onInput: (e) =>
            email.handleChange((e.target as HTMLInputElement).value),
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
    e.preventDefault();
    myForm.handleSubmit();
  },
  _onRemove: () => myForm.destroy(),
};

export default App;
