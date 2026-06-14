import type { DomphyElement } from "@domphy/core";
import { createForm } from "@domphy/form/domphy";
import { themeSpacing } from "@domphy/theme";
import { button, inputCheckbox, inputText, label, paragraph } from "@domphy/ui";

const myForm = createForm<{ email: string; agree: boolean }>({
  defaultValues: { email: "", agree: false },
  onSubmit: async ({ value }) => {
    await new Promise((r) => setTimeout(r, 1000));
    console.log(value);
  },
});

const email = myForm.field<string>("email", {
  validators: {
    onChange: ({ value }: { value: string }) => {
      if (!value) return "Email is required";
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(value)) return "Invalid email";
      return undefined;
    },
  },
});
const agree = myForm.field<boolean>("agree");

const App: DomphyElement<"form"> = {
  form: [
    {
      div: [
        { label: "Email", $: [label()] },
        {
          input: null,
          $: [inputText()],
          value: (l) => email.value(l),
          onInput: (e) =>
            email.handleChange((e.target as HTMLInputElement).value),
          onBlur: () => email.handleBlur(),
        },
        {
          p: (l) => String(email.errors(l)[0] ?? ""),
          $: [paragraph({ color: "error" })],
          dataSize: "decrease-1",
          hidden: (l) => email.errors(l).length === 0,
        },
      ],
      style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
    },
    {
      div: [
        {
          input: null,
          type: "checkbox",
          $: [inputCheckbox()],
          checked: (l) => agree.value(l),
          onChange: (e) =>
            agree.handleChange((e.target as HTMLInputElement).checked),
        },
        { label: "I agree to terms", $: [label()] },
      ],
      style: { display: "flex", gap: themeSpacing(2), alignItems: "center" },
    },
    {
      button: (l) => (myForm.isSubmitting(l) ? "Submitting..." : "Submit"),
      type: "submit",
      $: [button()],
      ariaDisabled: (l) => !myForm.canSubmit(l),
    },
  ],
  onSubmit: (e) => {
    (e as Event).preventDefault();
    myForm.handleSubmit();
  },
  _onRemove: () => myForm.destroy(),
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
    maxWidth: themeSpacing(80),
  },
};

export default App;
