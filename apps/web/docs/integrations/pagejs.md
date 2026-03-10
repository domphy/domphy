<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import pagejs from "../demos/integrations/pagejs.ts?raw"
</script>

# page.js

Install page.js separately — Domphy does not wrap it.

```bash
npm install page
```

## Live Example

<CodeEditor :code="pagejs" />

## Pattern

page.js handles URL matching and history. Domphy handles the UI. The bridge is `toState` — push the matched route into a state, swap content reactively.

```ts
const route = toState("/")
const params = toState<Record<string, string>>({})

page("/", () => route.set("/"))
page("/users/:id", (ctx) => {
    params.set(ctx.params)
    route.set("/users/:id")
})
page.start()

// router view — switches on route state
const RouterView: DomphyElement<"div"> = {
    div: (listener) => {
        switch (route.get(listener)) {
            case "/":          return Home
            case "/users/:id": return UserDetail
            default:           return NotFound
        }
    },
}
```

Navigate programmatically by calling `page("/path")` — page.js updates the URL and fires the matching handler, which sets state, which re-renders the view.

## Key points

- `page.start()` begins listening — call once at app init
- Route params live in `ctx.params` — push to a separate `params` state if needed
- `route.get(listener)` inside the router view subscribes — the view swaps when route changes
- Navigate with `page("/path")` from any event handler — no router-specific link component needed

