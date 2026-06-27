<script setup lang="ts">
import Basic from "../demos/form/basic.ts?raw"
</script>

# Form

`@domphy/form` provides headless form state for Domphy apps: typed values, per-field and form-level validators (sync + async), touched/blurred/dirty tracking, arrays, and Standard Schema support.

It replaces the ad-hoc `FormState` / `FieldState` that used to live in `@domphy/ui`, so form logic lives in exactly one place.

## Install

::: code-group
```bash [NPM]
npm install @domphy/form @domphy/core
```
```html [CDN]
<script src="https://unpkg.com/@domphy/form/dist/form.global.js"></script>
```
:::

`@domphy/core` is a peer dependency of the adapter only.

## Live Example

<CodeEditor :code="Basic" />

## Adapter

`createForm(options)` (from `@domphy/form/domphy`) owns the form; `form.field(name, options?)` binds one input.

```ts
import { createForm } from "@domphy/form/domphy"

const form = createForm<{ email: string }>({
  defaultValues: { email: "" },
  onSubmit: ({ value }) => save(value),
})

const email = form.field<string>("email", {
  validators: { onChange: ({ value }) => (value.includes("@") ? undefined : "Invalid email") },
})
```

Bind a field to a native input — read `value`/`errors` reactively, forward DOM events to the handle:

```ts
import { inputText, label, formGroup } from "@domphy/ui"

const Field = {
  div: [
    { label: "Email", $: [label()] },
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
  ],
  $: [formGroup()],
}
```

## Form handle

| Member | Description |
| --- | --- |
| `values(l)` / `state(l)` | Reactive form values / full form state. |
| `canSubmit(l)` / `isSubmitting(l)` / `isValid(l)` / `isSubmitted(l)` | Reactive flags. |
| `field<TData>(name, options?)` | Create and mount a reactive field handle. |
| `handleSubmit()` | Run validation and submission. Returns `Promise<void>`. |
| `reset(values?)` | Reset to defaults (or given values). |
| `version(l)` | Reactive change counter — increments on every store flush. |
| `form` | The underlying `FormApi`. |
| `destroy()` | Unmount the form and all fields; call from `_onRemove`. |

## Field handle

| Member | Description |
| --- | --- |
| `value(l)` | Reactive value — bind to the input's `value`/`checked`. |
| `errors(l)` / `meta(l)` | Reactive validation errors / full field meta. |
| `handleChange(value \| updater)` | Update the value (from `onInput`/`onChange`). Accepts a direct value or an `(prev) => next` updater function. |
| `handleBlur()` | Mark blurred and run blur validators. |
| `setValue(value \| updater)` | Set the value programmatically. Accepts a direct value or an `(prev) => next` updater function. |
| `api` | The underlying `FieldApi`. |

Field and form `options` (validators, async debouncing, listeners, arrays, Standard Schema) are documented in the [Form docs](/docs/form/).
