---
title: "Submission & Async"
description: "Handle form submission, async submit handlers, server errors, multi-step forms, and reset."
---

# Submission & Async

## Basic submission

Wire a form element's `onSubmit` to `form.handleSubmit()`:

```ts
import { createForm } from "@domphy/form/domphy"

const form = createForm<{ email: string; message: string }>({
  defaultValues: { email: "", message: "" },
  onSubmit: async ({ value }) => {
    await sendMessage(value.email, value.message)
  },
})

const ContactForm = {
  form: [
    // ... fields
    {
      button: "Send",
      type: "submit",
      disabled: (l) => !form.canSubmit(l),
    },
  ],
  onSubmit: (e: Event) => {
    e.preventDefault()
    form.handleSubmit()
  },
}
```

`handleSubmit()` (same contract as TanStack Form):
1. Marks fields touched; increments `submissionAttempts`
2. Runs field + form validators for cause `"submit"`
3. If invalid: calls `onSubmitInvalid` (if provided) and **returns without** calling `onSubmit`
4. If valid: sets `isSubmitting = true`, runs your `onSubmit`, then `isSubmitted` / `isSubmitSuccessful`
5. If `onSubmit` **throws**, rethrows after setting `isSubmitSuccessful = false` — it does **not** auto-write `form.state.errors` (use `setErrorMap` for displayable server errors)

## Async submission with loading state

```ts
const form = createForm<LoginInput>({
  defaultValues: { email: "", password: "" },
  onSubmit: async ({ value }) => {
    await loginApi(value)
    router.navigate({ to: "/dashboard" })
  },
})

const SubmitButton = {
  button: (l) => form.isSubmitting(l) ? "Signing in…" : "Sign in",
  type: "submit",
  disabled: (l) => !form.canSubmit(l) || form.isSubmitting(l),
}
```

## Handling server errors

Use `formApi.setErrorMap` so errors show up on `form.state().errors` (TanStack Form's API). Throwing from `onSubmit` only rejects the `handleSubmit()` promise — it does not populate the error map.

```ts
const form = createForm<LoginInput>({
  defaultValues: { email: "", password: "" },
  onSubmit: async ({ value, formApi }) => {
    const result = await loginApi(value)
    if (result.error === "invalid_credentials") {
      formApi.setErrorMap({
        onSubmit: "Invalid email or password",
      })
      return
    }
  },
})

// Display form-level errors from the error map
const FormError = {
  p: (l) => String(form.state(l).errors[0] ?? ""),
  hidden: (l) => form.state(l).errors.length === 0,
  style: { color: "red" },
}
```

For unexpected network failures you can still throw and catch at the call site:

```ts
onSubmit: (e: Event) => {
  e.preventDefault()
  form.handleSubmit().catch((err) => {
    console.error("submit failed", err)
  })
},
```

For field-level server errors (e.g. "email already taken"):

```ts
onSubmit: async ({ value, formApi }) => {
  const result = await registerApi(value)
  if (result.error === "email_taken") {
    formApi.setErrorMap({
      onSubmit: {
        form: undefined,
        fields: { email: "Email already in use" },
      },
    })
  }
}
```

## Reset

Reset to default values after submission:

```ts
const form = createForm<NewItemInput>({
  defaultValues: { name: "", quantity: 1 },
  onSubmit: async ({ value, formApi }) => {
    await addItem(value)
    formApi.reset()   // clear form after successful submit
  },
})
```

Reset with custom values (e.g. load next draft):

```ts
form.reset({ name: "", quantity: 1 })
form.form.reset({ name: nextDraft.name, quantity: nextDraft.qty })
```

## Multi-step forms (wizard)

Track steps with an external state — each step is a separate set of fields:

```ts
import { toState } from "@domphy/core"

const step = toState<1 | 2 | 3>(1)

const form = createForm<{
  // Step 1
  name: string
  email: string
  // Step 2
  plan: "free" | "pro"
  // Step 3
  cardNumber: string
}>({
  defaultValues: { name: "", email: "", plan: "free", cardNumber: "" },
  onSubmit: async ({ value }) => {
    await subscribe(value)
    router.navigate({ to: "/welcome" })
  },
})

const nameField  = form.field<string>("name", { validators: { onSubmit: ({ value }) => value ? undefined : "Required" } })
const emailField = form.field<string>("email", {})
const planField  = form.field<"free" | "pro">("plan", {})
const cardField  = form.field<string>("cardNumber", {})

async function nextStep() {
  const current = step.get()
  if (current === 1) {
    // Validate step 1 fields manually before advancing
    await nameField.api.validate("submit")
    await emailField.api.validate("submit")
    const hasErrors = nameField.errors().length > 0 || emailField.errors().length > 0
    if (!hasErrors) step.set(2)
  } else if (current === 2) {
    step.set(3)
  } else {
    form.handleSubmit()
  }
}

const WizardForm = {
  form: [
    { div: Step1Fields, hidden: (l) => step.get(l) !== 1 },
    { div: Step2Fields, hidden: (l) => step.get(l) !== 2 },
    { div: Step3Fields, hidden: (l) => step.get(l) !== 3 },
    {
      button: (l) => step.get(l) === 3 ? "Subscribe" : "Next",
      type: "button",
      onClick: nextStep,
      disabled: (l) => form.isSubmitting(l),
    },
  ],
  onSubmit: (e) => e.preventDefault(),
}
```

## Submit with external data

`handleSubmit()` takes no parameters in the Domphy adapter. Pass external data via a closure or state:

```ts
import { toState } from "@domphy/core"

const threadId = toState<string>("")

const form = createForm<MessageInput>({
  defaultValues: { body: "" },
  onSubmit: async ({ value }) => {
    await sendMessage(value.body, threadId.get(), getToken())
  },
})

const SendButton = {
  button: "Send",
  onClick: () => form.handleSubmit(),
}
```

## Preventing double-submit

`canSubmit` automatically returns `false` while `isSubmitting` is true — wire it to the submit button's `disabled`:

```ts
{
  button: "Save",
  disabled: (l) => !form.canSubmit(l),
  onClick: () => form.handleSubmit(),
}
```

No extra debounce or lock needed — the form state handles it.
