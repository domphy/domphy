---
title: "TypeScript"
description: "Generic form typing, DeepKeys for nested fields, typed validators, and inference patterns."
---

# TypeScript

## Typed form values

The generic parameter on `createForm<T>` types all field values, validators, and state:

```ts
import { createForm } from "@domphy/form/domphy"

interface SignupInput {
  email: string
  password: string
  profile: {
    name: string
    bio: string
  }
}

const form = createForm<SignupInput>({
  defaultValues: {
    email: "",
    password: "",
    profile: { name: "", bio: "" },
  },
  onSubmit: ({ value }) => {
    // value: SignupInput — fully typed
    console.log(value.email, value.profile.name)
  },
})

// form.values(l) → SignupInput (typed)
```

## `DeepKeys` — nested field paths

`form.field<V>(name, opts)` accepts a `DeepKeys<T>` string — the dot-notation path to any nested field:

```ts
const emailField  = form.field<string>("email", {})
const nameField   = form.field<string>("profile.name", {})
const bioField    = form.field<string>("profile.bio", {})

// TypeScript ensures the path and value type match
const wrongField  = form.field<number>("email", {})   // ✗ Error: email is string
const badPath     = form.field<string>("profile.unknown", {})   // ✗ Error: path not in type
```

## Typed validators

Validators receive `{ value: V }` where `V` is the field type:

```ts
const emailField = form.field<string>("email", {
  validators: {
    onChange: ({ value }) => {
      // value: string — TypeScript infers this
      return value.includes("@") ? undefined : "Invalid email"
    },
    onBlurAsync: async ({ value }) => {
      // value: string
      const taken = await checkEmailTaken(value)
      return taken ? "Email already in use" : undefined
    },
  },
})
```

## Form-level validators

```ts
const form = createForm<LoginInput>({
  defaultValues: { email: "", password: "" },
  validators: {
    onSubmit: ({ value }) => {
      // value: LoginInput — full form values
      if (!value.email && !value.password) {
        return "Please fill in the form"
      }
    },
  },
  onSubmit: ({ value }) => login(value),
})
```

## `FormState` type

```ts
import type { FormState } from "@domphy/form"

// Full form state type (simplified):
interface FormState<T> {
  values: T
  errors: unknown[]
  isSubmitting: boolean
  isSubmitted: boolean
  isValid: boolean
  isDirty: boolean
  isPristine: boolean
  canSubmit: boolean
  submissionAttempts: number
  fieldMeta: Record<DeepKeys<T>, FieldMeta>
}

// Access:
const state: FormState<LoginInput> = form.state()
```

## `FieldMeta` type

```ts
import type { FieldMeta } from "@domphy/form"

interface FieldMeta {
  isTouched: boolean
  isDirty: boolean
  isPristine: boolean
  isValidating: boolean
  errors: unknown[]
  errorMap: {
    onChange?: unknown
    onBlur?: unknown
    onSubmit?: unknown
    onMount?: unknown
  }
}
```

## Array fields with typed elements

```ts
interface InvoiceInput {
  client: string
  items: Array<{
    description: string
    qty: number
    price: number
  }>
}

const form = createForm<InvoiceInput>({
  defaultValues: { client: "", items: [] },
  onSubmit: ({ value }) => createInvoice(value),
})

// The items array — value type is InvoiceInput["items"]
const itemsField = form.field<InvoiceInput["items"]>("items", {})

// Push a new item — TypeScript checks the type
itemsField.pushValue({ description: "", qty: 1, price: 0 })
itemsField.pushValue({ description: 42 })   // ✗ Error: description must be string
```

## Accessing sub-field values with dot notation

```ts
// Each item's fields — TypeScript resolves the path type
function ItemRow(index: number) {
  const descField  = form.field<string>(`items[${index}].description`, {})
  const qtyField   = form.field<number>(`items[${index}].qty`, {})
  const priceField = form.field<number>(`items[${index}].price`, {})

  return {
    tr: [
      { td: DescriptionInput(descField) },
      { td: NumberInput(qtyField) },
      { td: NumberInput(priceField) },
    ],
  }
}
```

## `onSubmit` context type

```ts
const form = createForm<FormData>({
  defaultValues: { ... },
  onSubmit: ({ value, formApi, context }) => {
    // value: FormData
    // formApi: FormApi<FormData>
    // context: whatever was passed to form.handleSubmit(undefined, context)
  },
})
```

## Generic form components

Build typed reusable field inputs:

```ts
import type { FieldHandle } from "@domphy/form/domphy"

function TextInput<T>(field: FieldHandle<T, string>) {
  return {
    div: [
      {
        input: null,
        type: "text",
        value: (l) => String(field.value(l) ?? ""),
        onInput: (e: Event) => field.handleChange((e.target as HTMLInputElement).value),
        onBlur: () => field.handleBlur(),
      },
      {
        p: (l) => String(field.errors(l)[0] ?? ""),
        hidden: (l) => field.errors(l).length === 0,
        style: { color: "red", fontSize: "0.875rem" },
      },
    ],
  }
}
```
