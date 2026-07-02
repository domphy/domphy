---
title: "Form Composition"
description: "Share form options with formOptions(), pre-populate forms using mergeForm(), and build reusable form section factories."
---

# Form Composition

## `formOptions()` — shared form configuration

`formOptions()` (from `@domphy/form`) creates a typed options object that can be spread into multiple `createForm()` calls. Useful for shared validators, default values, or submit handlers:

```ts
import { formOptions } from "@domphy/form"
import { createForm } from "@domphy/form/domphy"

const baseContactOptions = formOptions({
  defaultValues: { email: "", phone: "" },
  validators: {
    onSubmit: ({ value }) => {
      if (!value.email && !value.phone) return "Provide an email or phone number"
    },
  },
})

// Use the shared options in a checkout form
const checkoutForm = createForm({
  ...baseContactOptions,
  onSubmit: async ({ value }) => completeCheckout(value),
})

// And in a profile form — override the onSubmit, keep the validators
const profileForm = createForm({
  ...baseContactOptions,
  defaultValues: { email: user.email, phone: user.phone },
  onSubmit: async ({ value }) => updateProfile(value),
})
```

`formOptions()` preserves TypeScript inference — the returned object is typed exactly as passed, so spreading it into `createForm()` keeps full type safety.

## Reusable form section factories

Create a function that returns a set of fields bound to a specific form, then call it in multiple places:

```ts
import { createForm } from "@domphy/form/domphy"
import { inputText, label, formGroup } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

interface AddressInput {
  street: string
  city: string
  zip: string
}

// Factory: returns bound field handles for an address section
function createAddressSection(
  form: ReturnType<typeof createForm<{ address: AddressInput }>>,
  prefix: string = "address",
) {
  const street = form.field<string>(`${prefix}.street`, {
    validators: { onChange: ({ value }) => value ? undefined : "Required" },
  })
  const city = form.field<string>(`${prefix}.city`, {
    validators: { onChange: ({ value }) => value ? undefined : "Required" },
  })
  const zip = form.field<string>(`${prefix}.zip`, {
    validators: { onChange: ({ value }) => /^\d{5}$/.test(value) ? undefined : "5 digits" },
  })

  function AddressView() {
    return {
      fieldset: [
        { legend: "Address" },
        { label: "Street", $: [label()] },
        {
          input: null,
          type: "text",
          $: [inputText()],
          value: (l) => street.value(l),
          onInput: (e) => street.handleChange((e.target as HTMLInputElement).value),
          onBlur: () => street.handleBlur(),
        },
        {
          p: (l) => String(street.errors(l)[0] ?? ""),
          hidden: (l) => street.errors(l).length === 0,
        },
        { label: "City", $: [label()] },
        {
          input: null,
          type: "text",
          $: [inputText()],
          value: (l) => city.value(l),
          onInput: (e) => city.handleChange((e.target as HTMLInputElement).value),
          onBlur: () => city.handleBlur(),
        },
        {
          p: (l) => String(city.errors(l)[0] ?? ""),
          hidden: (l) => city.errors(l).length === 0,
        },
        { label: "ZIP", $: [label()] },
        {
          input: null,
          type: "text",
          $: [inputText()],
          value: (l) => zip.value(l),
          onInput: (e) => zip.handleChange((e.target as HTMLInputElement).value),
          onBlur: () => zip.handleBlur(),
        },
        {
          p: (l) => String(zip.errors(l)[0] ?? ""),
          hidden: (l) => zip.errors(l).length === 0,
        },
      ],
      $: [formGroup({ layout: "vertical" })],
    }
  }

  return { street, city, zip, AddressView }
}

// Usage in a checkout form
const checkoutForm = createForm<{ address: AddressInput }>({
  defaultValues: { address: { street: "", city: "", zip: "" } },
  onSubmit: ({ value }) => checkout(value),
})

const address = createAddressSection(checkoutForm)

const CheckoutPage = {
  form: [
    address.AddressView(),
    {
      button: "Place order",
      type: "submit",
    },
  ],
  onSubmit: (e) => { (e as Event).preventDefault(); checkoutForm.handleSubmit() },
  _onRemove: () => checkoutForm.destroy(),
}
```

## Module-level form state

Since `createForm()` returns a plain object (not a hook), you can create a form at module scope and share it across files:

```ts
// forms/signup.ts — created once, shared across modules
import { createForm } from "@domphy/form/domphy"

export interface SignupInput {
  email: string
  name: string
  plan: "free" | "pro"
}

export const signupForm = createForm<SignupInput>({
  formId: "signup",
  defaultValues: { email: "", name: "", plan: "free" },
  onSubmit: async ({ value }) => registerUser(value),
})

// Bind fields once — re-use anywhere
export const emailField = signupForm.field<string>("email", {
  validators: { onChange: ({ value }) => value.includes("@") ? undefined : "Invalid email" },
})
export const nameField = signupForm.field<string>("name", {
  validators: { onChange: ({ value }) => value ? undefined : "Required" },
})
export const planField = signupForm.field<"free" | "pro">("plan", {})
```

```ts
// pages/step1.ts — imports the shared form
import { signupForm, emailField, nameField } from "../forms/signup"

const Step1 = {
  form: [
    { /* email input bound to emailField */ },
    { /* name input bound to nameField */ },
    {
      button: "Next",
      type: "button",
      onClick: () => signupForm.form.validateAllFields("submit").then(() => {
        if (signupForm.form.state.isValid) goToStep2()
      }),
    },
  ],
  onSubmit: (e) => (e as Event).preventDefault(),
}
```

## `mergeForm()` — pre-populate from server state

`mergeForm()` (from `@domphy/form`) deep-merges a partial `FormState` into an existing `FormApi`. Used primarily for SSR: the server serializes form state to JSON, sends it to the client, and the client merges it in before first render.

See [SSR & Hydration](/docs/form/ssr) for the full pattern.

```ts
import { mergeForm } from "@domphy/form"
import { createForm } from "@domphy/form/domphy"

const form = createForm<{ title: string; body: string }>({
  defaultValues: { title: "", body: "" },
  onSubmit: ({ value }) => save(value),
})

// Apply server-side state (e.g. pre-populated values, server validation errors)
const serverState = await fetchFormState()   // { values: {...}, fieldMeta: {...} }
mergeForm(form.form, serverState)
```

`mergeForm()` mutates the form state directly — call it before mounting the form UI.

## Sharing validators between fields

Extract common validators into plain functions:

```ts
const required = ({ value }: { value: string }) =>
  value.trim() ? undefined : "This field is required"

const validEmail = ({ value }: { value: string }) =>
  /^[^@]+@[^@]+\.[^@]+$/.test(value) ? undefined : "Invalid email address"

const minLength = (n: number) => ({ value }: { value: string }) =>
  value.length >= n ? undefined : `Minimum ${n} characters`

// Usage
const emailField = form.field<string>("email", {
  validators: { onChange: validEmail, onBlur: validEmail },
})

const nameField = form.field<string>("name", {
  validators: { onChange: required, onBlur: minLength(2) },
})

const passwordField = form.field<string>("password", {
  validators: { onChange: minLength(8) },
})
```

## Using Standard Schema for reusable validation

A Zod schema defined once can be shared across multiple forms:

```ts
import { z } from "zod"

export const emailSchema = z.string().email("Invalid email")
export const passwordSchema = z.string().min(8, "At least 8 characters")

// Apply to any form that has an email field
const loginForm = createForm<{ email: string; password: string }>({
  defaultValues: { email: "", password: "" },
  onSubmit: ({ value }) => login(value),
})

const loginEmail = loginForm.field("email", {
  validators: { onChange: emailSchema },
})
const loginPassword = loginForm.field("password", {
  validators: { onChange: passwordSchema },
})

// Same schemas in a signup form
const signupForm = createForm<{ email: string; password: string; name: string }>({
  defaultValues: { email: "", password: "", name: "" },
  onSubmit: ({ value }) => signup(value),
})

const signupEmail = signupForm.field("email", {
  validators: { onChange: emailSchema },
})
const signupPassword = signupForm.field("password", {
  validators: { onChange: passwordSchema },
})
```
