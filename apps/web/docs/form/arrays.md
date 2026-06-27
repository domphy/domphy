---
title: "Field Arrays & Nested Forms"
description: "Dynamic field arrays, nested object fields, array of objects, and sub-forms."
---

# Field Arrays & Nested Forms

## Basic array field

Use dot-bracket notation for array indexes. Create an array-field handle and use its built-in array helpers (`pushValue`, `removeValue`, `swapValues`, etc.):

```ts
import { createForm } from "@domphy/form/domphy"
import { button } from "@domphy/ui"

const form = createForm<{ tags: string[] }>({
  defaultValues: { tags: [""] },
  onSubmit: ({ value }) => save(value.tags),
})

// Array-level field handle gives access to push/remove helpers
const tags = form.field<string[]>("tags")

const App = {
  form: [
    {
      div: (l) => form.values(l).tags.map((_, i) => {
        const field = form.field<string>(`tags[${i}]`)
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
              onClick: () => tags.removeValue(i),
            },
          ],
        }
      }),
    },
    {
      button: "Add Tag",
      type: "button",
      $: [button()],
      onClick: () => tags.pushValue(""),
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

## Field-level array helpers

| Method | Description |
|--------|-------------|
| `field.pushValue(item)` | Append an item to the array |
| `field.insertValue(index, item)` | Insert at a specific index |
| `field.replaceValue(index, item)` | Replace item at an index |
| `field.removeValue(index)` | Remove item at an index |
| `field.swapValues(a, b)` | Swap two items (preserves field meta) |
| `field.moveValue(a, b)` | Move item from index `a` to index `b` |
| `field.clearValues()` | Remove all items |

These methods live on a `FieldHandle<T[]>` — create the handle for the array field itself, then call helpers on it. Per-item fields are separate handles with the `[i]` path suffix.

## Array of objects

The same pattern works for arrays of objects. Field names use dot notation for nested keys:

```ts
const form = createForm<{
  contacts: Array<{ name: string; email: string }>
}>({
  defaultValues: { contacts: [{ name: "", email: "" }] },
  onSubmit: ({ value }) => save(value.contacts),
})

const contacts = form.field<Array<{ name: string; email: string }>>("contacts")

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
        onClick: () => contacts.removeValue(i),
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
      onClick: () => contacts.pushValue({ name: "", email: "" }),
    },
  ],
  onSubmit: (e) => { e.preventDefault(); form.handleSubmit() },
}
```

## Reordering with swapValues / moveValue

Implement up/down buttons or drag-to-reorder:

```ts
// Swap with the item above
{
  button: "↑",
  type: "button",
  disabled: i === 0,
  onClick: () => contacts.swapValues(i, i - 1),
}

// Move item from index 2 to index 0
contacts.moveValue(2, 0)
```

`swapValues(a, b)` — swaps two elements and preserves per-field state (touched, dirty, errors). `moveValue(a, b)` shifts intermediate items to fill the gap.

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

## Reusable nested sections

Extract repeated nested sections as component functions using dot-path field access:

```ts
import { createForm } from "@domphy/form/domphy"

const form = createForm<{ billing: AddressData; shipping: AddressData }>({
  defaultValues: {
    billing: { street: "", city: "", zip: "" },
    shipping: { street: "", city: "", zip: "" },
  },
  onSubmit: ({ value }) => submit(value),
})

function AddressSection(prefix: "billing" | "shipping") {
  const street = form.field<string>(`${prefix}.street`, {})

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

## Programmatic field control

`FormHandle` exposes imperative getters and setters without needing to reach into `form.form`:

```ts
// Read a value without a listener
const current = form.getFieldValue("contacts")

// Set a value programmatically (triggers onChange validation)
form.setFieldValue("contacts[0].name", "Alice")

// Trigger validation manually
await form.validateField("contacts[0].email", "change")
```

## Advanced: underlying FormApi / FieldApi

For lower-level control (custom validation runners, direct store access), use the escape hatch:

```ts
const rawForm = form.form    // FormApi<TData> — full TanStack form-core API
const fieldApi = field.api   // FieldApi — full form-core field surface
```
