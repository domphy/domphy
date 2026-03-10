<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Form from "../../demos/patches/Form.ts?raw"
</script>

# Form

Use `form` and `field` patches together with `FormState` to manage form state and accessibility.

<CodeEditor :code="Form" />

## Patches

### `form(state)`

Injects a `FormState` instance into context. Apply to the `<form>` element.

```ts
const myForm = new FormState();

{ form: null, $: [form(myForm)] }
```

### `field(path, validator?)`

Wires an input to a field in `FormState` via context. Handles value, blur (touched), and `aria-invalid`. Apply to `input`, `select`, or `textarea`.

```ts
{ input: null, $: [field("email", (v) => v ? null : { error: "Required" }), inputText()] }
{ input: null, type: "checkbox", $: [field("agree"), inputCheckbox()] }
{ select: null, $: [field("role"), select()] }
```

## FormState

```ts
const myForm = new FormState();

// Register a field (idempotent)
const f = myForm.setField("email", "", validator);

// Get field state
const f = myForm.getField("email");

// Form-level
myForm.valid      // boolean — no fields have error
myForm.snapshot() // { email: "...", ... } reconstructed as nested object
myForm.reset()    // reset all fields to initValue
myForm.fields     // Map<string, FieldState> — escape hatch
```

## FieldState

```ts
f.value(listener?)     // get value + subscribe
f.setValue(val)        // set value, runs validator
f.dirty(listener?)     // value !== initValue
f.touched(listener?)   // blurred at least once
f.setTouched()         // mark as touched
f.message("error", l)  // get error message + subscribe
f.message("warning", l)
f.message("success", l)
f.status(listener?)    // "error" | "warning" | "success" | undefined
f.setMessages({ error?, warning?, success? })
f.reset()
```

## Nested paths

Use dot notation for nested data. `snapshot()` reconstructs the object automatically.

```ts
myForm.setField("address.city", "");
myForm.setField("address.zip", "");
myForm.setField("items.0.qty", 1);

myForm.snapshot();
// { address: { city: "", zip: "" }, items: [{ qty: 1 }] }
```

## Validator

A validator is a plain function — no library required.

```ts
const emailValidator = (value: unknown): FieldMessages | null => {
  if (!value) return { error: "Required" };
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(value as string)) return { error: "Invalid email" };
  return { success: "Looks good!" };
};
```

Escape hatch with Zod:

```ts
import { z } from "zod";
const schema = z.string().email("Invalid email");

const zodValidator = (value: unknown): FieldMessages | null => {
  const result = schema.safeParse(value);
  return result.success ? null : { error: result.error.errors[0].message };
};
```

::: code-group
<<< ../../../../../packages/ui/src/classes/FieldState.ts [FieldState]
<<< ../../../../../packages/ui/src/classes/FormState.ts [FormState]
<<< ../../../../../packages/ui/src/patches/form.ts [form]
<<< ../../../../../packages/ui/src/patches/field.ts [field]
:::


