# StyleList

Manages scoped CSS rules for an `ElementNode`. Accessed via `node.styles`.

`StyleList` is internal — you do not need to call it directly. Write styles via the element's `style` key instead:

```ts
{
  div: "Hello",
  style: {
    color: "red",
    "&:hover": { color: "blue" },
    "@media (max-width: 768px)": { fontSize: "14px" },
  }
}
```

Domphy compiles this to scoped CSS and injects it into `<head>` automatically. The class name is unique per element definition.

## SSR

`node.styles.cssText()` is used internally by `node.generateCSS()` — no direct use needed.

```ts
const css = node.generateCSS()  // full scoped CSS for this node and descendants
```

