---
title: "Core Concepts"
description: "How @domphy/form manages state, validation lifecycle, field state, and the relationship between FormApi and the Domphy adapter."
---

# Core Concepts

## Architecture

`@domphy/form` provides `FormApi`, `FieldApi`, and `ValidationLogic`. The Domphy adapter (`@domphy/form/domphy`) wraps them with reactive handles that plug into Domphy's listener system.

```
FormApi
   ↓ wrapped by
createForm() adapter        ← you call this
   ↓ returns
form handle {
  values(l), state(l), canSubmit(l)   ← reactive reads
  field(name, opts)                   ← create a field handle
  handleSubmit(), reset()             ← imperative actions
  form                                ← underlying FormApi
}
```

## Form state lifecycle

```
Initial            → user types →    Dirty
                   → user blurs →    Touched
                   → submit once →   isSubmitted = true (validates all)
                   → submitting →    isSubmitting = true
                   → submit done →   isSubmitting = false
```

Key flags:

| Flag | Description |
|------|-------------|
| `isSubmitted` | `true` after first submit attempt |
| `isSubmitting` | `true` during async submission |
| `isValid` | `true` when no field has errors |
| `canSubmit` | `true` when valid AND not submitting |
| `isPristine` | `true` when no field has been changed |
| `isDirty` | `true` when any field has changed from defaultValues |

## Field state lifecycle

```
Initial
  → onChange →  isDirty, value updates, onChange validators run
  → onBlur  →  isTouched = true, onBlur validators run
  → onSubmit → all validators run regardless of touched state
```

Field meta:

```ts
interface FieldMeta {
  isTouched: boolean
  isDirty: boolean
  isPristine: boolean
  isBlurred: boolean
  isValidating: boolean   // async validator in-flight
  errors: unknown[]
  errorMap: Partial<Record<"onChange"|"onBlur"|"onSubmit"|"onMount"|"onServer"|"onDynamic", unknown>>
}
```

## Validation execution order

1. `onChange` validators — every keystroke
2. `onChangeAsync` validators — debounced after onChange
3. `onBlur` validators — when field loses focus
4. `onBlurAsync` validators — async on blur
5. `onMount` validators — once on field creation
6. `onSubmit` validators — only on `handleSubmit()`
7. `onSubmitAsync` validators — async on submit

Earlier validators block later ones in the same "timing group" — if `onChange` returns an error, `onChangeAsync` does not run until the sync error clears.

## The adapter pattern

The Domphy adapter converts `FormApi` subscriptions to listener-based reactivity:

```ts
// Inside createForm() — simplified
function createForm<T>(options) {
  const api = new FormApi(options)
  api.mount()

  return {
    values: (l) => {
      // Subscribe listener to FormApi state
      api.store.subscribe(() => l?.notify())
      return api.state.values
    },
    field: (name, fieldOptions) => createFieldHandle(api, name, fieldOptions),
    handleSubmit: () => api.handleSubmit(),
    // ...
  }
}
```

This means `form.values(l)` re-renders only when `FormApi.state.values` changes — not on every keystroke unless the element's listener reads from the values state.

## `form.field()` creates a stable handle

Unlike React hooks, `form.field()` can be called anywhere — it creates a field handle that persists for the form's lifetime:

```ts
const form = createForm<{ email: string; name: string }>({
  defaultValues: { email: "", name: "" },
  onSubmit: ({ value }) => submit(value),
})

// Create once — these are stable objects
const emailField = form.field<string>("email", {
  validators: { onChange: ({ value }) => value.includes("@") ? undefined : "Invalid" },
})
const nameField = form.field<string>("name", {})
```

Do not call `form.field()` inside a reactive render function (it re-registers the field on each render). Create fields in module scope or component setup.

## Form options

```ts
const form = createForm<T>({
  defaultValues: T,                      // required — initial field values
  onSubmit: ({ value, formApi }) => {},  // called when form is valid and submitted
  onSubmitInvalid: ({ value, formApi }) => {},  // called on submit when invalid
  validators: {                          // form-level validators
    onChange: ({ value }) => string | undefined,
    onSubmit: ({ value }) => string | undefined,
  },
  asyncDebounceMs: 200,                  // global debounce for all async validators
  defaultState: Partial<Record<string, unknown>>,  // override initial state flags
})
```

## Reading form state

```ts
// Reactive reads (pass listener l)
form.values(l)       // T — current values
form.state(l)        // FormState<T> — full state including meta
form.canSubmit(l)    // boolean
form.isSubmitting(l) // boolean
form.isValid(l)      // boolean
form.isSubmitted(l)  // boolean
form.isDirty(l)      // boolean — any field differs from defaultValues
form.isPristine(l)   // boolean — no field has changed
form.isTouched(l)    // boolean — any field has been touched
form.isBlurred(l)    // boolean — any field has been blurred

// Imperative (no listener)
form.getFieldValue("email")                 // read a field value
form.setFieldValue("email", "new@x.com")    // set a field value
form.validateField("email")                 // trigger validation (returns errors[])
form.validateField("email", "blur")         // trigger with specific cause
form.reset()                                // reset to defaultValues
form.reset({ email: "a@b.com" })            // reset to given values
```

## Field handle API

```ts
const field = form.field<string>("name", options)

// Reactive
field.value(l)   // string — current value
field.errors(l)  // unknown[] — current errors
field.meta(l)    // FieldMeta — full field state

// Imperative
field.handleChange(newValue)        // update + run onChange validators
field.handleBlur()                  // mark touched + run onBlur validators
field.setValue(newValue)            // update without running validators
field.validate()                    // manually trigger validation (cause: "change")
field.validate("blur")              // trigger with specific cause

// Array field helpers (when TData extends any[])
field.pushValue(item)               // append to array
field.insertValue(index, item)      // insert at index
field.replaceValue(index, item)     // replace at index
field.removeValue(index)            // remove at index
field.swapValues(a, b)              // swap two indices
field.moveValue(a, b)               // move item from a to b
field.clearValues()                 // empty the array

field.api                           // underlying FieldApi (full form-core surface)
```
