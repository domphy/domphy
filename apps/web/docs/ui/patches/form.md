<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Form from "../../demos/patches/Form.ts?raw"
</script>

# Form

Form state, validation, and submission live in **[`@domphy/form`](/docs/form/)** — a 1-1 port of `@tanstack/form-core` with a Domphy adapter. `@domphy/ui` provides the presentation: native `input`/`select`/`textarea` with the input patches, `label`, and `formGroup` for layout.

> The old UI-level `form()` / `field()` patches and `FormState` / `FieldState` classes were removed in favor of `@domphy/form`, so form logic lives in exactly one place.

<CodeEditor :code="Form" />

## Pattern

`createForm` owns the state; each `field` handle binds one input. Read `value`/`errors` reactively and forward DOM events to the handle:

```ts
import { createForm } from "@domphy/form/domphy"
import { inputText, label, button, formGroup } from "@domphy/ui"

const form = createForm<{ email: string }>({
  defaultValues: { email: "" },
  onSubmit: ({ value }) => save(value),
})

const email = form.field<string>("email", {
  validators: { onChange: ({ value }) => (value.includes("@") ? undefined : "Invalid email") },
})

const Field = {
  div: [
    { label: "Email", $: [label()] },
    {
      input: null,
      $: [inputText()],
      value: (l) => email.value(l),
      onInput: (e) => email.handleChange((e.target as HTMLInputElement).value),
      onBlur: () => email.handleBlur(),
    },
  ],
  $: [formGroup()],
}
```

See the [`@domphy/form` docs](/docs/form/) for validators, async validation, arrays, Standard Schema, and the full field/form API.

## formGroup

`formGroup({ color?, layout? })` is the one form patch that stays in `@domphy/ui` — it is pure layout (label + control + help text) with no state. `layout` is `"horizontal"` (default) or `"vertical"`. Host tag: `fieldset`.

```ts
{ fieldset: [{ label: "Name", $: [label()] }, { input: null, $: [inputText()] }], $: [formGroup()] }
```
