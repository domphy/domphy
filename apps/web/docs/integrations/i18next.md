<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import i18next from "../demos/integrations/i18next.ts?raw"
</script>

# i18next

Install i18next separately — Domphy does not wrap it.

```bash
npm install i18next
```

## Live Example

<CodeEditor :code="i18next" />

## Pattern

Three steps to connect any external state system to Domphy:

1. **Init the library** — standard i18next setup, no Domphy involvement
2. **Bridge with `toState`** — create a `State` that mirrors the external value
3. **Expose a reactive helper** — a function that calls `lang.get(listener)` to subscribe, then reads from i18next

```ts
// 1. bridge
const lang = toState(i18next.language)
i18next.changeLanguage(lng, () => lang.set(lng))

// 2. reactive helper
function translate(listener, key, options?) {
  lang.get(listener)          // subscribe — rerenders when language changes
  return i18next.t(key, options)
}

// 3. use in elements
{ h1: (l) => translate(l, "greeting", { name: "Dev" }) }
```

This same pattern works for any library that can notify changes — Zustand, RxJS, TanStack Query, etc.


