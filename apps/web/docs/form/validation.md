---
title: "Validation"
description: "Sync and async validators, Standard Schema (Zod/Valibot/ArkType), form-level validators, and error display."
---

# Validation

## Validator timing

Each field accepts a `validators` object. Keys control **when** validation runs:

| Key | Fires on |
|-----|----------|
| `onChange` | Every value change (`handleChange`) |
| `onChangeAsync` | Same but async (debounced by default) |
| `onBlur` | `handleBlur()` call |
| `onBlurAsync` | Async blur validator |
| `onSubmit` | Only when the form is submitted |
| `onSubmitAsync` | Async submit-time validator |
| `onMount` | Once, when the field is first created |
| `onMountAsync` | Async on-mount validator |

Validators return `undefined` (valid) or a string error message:

```ts
const email = form.field<string>("email", {
  validators: {
    onChange: ({ value }) =>
      value.includes("@") ? undefined : "Must be a valid email",
    onBlur: ({ value }) =>
      value.length >= 5 ? undefined : "Too short",
    onSubmit: ({ value }) =>
      value.endsWith(".com") ? undefined : "Only .com addresses accepted",
  },
})
```

## Async validators

Async validators return a `Promise<string | undefined>`:

```ts
const username = form.field<string>("username", {
  validators: {
    onChangeAsync: async ({ value }) => {
      if (!value) return undefined
      const taken = await checkUsernameAvailable(value)
      return taken ? undefined : "Username already taken"
    },
    onChangeAsyncDebounceMs: 300,    // wait 300ms after last keystroke (default: 0)
  },
})
```

Use `asyncDebounceMs` on the field options for a global default:

```ts
const field = form.field("name", { asyncDebounceMs: 500 })
```

## Form-level validators

Run validators on the whole form value — useful for cross-field checks:

```ts
const form = createForm<{ start: string; end: string }>({
  defaultValues: { start: "", end: "" },
  validators: {
    onChange: ({ value }) => {
      if (!value.start || !value.end) return
      return value.end < value.start ? "End must be after start" : undefined
    },
  },
  onSubmit: ({ value }) => submitRange(value),
})
```

Read form-level errors:

```ts
{ div: (l) => String(form.state(l).errors[0] ?? ""), style: { color: "red" } }
```

## Standard Schema (Zod, Valibot, ArkType)

Pass any Standard Schema compatible schema as the validator:

```ts
import { z } from "zod"

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, {
  message: "Passwords must match",
  path: ["confirm"],
})

const form = createForm({
  defaultValues: { email: "", password: "", confirm: "" },
  validators: {
    onChange: SignupSchema,    // runs on every change using the schema
  },
  onSubmit: ({ value }) => signUp(value),
})
```

Field-level schema (validates just one field's value):

```ts
const email = form.field("email", {
  validators: {
    onChange: z.string().email(),
  },
})
```

Valibot and ArkType work the same way — any schema with a Standard Schema `~standard` property.

## Displaying errors

Read `field.errors(l)` reactively:

```ts
import { inputText, label } from "@domphy/ui"

const EmailField = {
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
      // Error message — hidden when no errors
      p: (l) => String(email.errors(l)[0] ?? ""),
      hidden: (l) => email.errors(l).length === 0,
      style: { color: "red", fontSize: "0.875rem" },
    },
  ],
}
```

For multiple errors (e.g. cross-field schema errors):

```ts
{
  ul: (l) => email.errors(l).map((err, i) => ({ li: String(err), _key: i })),
  hidden: (l) => email.errors(l).length === 0,
}
```

## Error metadata

`field.meta(l)` returns the full `FieldMeta`:

```ts
interface FieldMeta {
  touchedAt: number | null    // timestamp of first blur
  isTouched: boolean
  isDirty: boolean
  isPristine: boolean
  isBlurred: boolean
  errors: unknown[]
  errorMap: Partial<Record<ValidationSource, unknown>>
  isValidating: boolean
}
```

Show a spinner on async validation:

```ts
{ span: "Checking...", hidden: (l) => !username.meta(l).isValidating }
```

## Validators with context

Validators receive a `context` object — attach extra data via `form.handleSubmit(data, context)`:

```ts
const form = createForm<LoginForm>({
  defaultValues: { email: "", password: "" },
  validators: {
    onSubmitAsync: async ({ value, context }) => {
      const result = await loginApi(value.email, value.password, context?.csrfToken)
      return result.error ? "Invalid credentials" : undefined
    },
  },
  onSubmit: ({ value }) => {},
})

// Pass context on submit
const button = {
  button: "Log in",
  onClick: () => form.handleSubmit({}, { csrfToken: getCsrfToken() }),
}
```

## Preventing invalid submissions

`form.canSubmit(l)` returns `false` when:
- Any field has an error **and** `isSubmitted` is true (after first submit attempt), or
- The form is currently validating asynchronously

Wire to button `disabled`:

```ts
{
  button: "Submit",
  $: [button()],
  disabled: (l) => !form.canSubmit(l) || form.isSubmitting(l),
  onClick: () => form.handleSubmit(),
}
```

## Linked field validators

Run a validator on `fieldB` when `fieldA` changes using `listeners`:

```ts
const password = form.field("password", {})

const confirm = form.field("confirm", {
  validators: {
    onChangeListenTo: ["password"],   // re-validate when password changes
    onChange: ({ value, fieldApi }) =>
      value !== fieldApi.form.getFieldValue("password")
        ? "Passwords must match"
        : undefined,
  },
})
```
