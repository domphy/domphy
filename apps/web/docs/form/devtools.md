---
title: "Devtools"
description: "Debug @domphy/form with the form devtools browser extension: inspect form state, force submission, reset, and identify forms by formId."
---

# Devtools

`@domphy/form` broadcasts form state to the form debugger browser extension automatically. Every form mounts an event listener and emits its state on every change — no extra configuration required.

## Install the browser extension

Install the [Form Devtools browser extension](https://chromewebstore.google.com/detail/tanstack-form-devtools/kjndbikglildmjfnohejdahdhoiggahf) from the Chrome Web Store (also available for Firefox via the add-ons site).

Once installed, a **Form Devtools** panel appears in the browser DevTools. Open it to see all mounted forms on the current page.

## What the devtools show

For each form:
- All current values
- Form-level errors and validation state
- Per-field metadata: `isTouched`, `isDirty`, `isValidating`, `errors`, `errorMap`
- Submission flags: `isSubmitting`, `isSubmitted`, `submissionAttempts`
- `canSubmit` status

Actions available from the panel:
- **Reset** — calls `form.reset()` directly
- **Force submit** — triggers `form.handleSubmit()` bypassing validation guards

## Naming forms with `formId`

When multiple forms are on the same page, give each one a `formId` to identify it in the devtools panel:

```ts
import { createForm } from "@domphy/form/domphy"

const loginForm = createForm<{ email: string; password: string }>({
  formId: "login-form",   // shows as "login-form" in devtools
  defaultValues: { email: "", password: "" },
  onSubmit: ({ value }) => login(value),
})

const signupForm = createForm<{ email: string; name: string }>({
  formId: "signup-form",
  defaultValues: { email: "", name: "" },
  onSubmit: ({ value }) => signup(value),
})
```

Without `formId`, each form gets a random UUID that changes on page reload.

## How the integration works

`createForm()` internally calls `form.mount()`, which wires up an `EventClient` that:

1. **Emits `form-api`** on mount and on every store change — sends current state + options to the devtools panel.
2. **Listens for `request-form-state`** — responds with the current state when the panel requests it.
3. **Listens for `request-form-reset`** — calls `form.reset()` when the Reset button is clicked in the panel.
4. **Listens for `request-form-force-submit`** — calls `form.handleSubmit()` when Force Submit is clicked.
5. **Emits `form-unmounted`** when `form.destroy()` is called — removes the form from the panel.

This happens automatically. You do not need to import or configure the EventClient.

## Debugging form state without devtools

You can inspect form state programmatically at any time:

```ts
// Non-reactive snapshot — reads current state without subscribing
const snapshot = form.form.state
console.log(snapshot.values)         // current field values
console.log(snapshot.isValid)        // overall validity
console.log(snapshot.fieldMeta)      // per-field metadata map
console.log(snapshot.errors)         // form-level errors

// Per-field snapshot
const emailMeta = form.form.getFieldMeta("email")
console.log(emailMeta?.errors)       // errors for the email field
console.log(emailMeta?.isTouched)    // whether the user has blurred the field
```

## Tracking form changes with `version(l)`

The form handle exposes `version(l)` — a reactive change counter that increments on every store flush. Use it to log every change during development:

```ts
import { effect } from "@domphy/core"

const form = createForm<{ name: string }>({
  defaultValues: { name: "" },
  onSubmit: ({ value }) => save(value),
})

// Log the full state on every change
effect(() => {
  form.version()   // subscribe (no listener in plain effect)
  const state = form.form.state
  console.log("[form]", {
    values: state.values,
    isValid: state.isValid,
    isDirty: state.isDirty,
  })
})
```

Remove the `effect` call before shipping to production.

## Subscribing to the raw store

For custom diagnostics, subscribe directly to the underlying form store:

```ts
const unsubscribe = form.form.store.subscribe(() => {
  const { values, isValid, isSubmitting } = form.form.state
  myAnalytics.track("form_state_change", { isValid, isSubmitting })
})

// Later: clean up
unsubscribe.unsubscribe()
```

## Cleanup on unmount

Always call `form.destroy()` when the form element is removed from the DOM to unregister the devtools listener and clean up field subscriptions:

```ts
const FormElement = {
  form: [ /* ... */ ],
  _onRemove: () => form.destroy(),
}
```

If `destroy()` is not called, the devtools will still show the form as mounted and the `form-unmounted` event will never fire.
