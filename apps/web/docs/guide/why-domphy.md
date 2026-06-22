# Why Domphy

Most UI frameworks solve the same problem: "make DOM manipulation easier." They differ in *how* — components, virtual DOM, compiler transforms, hooks. Domphy takes a different route: **plain JS objects + patches applied at render time, no framework in the middle**.

This page explains when that matters — and when to stick with what you have.

## The shortest comparison

```ts
// React
function SaveButton({ label, onClick }) {
  return <button className="btn btn-primary" onClick={onClick}>{label}</button>
}

// Domphy
{ button: label, onClick, $: [button({ color: "primary" })] }
```

No component, no JSX, no transpiler step. The `$` array applies the `button` patch — style, ARIA, keyboard handling — directly onto the native `<button>`. What you write **is** what renders.

## The five things that make Domphy different

### 1. No JSX, no compiler

Every other mainstream framework requires a build step to handle special syntax: React's JSX, Svelte's `.svelte` files, Vue's SFCs, Solid's JSX.

Domphy UIs are **plain JS objects**. A `{ div: [...] }` is just an object literal. No transform, no plugin. You can put it in a `<script>` tag on a static page and it works.

```html
<script src="https://unpkg.com/@domphy/ui/dist/core-theme-ui.global.js"></script>
<script>
  const App = { button: "Hello", $: [Domphy.ui.button()] }
  const { core, theme } = Domphy
  theme.themeApply()
  new core.ElementNode(App).render(document.body)
</script>
```

This matters for **plugin apps** (SketchUp, Figma, VS Code extensions) where you want minimal dependencies and no build complexity.

### 2. Patches on native elements — no wrapper components

React, Vue, and Svelte wrap behavior in components. Every "button with tooltip" becomes a `<TooltipButton>` wrapper that renders a chain of DOM nodes you didn't ask for.

Domphy patches apply behavior *to the element you wrote*. There's one `<button>` in the DOM:

```ts
// Tooltip + button on the SAME native element
{ button: "Save", $: [button({ color: "primary" }), tooltip({ content: "Ctrl+S" })] }
```

This means:
- CSS is predictable (you're styling a native `<button>`, not a wrapper)
- Accessibility is clean (one focusable element)
- No mystery `div > div > button > span` in DevTools

### 3. Built-in design system — not bolted on

React has no theming story. You reach for Tailwind, CSS modules, styled-components, MUI, or Chakra — and each has its own abstraction. A button's `padding` lives in a utility class, a CSS variable, or a JS-in-CSS runtime.

Domphy's theme system is native:

```ts
paddingBlock: (l) => themeSpacing(themeDensity(l) * 1),
backgroundColor: (l) => themeColor(l, "inherit", "primary"),
```

`themeColor`, `themeSpacing`, `themeSize`, `themeDensity` are functions that read the active theme. Dark mode, density, size scales — all flow through the same API. You write one button; it works in light mode, dark mode, compact mode, and large mode without any extra code.

### 4. AI generates it correctly — and knows when it doesn't

LLMs default to React because that's what most training data contains. But JSX is "special" syntax — it requires learning React's model before the LLM can generate correct code.

Plain objects are what LLMs produce *naturally*. There's no syntax barrier.

More importantly, Domphy ships `@domphy/doctor` — a static analyzer that inspects the element tree the LLM produces and flags mistakes:

```ts
import { validate } from "@domphy/doctor"

const report = validate(generatedApp)
// { ok: false, issues: [{ rule: "inline-typography", ... }], ... }
```

Feed the report back to the model and it self-corrects. The loop works because the doctor doesn't need to parse code — it inspects the runtime tree, which is just an object.

No other framework ships this kind of AI feedback loop out of the box.

### 5. A complete stack — ports of what you already know

Domphy doesn't reinvent the wheel. The data/logic layer is **1-1 TanStack ports**:

| What you need | Domphy equivalent |
|---|---|
| React Query | `@domphy/query` (port of `@tanstack/query-core`) |
| TanStack Table | `@domphy/table` (port of `@tanstack/table-core`) |
| TanStack Router | `@domphy/router` (port of `@tanstack/router-core`) |
| TanStack Virtual | `@domphy/virtual` (port of `@tanstack/virtual-core`) |
| TanStack Form | `@domphy/form` (port of `@tanstack/form-core`) |

The APIs are **byte-identical** to the TanStack originals. If you know TanStack Query, you know `@domphy/query`. The only difference is the adapter at the `/domphy` subpath.

## When to use Domphy

**Best fit:**

- **Plugin/extension apps** — SketchUp, Figma, VS Code webviews, browser extensions. You need reactivity and a design system; you don't need a 42 kB runtime and a JSX compiler.
- **AI-generated UIs / agent-driven dashboards** — Plain-object syntax + Doctor = reliable AI code generation at scale.
- **Tool apps and internal dashboards** — Forms, tables, filters, data grids. The patch model handles these well.
- **Design systems that need to work everywhere** — Patches are framework-independent; the theme system handles dark mode, density, and accessibility natively.

**React is still better for:**

- Apps with massive React ecosystems (hundreds of third-party components, React-specific libraries you can't replace)
- Teams where React is the hiring requirement
- Apps that already have years of React investment and aren't blocked on any of its limitations

## How Domphy compares to the alternatives

| | Domphy | React | Svelte | Solid | Vue |
|---|---|---|---|---|---|
| JSX / special syntax | ✗ none | ✓ JSX | ✓ `.svelte` | ✓ JSX | ✓ SFC |
| Virtual DOM | ✗ | ✓ | ✗ | ✗ | ✗ |
| Patch model (no wrappers) | ✓ | ✗ | ✗ | ✗ | ✗ |
| Built-in theme system | ✓ | ✗ | partial | ✗ | ✗ |
| AI self-correction loop | ✓ | ✗ | ✗ | ✗ | ✗ |
| TanStack-compatible data layer | ✓ | ✓ | partial | partial | partial |
| No build step (script tag) | ✓ | limited | ✗ | ✗ | ✓ |
| SSR / streaming | ✓ | ✓ | ✓ | ✓ | ✓ |
| Component-level code splitting | ✓ | ✓ | ✓ | ✓ | ✓ |

## Bundle size

At default configuration:

| | Hello World (gzip) | Full app overhead (gzip) |
|---|---|---|
| Domphy (`@domphy/core` + `@domphy/theme`) | ~15 kB | ~15 kB |
| Svelte | ~3 kB | ~3 kB |
| Solid | ~7 kB | ~7 kB |
| Vue | ~22 kB | ~22 kB |
| React + ReactDOM | ~42 kB | ~42 kB |

`@domphy/ui` adds ~22 kB (gzip) / ~88 kB (minified) when you import all patches; in practice, tree-shaking cuts this to only what you use. (The CDN global bundle — core+theme+ui combined — is ~40 kB gzip / ~143 kB minified.)

## Next steps

- [Quickstart](/docs/quickstart) — get running in 5 minutes
- [Coming from React](/docs/guide/from-react) — your React concepts translated
- [Building with AI](/docs/ai) — set up the self-correction loop
- [Core](/docs/core/) — the full syntax and reactivity reference
