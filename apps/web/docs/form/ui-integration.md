---
title: "UI Patches & Form Fields"
description: "Wire @domphy/form field handles to @domphy/ui input patches: text, select, checkbox, switch, number, textarea, and error display."
---

# UI Patches & Form Fields

`@domphy/form` manages state; `@domphy/ui` provides styled input patches. This page shows the binding pattern for every common input type.

All examples assume:

```ts
import { createForm } from "@domphy/form/domphy"
import { themeSpacing } from "@domphy/theme"
import { button } from "@domphy/ui"
```

## Text input

`inputText()` applies to `<input>`. Bind `value` reactively, forward `onInput` and `onBlur`:

```ts
import { inputText, label, formGroup } from "@domphy/ui"

const form = createForm<{ email: string }>({
  defaultValues: { email: "" },
  onSubmit: ({ value }) => save(value),
})

const emailField = form.field<string>("email", {
  validators: {
    onChange: ({ value }) => value.includes("@") ? undefined : "Invalid email",
  },
})

const EmailInput = {
  fieldset: [
    { label: "Email", $: [label()] },
    {
      input: null,
      type: "email",
      $: [inputText()],
      value: (l) => emailField.value(l),
      onInput: (e) => emailField.handleChange((e.target as HTMLInputElement).value),
      onBlur: () => emailField.handleBlur(),
      dataStatus: (l) => emailField.errors(l).length > 0 ? "error" : undefined,
    },
    {
      p: (l) => String(emailField.errors(l)[0] ?? ""),
      hidden: (l) => emailField.errors(l).length === 0,
    },
  ],
  $: [formGroup({ layout: "vertical" })],
}
```

`formGroup()` must be applied to a `<fieldset>`. It lays out labels, inputs, and helper `<p>` tags in a grid. The helper paragraph gets smaller text styling automatically.

Setting `dataStatus: "error"` on the input triggers a red outline from `inputText()`.

## Textarea

`textarea()` applies to `<textarea>`. Use the `value` property for controlled binding and optionally pass `autoResize: true` to grow the height to content:

```ts
import { textarea, label, formGroup } from "@domphy/ui"

const bioField = form.field<string>("bio", {
  validators: {
    onChange: ({ value }) => value.length <= 500 ? undefined : "Maximum 500 characters",
  },
})

const BioInput = {
  fieldset: [
    { label: "Bio", $: [label()] },
    {
      textarea: null,
      $: [textarea({ autoResize: true })],
      value: (l) => bioField.value(l),
      onInput: (e) => bioField.handleChange((e.target as HTMLTextAreaElement).value),
      onBlur: () => bioField.handleBlur(),
    },
    {
      p: (l) => String(bioField.errors(l)[0] ?? ""),
      hidden: (l) => bioField.errors(l).length === 0,
    },
  ],
  $: [formGroup({ layout: "vertical" })],
}
```

## Number input

`inputNumber()` applies to `<input type="number">`. Read `e.target.valueAsNumber` — it returns `NaN` for empty input:

```ts
import { inputNumber, label, formGroup } from "@domphy/ui"

const quantityField = form.field<number>("quantity", {
  validators: {
    onChange: ({ value }) => {
      if (!value || isNaN(value)) return "Required"
      if (value < 1) return "Minimum 1"
    },
  },
})

const QuantityInput = {
  fieldset: [
    { label: "Quantity", $: [label()] },
    {
      input: null,
      type: "number",
      min: "1",
      $: [inputNumber()],
      value: (l) => String(quantityField.value(l) ?? ""),
      onInput: (e) => {
        const raw = (e.target as HTMLInputElement).valueAsNumber
        quantityField.handleChange(isNaN(raw) ? 0 : raw)
      },
      onBlur: () => quantityField.handleBlur(),
    },
    {
      p: (l) => String(quantityField.errors(l)[0] ?? ""),
      hidden: (l) => quantityField.errors(l).length === 0,
    },
  ],
  $: [formGroup({ layout: "vertical" })],
}
```

## Select (native dropdown)

`select()` applies to a native `<select>`. Use `onChange` (not `onInput`) and read `e.target.value`:

```ts
import { select as selectPatch, label, formGroup } from "@domphy/ui"

const roleField = form.field<string>("role", {
  validators: {
    onChange: ({ value }) => value ? undefined : "Select a role",
  },
})

const RoleSelect = {
  fieldset: [
    { label: "Role", $: [label()] },
    {
      select: [
        { option: "-- Select --", value: "", disabled: true },
        { option: "Admin", value: "admin" },
        { option: "Editor", value: "editor" },
        { option: "Viewer", value: "viewer" },
      ],
      $: [selectPatch()],
      value: (l) => roleField.value(l),
      onChange: (e) => roleField.handleChange((e.target as HTMLSelectElement).value),
      onBlur: () => roleField.handleBlur(),
    },
    {
      p: (l) => String(roleField.errors(l)[0] ?? ""),
      hidden: (l) => roleField.errors(l).length === 0,
    },
  ],
  $: [formGroup({ layout: "vertical" })],
}
```

## Checkbox

`inputCheckbox()` applies to `<input type="checkbox">`. Bind to `checked` (boolean), not `value`:

```ts
import { inputCheckbox, label, formGroup } from "@domphy/ui"

const agreeField = form.field<boolean>("agreeToTerms", {
  validators: {
    onSubmit: ({ value }) => value ? undefined : "You must agree to the terms",
  },
})

const AgreeCheckbox = {
  fieldset: [
    {
      input: null,
      type: "checkbox",
      $: [inputCheckbox()],
      checked: (l) => agreeField.value(l) ?? false,
      onChange: (e) => agreeField.handleChange((e.target as HTMLInputElement).checked),
      onBlur: () => agreeField.handleBlur(),
    },
    { label: "I agree to the terms", $: [label()] },
    {
      p: (l) => String(agreeField.errors(l)[0] ?? ""),
      hidden: (l) => agreeField.errors(l).length === 0,
    },
  ],
  $: [formGroup({ layout: "horizontal" })],
}
```

## Toggle switch

`inputSwitch()` is a styled checkbox that renders as a toggle track. Wire it exactly like a checkbox:

```ts
import { inputSwitch, label, formGroup } from "@domphy/ui"

const notificationsField = form.field<boolean>("notifications", {})

const NotificationsToggle = {
  fieldset: [
    { label: "Email notifications", $: [label()] },
    {
      input: null,
      type: "checkbox",
      $: [inputSwitch()],
      checked: (l) => notificationsField.value(l) ?? false,
      onChange: (e) => notificationsField.handleChange((e.target as HTMLInputElement).checked),
    },
  ],
  $: [formGroup({ layout: "horizontal" })],
}
```

## Radio group

Render multiple `inputRadio()` inputs sharing the same `name`. Check against the current field value:

```ts
import { inputRadio, label, formGroup } from "@domphy/ui"

const planField = form.field<"free" | "pro" | "team">("plan", {
  validators: {
    onSubmit: ({ value }) => value ? undefined : "Select a plan",
  },
})

const PLANS = [
  { value: "free" as const, label: "Free" },
  { value: "pro" as const, label: "Pro ($9/mo)" },
  { value: "team" as const, label: "Team ($29/mo)" },
]

const PlanGroup = {
  fieldset: [
    { legend: "Choose a plan" },
    ...PLANS.map(({ value, label: planLabel }) => ({
      _key: value,
      div: [
        {
          input: null,
          type: "radio",
          name: "plan",
          id: `plan-${value}`,
          $: [inputRadio()],
          checked: (l) => planField.value(l) === value,
          onChange: () => planField.handleChange(value),
          onBlur: () => planField.handleBlur(),
        },
        { label: planLabel, htmlFor: `plan-${value}`, $: [label()] },
      ],
      style: { display: "flex", alignItems: "center", gap: themeSpacing(2) },
    })),
    {
      p: (l) => String(planField.errors(l)[0] ?? ""),
      hidden: (l) => planField.errors(l).length === 0,
    },
  ],
  $: [formGroup({ layout: "vertical" })],
}
```

## Async validation indicator

Show a spinner while `meta.isValidating` is true:

```ts
import { spinner } from "@domphy/ui"

const usernameField = form.field<string>("username", {
  validators: {
    onChangeAsync: async ({ value }) => {
      if (!value) return undefined
      const taken = await checkUsername(value)
      return taken ? undefined : "Username already taken"
    },
    onChangeAsyncDebounceMs: 400,
  },
})

const UsernameInput = {
  fieldset: [
    { label: "Username", $: [label()] },
    {
      div: [
        {
          input: null,
          type: "text",
          $: [inputText()],
          value: (l) => usernameField.value(l),
          onInput: (e) => usernameField.handleChange((e.target as HTMLInputElement).value),
          onBlur: () => usernameField.handleBlur(),
          style: { width: "100%" },
        },
        {
          span: null,
          $: [spinner()],
          hidden: (l) => !usernameField.meta(l).isValidating,
          style: { position: "absolute", right: themeSpacing(2), top: "50%", transform: "translateY(-50%)" },
        },
      ],
      style: { position: "relative", display: "flex", alignItems: "center" },
    },
    {
      p: (l) => String(usernameField.errors(l)[0] ?? ""),
      hidden: (l) => usernameField.errors(l).length === 0,
    },
  ],
  $: [formGroup({ layout: "vertical" })],
}
```

## Reusable field factory

Build a factory function to avoid repeating the binding pattern:

```ts
import type { FieldHandle } from "@domphy/form/domphy"
import { inputText, label, formGroup } from "@domphy/ui"

function textInput(
  labelText: string,
  field: FieldHandle<string>,
  extra: Record<string, unknown> = {},
) {
  return {
    fieldset: [
      { label: labelText, $: [label()] },
      {
        input: null,
        type: "text",
        $: [inputText()],
        value: (l) => field.value(l),
        onInput: (e) => field.handleChange((e.target as HTMLInputElement).value),
        onBlur: () => field.handleBlur(),
        dataStatus: (l) => field.errors(l).length > 0 ? "error" : undefined,
        ...extra,
      },
      {
        p: (l) => String(field.errors(l)[0] ?? ""),
        hidden: (l) => field.errors(l).length === 0,
      },
    ],
    $: [formGroup({ layout: "vertical" })],
  }
}

// Usage:
const form = createForm<{ email: string; name: string }>({
  defaultValues: { email: "", name: "" },
  onSubmit: ({ value }) => signup(value),
})

const emailField = form.field<string>("email", {
  validators: { onChange: ({ value }) => value.includes("@") ? undefined : "Invalid email" },
})
const nameField = form.field<string>("name", {
  validators: { onChange: ({ value }) => value ? undefined : "Required" },
})

const SignupForm = {
  form: [
    textInput("Email", emailField, { type: "email", autocomplete: "email" }),
    textInput("Full name", nameField, { autocomplete: "name" }),
    {
      button: (l) => form.isSubmitting(l) ? "Creating account…" : "Sign up",
      type: "submit",
      $: [button({ color: "primary" })],
      disabled: (l) => !form.canSubmit(l),
    },
  ],
  onSubmit: (e) => { (e as Event).preventDefault(); form.handleSubmit() },
  _onRemove: () => form.destroy(),
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(3),
    maxWidth: themeSpacing(80),
  },
}
```

## `formGroup` layout options

`formGroup()` applies to `<fieldset>` and arranges its children in a CSS Grid:

| Prop | Default | Description |
|------|---------|-------------|
| `layout` | `"horizontal"` | `"horizontal"` — label beside control; `"vertical"` — label above control |
| `color` | `"neutral"` | Theme color for background and text |

Grid rules:
- `<legend>` spans the full width
- In horizontal: `<label>` goes in column 1, inputs in column 2, `<p>` appears below the input in column 2
- In vertical: all children span the full width
- `<p>` elements get a smaller text size automatically (helper / error text)
