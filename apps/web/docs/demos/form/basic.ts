import type { DomphyElement } from "@domphy/core";
import { createForm } from "@domphy/form/domphy";
import { themeSpacing } from "@domphy/theme";
import { alert, button, inputText, label, paragraph } from "@domphy/ui";

const login = createForm<{ email: string; password: string }>({
  defaultValues: { email: "", password: "" },
  onSubmit: async ({ value }) => {
    await new Promise((r) => setTimeout(r, 800));
    console.log("submitted", value);
  },
});

const email = login.field<string>("email", {
  validators: {
    onChange: ({ value }: { value: string }) =>
      /^[^@]+@[^@]+\.[^@]+$/.test(value) ? undefined : "Enter a valid email",
  },
});
const password = login.field<string>("password", {
  validators: {
    onChange: ({ value }: { value: string }) =>
      value.length >= 6 ? undefined : "At least 6 characters",
  },
});

function fieldRow(
  labelText: string,
  type: string,
  handle: typeof email,
): DomphyElement<"div"> {
  return {
    div: [
      { label: labelText, $: [label()] },
      {
        input: null,
        type,
        $: [inputText()],
        value: (l) => handle.value(l),
        onInput: (e) =>
          handle.handleChange((e.target as HTMLInputElement).value),
        onBlur: () => handle.handleBlur(),
      },
      {
        p: (l) => String(handle.errors(l)[0] ?? ""),
        $: [paragraph({ color: "error" })],
        dataSize: "decrease-1",
        hidden: (l) => handle.errors(l).length === 0,
      },
    ],
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
  };
}

const App: DomphyElement<"form"> = {
  form: [
    fieldRow("Email", "email", email),
    fieldRow("Password", "password", password),
    {
      div: "Check the console for the submitted values.",
      $: [alert({ color: "info" })],
      dataSize: "decrease-1",
    },
    {
      button: (l) => (login.isSubmitting(l) ? "Signing in…" : "Sign in"),
      type: "submit",
      $: [button({ color: "primary" })],
      ariaDisabled: (l) => !login.canSubmit(l),
    },
  ],
  onSubmit: (e) => {
    (e as Event).preventDefault();
    login.handleSubmit();
  },
  _onRemove: () => login.destroy(),
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(3),
    maxWidth: themeSpacing(80),
  },
};

export default App;
