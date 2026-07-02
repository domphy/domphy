import { type DomphyElement, toState } from "@domphy/core";
import { themeColor } from "@domphy/theme";
import { alert, button, formGroup, inputText, label } from "@domphy/ui";
import { z } from "zod";

// --- Schema ---
const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

// --- Form State ---
const name = toState("");
const email = toState("");
const errors = toState<z.ZodFormattedError<typeof schema.type> | null>(null);
const submitted = toState(false);

function validate() {
  const result = schema.safeParse({ name: name.get(), email: email.get() });
  if (result.success) {
    errors.set(null);
    submitted.set(true);
  } else {
    errors.set(result.error.format());
  }
}

// --- UI ---
const App: DomphyElement<"form"> = {
  form: [
    {
      fieldset: [
        { label: "Name", $: [label()] },
        {
          input: null,
          $: [inputText()],
          value: (listener) => name.get(listener),
          onInput: (e) => name.set((e.target as HTMLInputElement).value),
        },
        {
          div: (listener) => errors.get(listener)?.name?._errors[0] ?? "",
          $: [alert({ color: "error" })],
          hidden: (listener) => !errors.get(listener)?.name?._errors.length,
        },
        { label: "Email", $: [label()] },
        {
          input: null,
          $: [inputText()],
          type: "email",
          value: (listener) => email.get(listener),
          onInput: (e) => email.set((e.target as HTMLInputElement).value),
        },
        {
          div: (listener) => errors.get(listener)?.email?._errors[0] ?? "",
          $: [alert({ color: "error" })],
          hidden: (listener) => !errors.get(listener)?.email?._errors.length,
        },
      ],
      style: { color: (listener) => themeColor(listener, "shift-9") },
      $: [formGroup()],
    },
    {
      div: "Submitted!",
      $: [alert({ color: "success" })],
      hidden: (listener) => !submitted.get(listener),
    },
    {
      button: "Submit",
      $: [button({ color: "primary" })],
      type: "button",
      onClick: validate,
    },
  ],
};

export default App;
