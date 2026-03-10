import type { DomphyElement } from "@domphy/core";
import { State } from "@domphy/core";
import { themeSpacing, themeColor, themeSize } from "@domphy/theme";
import {
  form,
  field,
  FormState,
  inputText,
  inputCheckbox,
  button,
  label,
} from "@domphy/ui";

const myForm = new FormState();
const submitting = new State(false);

const App: DomphyElement<"form"> = {
  form: [
    // Email field
    {
      div: [
        { label: "Email", $: [label()] },
        {
          input: null,
          $: [
            field("email", (v) => {
              if (!v) return { error: "Email is required" };
              if (!/^[^@]+@[^@]+\.[^@]+$/.test(v as string)) return { error: "Invalid email" };
              return null;
            }),
            inputText(),
          ],
        },
        {
          p: (listener) => myForm.getField("email").message("error", listener),
          style: {
            color: (listener) => themeColor(listener, "shift-5", "error"),
            fontSize: (listener) => themeSize(listener, "decrease-1"),
            margin: 0,
          },
        },
      ],
      style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
    },
    // Agree checkbox
    {
      div: [
        { input: null, type: "checkbox", $: [field("agree"), inputCheckbox()] },
        { label: "I agree to terms", $: [label()] },
      ],
      style: { display: "flex", gap: themeSpacing(2), alignItems: "center" },
    },
    // Submit
    {
      button: (listener) => submitting.get(listener) ? "Submitting..." : "Submit",
      type: "submit",
      $: [button()],
      disabled: (listener) => submitting.get(listener) || undefined,
    },
  ],
  $: [form(myForm)],
  onSubmit: async (e) => {
    (e as Event).preventDefault();
    if (!myForm.valid || submitting.get()) return;
    submitting.set(true);
    await new Promise((r) => setTimeout(r, 1000));
    console.log(myForm.snapshot());
    submitting.set(false);
  },
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
    maxWidth: themeSpacing(80),
  },
};

export default App;
