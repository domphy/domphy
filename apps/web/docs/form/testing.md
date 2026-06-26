---
title: "Testing Forms"
description: "Test @domphy/form with Vitest and jsdom: synchronous state assertions with flushSync, testing validators, async validation, and submission."
---

# Testing Forms

## Setup

`@domphy/form` runs in any JavaScript environment — no DOM required for state and validation tests. Tests that involve reactivity need `flushSync()` to drain the reactive queue synchronously.

```bash
npm install -D vitest @vitest/ui
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",   // or "jsdom" if testing DOM output
  },
})
```

## Basic: test field values and validation

```ts
import { createForm } from "@domphy/form/domphy"
import { flushSync } from "@domphy/core"
import { describe, it, expect } from "vitest"

describe("email field", () => {
  it("validates email format on change", () => {
    const form = createForm<{ email: string }>({
      defaultValues: { email: "" },
      onSubmit: () => {},
    })

    const emailField = form.field<string>("email", {
      validators: {
        onChange: ({ value }) => value.includes("@") ? undefined : "Invalid email",
      },
    })

    // Start: no errors (field not yet touched)
    expect(emailField.errors()).toEqual([])

    // Type an invalid value
    emailField.handleChange("notanemail")
    flushSync()

    expect(emailField.errors()).toEqual(["Invalid email"])

    // Fix it
    emailField.handleChange("user@example.com")
    flushSync()

    expect(emailField.errors()).toEqual([])

    form.destroy()
  })
})
```

`flushSync()` from `@domphy/core` drains all pending reactive updates synchronously, so assertions after `.handleChange()` see the updated state immediately.

## Test form-level validation

```ts
import { createForm } from "@domphy/form/domphy"
import { flushSync } from "@domphy/core"

it("rejects date range where end is before start", () => {
  const form = createForm<{ start: string; end: string }>({
    defaultValues: { start: "", end: "" },
    validators: {
      onChange: ({ value }) => {
        if (value.start && value.end && value.end < value.start) {
          return "End must be after start"
        }
      },
    },
    onSubmit: () => {},
  })

  const startField = form.field<string>("start", {})
  const endField = form.field<string>("end", {})

  startField.handleChange("2024-06-10")
  endField.handleChange("2024-06-01")
  flushSync()

  expect(form.state().errors).toContain("End must be after start")
  expect(form.isValid()).toBe(false)

  endField.handleChange("2024-06-20")
  flushSync()

  expect(form.state().errors).toEqual([])
  expect(form.isValid()).toBe(true)

  form.destroy()
})
```

## Test async validation

For async validators, `await` the field's validate promise directly via `field.api.validate()`:

```ts
import { createForm } from "@domphy/form/domphy"
import { vi } from "vitest"

it("checks username availability asynchronously", async () => {
  const checkUsername = vi.fn().mockResolvedValue(false)   // false = taken

  const form = createForm<{ username: string }>({
    defaultValues: { username: "" },
    onSubmit: () => {},
  })

  const usernameField = form.field<string>("username", {
    validators: {
      onChangeAsync: async ({ value }) => {
        if (!value) return undefined
        const available = await checkUsername(value)
        return available ? undefined : "Username already taken"
      },
    },
  })

  // Trigger the async validator
  usernameField.handleChange("alice")

  // Wait for the async validator to complete
  await usernameField.api.validate("change")

  expect(usernameField.errors()).toEqual(["Username already taken"])
  expect(checkUsername).toHaveBeenCalledWith("alice")

  form.destroy()
})
```

## Test submission

```ts
import { createForm } from "@domphy/form/domphy"
import { flushSync } from "@domphy/core"
import { vi } from "vitest"

it("calls onSubmit with valid form values", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined)

  const form = createForm<{ email: string; password: string }>({
    defaultValues: { email: "", password: "" },
    validators: {
      onSubmit: ({ value }) =>
        value.email && value.password ? undefined : "All fields required",
    },
    onSubmit,
  })

  const emailField = form.field<string>("email", {})
  const passwordField = form.field<string>("password", {})

  // Fill the form
  emailField.setValue("user@example.com")
  passwordField.setValue("secret123")
  flushSync()

  // Submit
  await form.handleSubmit()

  expect(onSubmit).toHaveBeenCalledOnce()
  expect(onSubmit.mock.calls[0][0].value).toEqual({
    email: "user@example.com",
    password: "secret123",
  })

  form.destroy()
})

it("does not call onSubmit when validation fails", async () => {
  const onSubmit = vi.fn()

  const form = createForm<{ email: string }>({
    defaultValues: { email: "" },
    validators: {
      onSubmit: ({ value }) => value.email ? undefined : "Email required",
    },
    onSubmit,
  })

  form.field<string>("email", {})

  await form.handleSubmit()

  expect(onSubmit).not.toHaveBeenCalled()
  expect(form.state().errors).toContain("Email required")

  form.destroy()
})
```

## Test field array operations

Array mutations go through `form.form` (the underlying `FormApi`):

```ts
import { createForm } from "@domphy/form/domphy"
import { flushSync } from "@domphy/core"

it("manages a dynamic tag list", () => {
  const form = createForm<{ tags: string[] }>({
    defaultValues: { tags: ["typescript"] },
    onSubmit: () => {},
  })

  const tagsField = form.field<string[]>("tags", {})

  expect(tagsField.value()).toEqual(["typescript"])

  // Push via the underlying FieldApi
  tagsField.api.pushValue("domphy")
  flushSync()

  expect(tagsField.value()).toEqual(["typescript", "domphy"])

  // Remove first element via the underlying FormApi
  form.form.removeFieldValue("tags", 0)
  flushSync()

  expect(tagsField.value()).toEqual(["domphy"])

  form.destroy()
})
```

## Test reset behavior

```ts
it("resets to defaultValues", () => {
  const form = createForm<{ name: string }>({
    defaultValues: { name: "Alice" },
    onSubmit: () => {},
  })

  const nameField = form.field<string>("name", {})

  nameField.handleChange("Bob")
  flushSync()

  expect(nameField.value()).toBe("Bob")
  expect(form.state().isDirty).toBe(true)

  form.reset()
  flushSync()

  expect(nameField.value()).toBe("Alice")
  expect(form.state().isPristine).toBe(true)

  form.destroy()
})
```

## Access field meta in tests

`field.meta()` (called without a listener) returns the current metadata snapshot:

```ts
it("tracks touched state after blur", () => {
  const form = createForm<{ email: string }>({
    defaultValues: { email: "" },
    onSubmit: () => {},
  })

  const emailField = form.field<string>("email", {})

  expect(emailField.meta().isTouched).toBe(false)

  emailField.handleBlur()
  flushSync()

  expect(emailField.meta().isTouched).toBe(true)

  form.destroy()
})
```

## Validate all fields programmatically

`form.form.validateAllFields(cause)` runs all field validators without requiring a submit:

```ts
it("reports all errors at once", async () => {
  const form = createForm<{ name: string; email: string }>({
    defaultValues: { name: "", email: "" },
    onSubmit: () => {},
  })

  const nameField = form.field<string>("name", {
    validators: { onSubmit: ({ value }) => value ? undefined : "Name required" },
  })
  const emailField = form.field<string>("email", {
    validators: { onSubmit: ({ value }) => value.includes("@") ? undefined : "Invalid email" },
  })

  await form.form.validateAllFields("submit")

  expect(nameField.errors()).toContain("Name required")
  expect(emailField.errors()).toContain("Invalid email")

  form.destroy()
})
```
