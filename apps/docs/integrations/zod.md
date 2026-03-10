<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import zod from "../demos/integrations/zod.ts?raw"
</script>

# Zod

Install Zod separately — Domphy does not wrap it.

```bash
npm install zod
```

## Pattern

Zod validates data. Domphy displays errors reactively. The bridge is `toState` — push the formatted error object into a state, UI reads it on every change.

```ts
const errors = toState<z.ZodFormattedError<typeof schema._type> | null>(null)

function validate() {
    const result = schema.safeParse(formData)
    if (result.success) {
        errors.set(null)
    } else {
        errors.set(result.error.format())
    }
}

// read per-field error in element
{ div: (l) => errors.get(l)?.email?._errors[0] ?? "" }
```

`result.error.format()` produces a typed object keyed by field name — each field has `_errors: string[]`. Read the first error per field and display it reactively.

## Live Example

<CodeEditor :code="zod" />

## Key points

- `safeParse` never throws — always returns `{ success, data }` or `{ success, error }`
- `error.format()` gives a nested object: `errors.fieldName._errors[0]` is the first message
- Each field error is an independent state read — only that error re-renders when it changes
- Validate on submit, on blur, or on input — same pattern, different trigger
