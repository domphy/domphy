# @domphy/form

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/form/) · [npm](https://www.npmjs.com/package/@domphy/form)

Headless form state, validation, and submission for Domphy apps: typed values, per-field and form-level (sync + async) validators, touched/blurred/dirty tracking, arrays, and Standard Schema support.

It supersedes the ad-hoc `FormState` / `FieldState` that used to live in `@domphy/ui`. The Domphy adapter lives in `src/domphy/`.

## Install

```bash
npm install @domphy/form @domphy/core
```

`@domphy/core` is a peer dependency of the adapter only.

## Quick Example

```ts
import { createForm } from "@domphy/form/domphy"
import type { DomphyElement } from "@domphy/core"
import { button, inputText } from "@domphy/ui"

const form = createForm<{ email: string; password: string }>({
  defaultValues: { email: "", password: "" },
  onSubmit: async ({ value }) => {
    await api.login(value)
  },
})

const email = form.field<string>("email", {
  validators: { onChange: ({ value }) => (value.includes("@") ? undefined : "Invalid email") },
})

const App: DomphyElement<"form"> = {
  form: [
    {
      input: null,
      $: [inputText()],
      value: (l) => email.value(l),
      onInput: (e) => email.handleChange((e.target as HTMLInputElement).value),
      onBlur: () => email.handleBlur(),
    },
    {
      div: (l) => String(email.errors(l)[0] ?? ""),
      hidden: (l) => email.errors(l).length === 0,
    },
    {
      button: (l) => (form.isSubmitting(l) ? "Signing in…" : "Sign in"),
      $: [button({ color: "primary" })],
      type: "submit",
      ariaDisabled: (l) => !form.canSubmit(l),
    },
  ],
  onSubmit: (e) => {
    e.preventDefault()
    form.handleSubmit()
  },
  _onRemove: () => form.destroy(),
}
```

## Adapter API

`createForm(options)` returns a handle:

| Member | Description |
| --- | --- |
| `values(l)` / `state(l)` | Reactive form values / full form state. |
| `canSubmit(l)` / `isSubmitting(l)` / `isValid(l)` / `isSubmitted(l)` | Reactive form flags. |
| `field<TData>(name, options?)` | Creates and mounts a reactive field handle. |
| `handleSubmit()` | Runs validation and submission. |
| `reset(values?)` | Resets to defaults (or given values). |
| `form` | The underlying `FormApi` — the full form-core API. |
| `version(l)` | Raw reactive change counter. |
| `destroy()` | Unmounts the form and all fields; call from `_onRemove`. |

A field handle from `field(name, options)`:

| Member | Description |
| --- | --- |
| `value(l)` | Reactive field value — bind to the input's `value`. |
| `errors(l)` / `meta(l)` | Reactive validation errors / full field meta. |
| `handleChange(value)` | Update the value (call from `onInput`). |
| `handleBlur()` | Mark blurred and run blur validators. |
| `setValue(updater)` | Set the value programmatically. |
| `api` | The underlying `FieldApi`. |

Field and form `options` (validators, async debouncing, listeners, array helpers, Standard Schema, …) — see the [Form docs](https://domphy.com/docs/form/).
