---
title: "Linked Fields"
description: "Cross-field validation with onChangeListenTo and onBlurListenTo, dependent required fields, confirm-password patterns, and dynamic form sections."
---

# Linked Fields

By default a field's validators only fire when that field itself changes. **Linked fields** let you declare that field B's validation should re-run whenever field A changes — without field B being touched.

## `onChangeListenTo` — password confirmation

The classic pattern: `confirmPassword` must re-validate whenever `password` changes:

```ts
import { createForm } from "@domphy/form/domphy"

const form = createForm<{ password: string; confirmPassword: string }>({
  defaultValues: { password: "", confirmPassword: "" },
  onSubmit: ({ value }) => register(value),
})

const passwordField = form.field<string>("password", {
  validators: {
    onChange: ({ value }) => value.length >= 8 ? undefined : "At least 8 characters",
  },
})

const confirmField = form.field<string>("confirmPassword", {
  validators: {
    onChange: ({ value, fieldApi }) => {
      // Read the sibling field via the shared FormApi
      const password = fieldApi.form.getFieldValue("password")
      return value === password ? undefined : "Passwords do not match"
    },
    // Re-run this validator whenever "password" changes
    onChangeListenTo: ["password"],
  },
})
```

Without `onChangeListenTo`, typing in the `password` field would not re-check `confirmPassword` — the mismatch would only surface when the user typed in `confirmPassword` itself.

## `onBlurListenTo` — blur-triggered cross-field validation

Re-run a field's `onBlur` validators when a different field blurs:

```ts
const emailField = form.field<string>("email", {
  validators: {
    onBlur: ({ value }) => isAvailableEmail(value) ? undefined : "Email already in use",
    // Also re-validate when the username field blurs (they share uniqueness rules)
    onBlurListenTo: ["username"],
  },
})
```

## Form-level validators for cross-field rules

When a rule involves multiple fields, a form-level `onChange` validator is often cleaner:

```ts
const form = createForm<{ startDate: string; endDate: string; nights: number }>({
  defaultValues: { startDate: "", endDate: "", nights: 0 },
  validators: {
    onChange: ({ value }) => {
      if (!value.startDate || !value.endDate) return
      if (value.endDate <= value.startDate) return "Check-out must be after check-in"
    },
  },
  onSubmit: ({ value }) => bookStay(value),
})

// Display form-level error
const DateError = {
  p: (l) => String(form.state(l).errors[0] ?? ""),
  hidden: (l) => form.state(l).errors.length === 0,
}
```

## Conditional required — field required only when another field has a value

```ts
const form = createForm<{ method: string; reason: string }>({
  defaultValues: { method: "standard", reason: "" },
  onSubmit: ({ value }) => placeOrder(value),
})

const methodField = form.field<string>("method", {})

const reasonField = form.field<string>("reason", {
  validators: {
    onSubmit: ({ value, fieldApi }) => {
      const method = fieldApi.form.getFieldValue("method")
      if (method === "express" && !value.trim()) {
        return "A reason is required for express shipping"
      }
    },
    // Re-run when method changes (so error clears immediately when user switches back)
    onChangeListenTo: ["method"],
  },
})

// Only render the reason field when express is selected
const ShippingSection = {
  div: [
    { /* method select */ },
    {
      div: [
        { /* reason input */ },
      ],
      hidden: (l) => methodField.value(l) !== "express",
    },
  ],
}
```

## Computing a derived field from other fields

Use a form-level `onChange` listener to keep a computed field in sync:

```ts
const form = createForm<{ quantity: number; unitPrice: number; total: number }>({
  defaultValues: { quantity: 1, unitPrice: 10, total: 10 },
  listeners: {
    onChange: ({ formApi }) => {
      const { quantity, unitPrice } = formApi.state.values
      formApi.setFieldValue("total", quantity * unitPrice, { touch: false })
    },
  },
  onSubmit: ({ value }) => checkout(value),
})

const quantityField = form.field<number>("quantity", {})
const priceField = form.field<number>("unitPrice", {})
const totalField = form.field<number>("total", {})

const TotalDisplay = {
  div: (l) => `Total: $${(totalField.value(l) ?? 0).toFixed(2)}`,
}
```

`{ touch: false }` prevents the programmatically-set `total` from being marked as dirty by the user.

## Using `computed` for derived display values

For display-only derived values (not stored in form state), use `computed` from `@domphy/core`:

```ts
import { computed } from "@domphy/core"

const quantityField = form.field<number>("quantity", {})
const priceField = form.field<number>("unitPrice", {})

const total = computed(() => {
  const qty = quantityField.value() ?? 0
  const price = priceField.value() ?? 0
  return qty * price
})

// Use reactively — total.get(l) auto-updates when either field changes
const TotalRow = {
  div: (l) => `Total: $${total.get(l).toFixed(2)}`,
}
```

`computed` is lazy and cached — it only recomputes when a subscribed field changes.

## `onDynamic` — re-validate when sibling values change

`onDynamic` fires whenever *any* form value changes, not just the field's own value. Use it when a field's validity depends on the shape of the whole form:

```ts
const discountField = form.field<number>("discount", {
  validators: {
    onDynamic: ({ value, fieldApi }) => {
      const subtotal = fieldApi.form.getFieldValue("subtotal")
      if (value > subtotal) return "Discount cannot exceed subtotal"
    },
  },
})
```

`onDynamic` runs on every form change — keep the function fast (synchronous, no side effects).

## Multi-field cross-validation with Standard Schema

A Zod schema with `.refine()` distributes errors to specific fields automatically:

```ts
import { z } from "zod"

const RangeSchema = z.object({
  start: z.coerce.number().min(0),
  end: z.coerce.number().min(0),
}).refine((v) => v.end >= v.start, {
  message: "End must be greater than or equal to start",
  path: ["end"],   // error goes to the "end" field
})

const form = createForm<{ start: number; end: number }>({
  defaultValues: { start: 0, end: 0 },
  validators: { onChange: RangeSchema },
  onSubmit: ({ value }) => save(value),
})

const startField = form.field<number>("start", {})
const endField = form.field<number>("end", {})

// Error from .refine() appears in endField.errors() — not form.state().errors
```

When a Standard Schema validator has a `path` on a refinement error, `@domphy/form` routes it to the named field rather than the form-level errors array.
