---
title: "Field Arrays & Nested Forms"
description: "Dynamic field arrays, nested object fields, array of objects, and sub-forms."
---

# Field Arrays & Nested Forms

## Basic array field

Use dot-bracket notation for array indexes. Manage array items with `form.pushFieldValue`, `form.removeFieldValue`, and `form.swapFieldValues`:

```ts
import { createForm } from "@domphy/form/domphy"
import { toState } from "@domphy/core"
import { button } from "@domphy/ui"

const form = createForm<{ tags: string[] }>({
  defaultValues: { tags: [""] },
  onSubmit: ({ value }) => save(value.tags),
})

const App = {
  form: [
    {
      div: (l) => form.values(l).tags.map((_, i) => {
        const field = form.field<string>(`tags[${i}]`, {})
        return {
          _key: i,
          div: [
            {
              input: null,
              type: "text",
              value: (l) => field.value(l),
              onInput: (e) => field.handleChange((e.target as HTMLInputElement).value),
            },
            {
              button: "Remove",
              type: "button",
              $: [button()],
              onClick: () => form.removeFieldValue("tags", i),
            },
          ],
        }
      }),
    },
    {
      button: "Add Tag",
      type: "button",
      $: [button()],
      onClick: () => form.pushFieldValue("tags", ""),
    },
    {
      button: "Save",
      type: "submit",
      $: [button({ tone: "shift-1" })],
    },
  ],
  onSubmit: (e) => { e.preventDefault(); form.handleSubmit() },
}
```

## Array of objects

The same pattern works for arrays of objects. Field names use dot notation for nested keys:

```ts
const form = createForm<{
  contacts: Array<{ name: string; email: string }>
}>({
  defaultValues: { contacts: [{ name: "", email: "" }] },
  onSubmit: ({ value }) => save(value.contacts),
})

const ContactRow = (i: number) => {
  const nameField = form.field<string>(`contacts[${i}].name`, {
    validators: { onChange: ({ value }) => value ? undefined : "Required" },
  })
  const emailField = form.field<string>(`contacts[${i}].email`, {
    validators: { onChange: ({ value }) => value.includes("@") ? undefined : "Invalid" },
  })

  return {
    _key: i,
    div: [
      {
        input: null,
        placeholder: "Name",
        value: (l) => nameField.value(l),
        onInput: (e) => nameField.handleChange((e.target as HTMLInputElement).value),
      },
      {
        input: null,
        placeholder: "Email",
        value: (l) => emailField.value(l),
        onInput: (e) => emailField.handleChange((e.target as HTMLInputElement).value),
      },
      {
        button: "✕",
        type: "button",
        onClick: () => form.removeFieldValue("contacts", i),
      },
    ],
  }
}

const App = {
  form: [
    { div: (l) => form.values(l).contacts.map((_, i) => ContactRow(i)) },
    {
      button: "Add Contact",
      type: "button",
      onClick: () => form.pushFieldValue("contacts", { name: "", email: "" }),
    },
  ],
  onSubmit: (e) => { e.preventDefault(); form.handleSubmit() },
}
```

## Reordering with swapFieldValues

Implement drag-to-reorder or up/down buttons:

```ts
{
  button: "↑",
  type: "button",
  disabled: i === 0,
  onClick: () => form.swapFieldValues("contacts", i, i - 1),
}
```

`swapFieldValues(fieldName, indexA, indexB)` — swaps two elements and preserves per-field state (touched, dirty, errors).

## Nested object fields

For deeply nested objects, create sub-fields with the full dot-path:

```ts
const form = createForm<{
  address: { street: string; city: string; zip: string }
}>({
  defaultValues: { address: { street: "", city: "", zip: "" } },
  onSubmit: ({ value }) => save(value),
})

const street = form.field<string>("address.street", {
  validators: { onChange: ({ value }) => value ? undefined : "Required" },
})
const city   = form.field<string>("address.city", {})
const zip    = form.field<string>("address.zip", {
  validators: { onChange: ({ value }) => /^\d{5}$/.test(value) ? undefined : "5 digits" },
})
```

## Array field validators

Validate the entire array (e.g. minimum length):

```ts
const form = createForm<{ skills: string[] }>({
  defaultValues: { skills: [] },
  validators: {
    onChange: ({ value }) =>
      value.skills.length === 0 ? "Add at least one skill" : undefined,
  },
  onSubmit: ({ value }) => save(value),
})
```

Or add a validator on the array field itself:

```ts
const skills = form.field<string[]>("skills", {
  validators: {
    onChange: ({ value }) =>
      value.length < 1 ? "At least one skill required" : undefined,
  },
})
```

## Field group (FormGroupApi)

`FormGroupApi` creates a typed sub-form bound to a nested path. Useful for extracting reusable form sections:

```ts
import { createForm, FormGroupApi } from "@domphy/form/domphy"

const form = createForm<{ billing: AddressData; shipping: AddressData }>({
  defaultValues: {
    billing: { street: "", city: "", zip: "" },
    shipping: { street: "", city: "", zip: "" },
  },
  onSubmit: ({ value }) => submit(value),
})

function AddressSection(prefix: "billing" | "shipping") {
  const group = form.group<AddressData>(prefix)   // typed to AddressData
  const street = group.field<string>("street", {})
  // group.field("street") is equivalent to form.field("billing.street")

  return {
    fieldset: [
      { legend: prefix === "billing" ? "Billing" : "Shipping" },
      {
        input: null,
        placeholder: "Street",
        value: (l) => street.value(l),
        onInput: (e) => street.handleChange((e.target as HTMLInputElement).value),
      },
    ],
  }
}
```

## Resetting arrays

`form.reset()` restores the form to `defaultValues` including all array contents:

```ts
{ button: "Reset", type: "button", onClick: () => form.reset() }
```

Reset to specific values:

```ts
form.reset({ contacts: [{ name: "Alice", email: "alice@example.com" }] })
```

## Reading raw FormApi

For advanced use cases (custom validation runners, field state inspection), access the underlying TanStack `FormApi`:

```ts
const rawForm = form.form    // FormApi<TData>
const fieldApi = field.api   // FieldApi<TData, string>
```

The full TanStack Form v1 API applies to both — see [TanStack Form docs](https://tanstack.com/form/latest) for `FormApi` methods (`setFieldValue`, `getFieldValue`, `setFieldMeta`, `validateField`, etc.).
