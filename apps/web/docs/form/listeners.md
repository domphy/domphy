---
title: "Listeners & Side Effects"
description: "React to field value changes, implement linked fields, computed derived values, and form-level side effects."
---

# Listeners & Side Effects

## `onChangeListenTo` — linked field validation

When field B's validation depends on field A's value, use `onChangeListenTo` to re-run B's validators whenever A changes:

```ts
const form = createForm<{ password: string; confirmPassword: string }>({
  defaultValues: { password: "", confirmPassword: "" },
  onSubmit: ({ value }) => submit(value),
})

const passwordField = form.field<string>("password", {})

const confirmField = form.field<string>("confirmPassword", {
  validators: {
    onChange: ({ value, fieldApi }) => {
      const password = fieldApi.form.getFieldValue("password")
      return value === password ? undefined : "Passwords do not match"
    },
  },
  onChangeListenTo: ["password"],   // re-validate when "password" changes
})
```

Without `onChangeListenTo`, the `confirmPassword` validator only runs when the user types in `confirmPassword` — not when they update `password`.

## Form-level `onChange` listener

React to any value change at the form level:

```ts
const form = createForm<PriceInput>({
  defaultValues: { quantity: 1, unitPrice: 10, total: 10 },
  onSubmit: ({ value }) => checkout(value),
  onChange: ({ value }) => {
    // Compute derived fields
    const total = value.quantity * value.unitPrice
    form.form.setFieldValue("total", total, { touch: false })
  },
})
```

## Watching field values with `effect`

For side effects outside the form (e.g. showing a live preview, making an API call), use `@domphy/core`'s `effect`:

```ts
import { effect } from "@domphy/core"
import { toState } from "@domphy/core"

const form = createForm<SearchInput>({
  defaultValues: { query: "", filters: [] },
  onSubmit: () => {},
})

const queryField = form.field<string>("query", {})
const results = toState<SearchResult[]>([])

// Trigger search whenever query changes (with debounce)
effect(() => {
  const query = queryField.value()   // reactive read
  if (!query) { results.set([]); return }

  let cancelled = false
  const timer = setTimeout(async () => {
    const data = await searchApi(query)
    if (!cancelled) results.set(data)
  }, 300)

  return () => {
    cancelled = true
    clearTimeout(timer)
  }
})
```

## `onBlurListenTo` — cross-field blur validation

Re-run a field's blur validators when another field blurs:

```ts
const emailField = form.field<string>("email", {
  validators: {
    onBlur: ({ value }) => validateEmail(value),
  },
  onBlurListenTo: ["username"],   // also re-validate when "username" blurs
})
```

## Dependent fields — show/hide based on another field

```ts
import { toState } from "@domphy/core"

const form = createForm<ShippingInput>({
  defaultValues: { method: "standard", expediteReason: "" },
  onSubmit: ({ value }) => submit(value),
})

const methodField = form.field<string>("method", {})
const reasonField = form.field<string>("expediteReason", {
  validators: {
    onSubmit: ({ value, fieldApi }) => {
      if (fieldApi.form.getFieldValue("method") === "express" && !value) {
        return "Please provide a reason for express shipping"
      }
    },
  },
  onChangeListenTo: ["method"],
})

const ShippingForm = {
  form: [
    ShippingMethodSelect,
    // Only show reason field when "express" is selected
    {
      div: ReasonInput,
      hidden: (l) => methodField.value(l) !== "express",
    },
  ],
  onSubmit: (e) => { e.preventDefault(); form.handleSubmit() },
}
```

## Computed derived values

Keep derived values in sync with form state using `computed`:

```ts
import { computed } from "@domphy/core"

const quantityField = form.field<number>("quantity", {})
const priceField = form.field<number>("price", {})

const total = computed((l) => {
  const qty = quantityField.value(l) ?? 0
  const price = priceField.value(l) ?? 0
  return qty * price
})

const TotalDisplay = {
  div: (l) => `Total: $${total.get(l).toFixed(2)}`,
}
```

## Subscription to raw FormApi

For complete control, subscribe to the underlying `FormApi` state:

```ts
form.form.subscribe(
  (state) => state.values,           // selector — only re-fires when values change
  (values) => {
    console.log("Form values changed:", values)
    autosave(values)
  }
)
```

## Field-level subscription

```ts
const emailApi = emailField.api

emailApi.store.subscribe(() => {
  const { value, meta } = emailApi.state
  console.log(`email: ${value}, errors: ${meta.errors}`)
})
```
