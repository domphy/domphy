# Domphy — AI Coding Guide

## Project Structure

Monorepo (pnpm workspaces):
- `packages/core` — `@domphy/core`
- `packages/theme` — `@domphy/theme`
- `packages/ui` — `@domphy/ui` (patches in `src/patches/`)
- `apps/docs` — VitePress docs + demos

---

## Patch Pattern

A patch is a **factory function** returning `PartialElement`, applied via `$: [patch()]`.

```ts
function button(props: { color?: ThemeColor } = {}): PartialElement {
  const { color = "primary" } = props;
  return { ... };
}

export { button }; // named export only, no default
```

- File: `lowerCamelCase.ts` in `packages/ui/src/patches/`
- Always `= {}` as default even with no props
- No standalone helper functions — only the patch function
- Register new patches in `packages/ui/src/patches.ts`
- When a patch changes, update its demo too

---

## Hooks

- `_onInsert` — validate `node.tagName`, warn if wrong tag
- `_onMount` — safe to access `domElement`
- `_onBeforeRemove(node, done)` — MUST call `done()` or node leaks

---

## Events

`onClick`, `onKeyDown`, `onTransitionEnd`... — camelCase, no underscore.

`node.addEvent()` called after mount does **not** attach to DOM (only updates internal map). Use `node.domElement!.addEventListener()` directly instead.

---

## Reactivity

Always pass `listener` in reactive style functions:
```ts
color: (listener) => themeColor(listener, "shift-6", color),
opacity: (listener) => Number(state.get(listener)),
```

---

## Enter/Exit Animation Pattern

```ts
const state = toState(false);

return {
  style: {
    opacity: (listener) => Number(state.get(listener)),
    transform: (listener) => state.get(listener) ? "translateY(0)" : "translateY(-100%)",
    transition: "opacity 300ms ease, transform 300ms ease",
  },
  // requestAnimationFrame required — browser must paint opacity:0 before transitioning
  _onMount: () => requestAnimationFrame(() => state.set(true)),
  _onBeforeRemove: (node, done) => {
    const onEnd = (e: Event) => {
      if ((e as TransitionEvent).propertyName === "transform") {
        node.domElement!.removeEventListener("transitionend", onEnd);
        done();
      }
    };
    node.domElement!.addEventListener("transitionend", onEnd);
    state.set(false);
  },
};
```

Never use `{ once: true }` when filtering by `propertyName` — listener is removed on the first event (e.g. `opacity`) before `transform` fires.

---

## CSS Animations

Use `hashString` for animation names, cast with `as StyleObject`:

```ts
const keyframes = { to: { transform: "rotate(360deg)" } };
const animationName = hashString(JSON.stringify(keyframes));

style: {
  animation: `${animationName} 0.7s linear infinite`,
  [`@keyframes ${animationName}`]: keyframes,
} as StyleObject,
```

---

## Docs & Demo Convention

Every patch needs:
- **Doc:** `apps/docs/ui/patches/patch-name.md`
- **Demo:** `apps/docs/demos/patches/PatchName.ts` (PascalCase, `export default App`)

Follow the structure of `button.md` and `Button.ts` as the reference standard.

---

## What NOT to Do

- Don't use `{ once: true }` on `transitionend` when filtering by `propertyName`
- Don't call `node.addEvent()` after mount to attach DOM listeners
- Don't share a `PartialElement` object across multiple inserts if it closes over mutable state — each insert needs a fresh `patch()` call
- Don't use `node.remove()` inside `onTransitionEnd` to complete `_onBeforeRemove` — use `done()` instead
- Don't skip calling `done()` in `_onBeforeRemove` — the node will never be removed from ElementList
- Don't create helper functions inside patch files — only the patch function itself
- Don't write event listeners inside hooks unless the hook provides a required parameter. Use `onClick`, `onKeyDown`, etc. flat in the partial. Exception: `_onBeforeRemove` — writing a `transitionend` listener inside it is valid because `done()` is only available there
- Don't skip updating the demo when the patch API changes

---

## Key Files

| Purpose | Path |
|---|---|
| Core API docs (most important) | `apps/docs/core/` |
| `ElementNode` API | `apps/docs/core/api/element-node.md` |
| `ElementList` API | `apps/docs/core/api/element-list.md` |
| `State` API | `apps/docs/core/api/state.md` |
| Core types (`PartialElement`, `HookMap`, `StyleObject`...) | `packages/core/src/types.ts` |
| Register new patch | `packages/ui/src/patches.ts` |
| Reference patch | `packages/ui/src/patches/button.ts` |
| Reference doc | `apps/docs/ui/patches/button.md` |
| Reference demo | `apps/docs/demos/patches/Button.ts` |
