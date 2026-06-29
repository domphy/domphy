---
title: "Migration Guide"
description: "Upgrade paths between major Domphy versions — breaking changes, deprecations, and codemods."
---

# Migration Guide

## v0.18 → current

### Forms: `form()`/`field()` patches removed

The `form()` and `field()` patches in `@domphy/ui` were removed. They mixed form state with layout, which made testing difficult and tied form logic to rendering.

**Before:**
```ts
import { form, field } from "@domphy/ui"

const LoginForm = {
  form: [
    {
      input: null,
      type: "email",
      $: [field({ name: "email" })],
    },
  ],
  $: [form({ onSubmit: handleSubmit })],
}
```

**After:**
```ts
import { createForm } from "@domphy/form/domphy"

const form = createForm<{ email: string }>({
  defaultValues: { email: "" },
  onSubmit: ({ value }) => handleSubmit(value),
})

const emailField = form.field<string>("email", {})

const LoginForm = {
  form: [
    {
      input: null,
      type: "email",
      value: (l) => emailField.value(l) ?? "",
      onInput: (e: Event) => emailField.handleChange((e.target as HTMLInputElement).value),
    },
  ],
  onSubmit: (e: Event) => { e.preventDefault(); form.handleSubmit() },
}
```

`formGroup()` layout patch remains in `@domphy/ui` — it's now only for visual grouping, not form state.

### `FormState`/`FieldState` types removed

These were exports from `@domphy/ui`. They no longer exist. Use `FormState<T>` and `FieldMeta` from `@domphy/form` instead.

### `onlineManager.isOnline()` is now synchronous

Previously `isOnline()` returned a `Promise<boolean>`. It now returns `boolean` directly.

## v0.17 → v0.18

### `themeColor` signature changed

**Before:**
```ts
themeColor("primary", 5)   // positional (color, shade)
```

**After:**
```ts
themeColor(element, "base", "primary")   // (element, tone, color)
```

The function is now bound to an element (for tone resolution) and accepts an explicit tone string. The old signature is removed — there is no compatibility shim.

### `toState` no longer accepts a `ReadableState` in `RecordState`

Previously `RecordState` could be nested directly with another state. The nested state pattern now requires `computed()` to derive:

**Before:**
```ts
const inner = toState(0)
const outer = new RecordState({ value: inner })   // ✗ removed
```

**After:**
```ts
const inner = toState(0)
const doubled = computed(() => inner.get() * 2)
const outer = new RecordState({ doubled })   // ✓ computed
```

### Patches: `color` prop added to typography patches

Typography patches (`small()`, `paragraph()`, `heading()`) now accept a `color` prop for semantic coloring:

```ts
// Before: no way to set semantic color via patch
{ span: "Error text", style: { color: themeColor(el, "base", "error") } }   // ✗ inline

// After:
{ span: "Error text", $: [small({ color: "error" })] }   // ✓
```

## General upgrade checklist

1. Run `pnpm up --recursive "@domphy/*"` to update all packages together
2. Run `@domphy/doctor` on your elements: `diagnose(root)` reports rule violations
3. Check `@domphy/doctor` for `inline-typography` issues — the new typography patches cover all cases
4. Run TypeScript — removed APIs show up as type errors
5. Run your tests

## Deprecated features (still work, will be removed)

| Feature | Status | Replacement |
|---------|--------|-------------|
| `themeVars()` raw CSS vars | Soft deprecated | Use `themeColor(el, tone, color)` |
| `configure({ legacy: true })` | Deprecated | Remove — legacy mode has been removed |
| `$: [patch]` single patch (not array) | Still works, no plans to remove | `$: [patch()]` array form preferred |