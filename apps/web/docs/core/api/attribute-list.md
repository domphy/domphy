# AttributeList

Manages HTML attributes on an `ElementNode`. Accessed via `node.attributes`.

Attributes set via element definition are managed automatically. Use `AttributeList` directly when you need to read or mutate attributes imperatively inside lifecycle hooks.

## Methods

### `get(name)`

Returns the current value of an attribute.

```ts
node.attributes.get("class")     // "btn active"
node.attributes.get("disabled")  // true | undefined
```

---

### `set(name, value)`

Sets or updates an attribute value.

```ts
node.attributes.set("aria-expanded", "true")
node.attributes.set("tabindex", 0)
node.attributes.set("disabled", true)
```

A name outside the ASCII XML `Name` production (`/^[:A-Za-z_][-.:\w]*$/` — so anything containing a space, quote, `=`, `>`, `/` or a control character) is **ignored**, with a DEV-mode warning. `setAttribute()` throws on such a name in the browser, and serializing it would break out of the attribute in SSR output, so both render paths drop it instead. This matters when spreading an object of untrusted keys onto an element. Every HTML / SVG / ARIA / `data-*` attribute name passes; non-ASCII names, which the DOM does accept, are not supported.

---

### `has(name)`

Returns `true` if the attribute exists.

```ts
node.attributes.has("disabled")  // boolean
```

---

### `remove(name)`

Removes an attribute from the element.

```ts
node.attributes.remove("disabled")
```

---

### `toggle(name, force?)`

Toggles a boolean attribute (`disabled`, `hidden`, `checked`, etc.).

```ts
node.attributes.toggle("disabled")         // flip
node.attributes.toggle("disabled", true)   // force on
node.attributes.toggle("disabled", false)  // force off
```

---

### `addListener(name, callback)`

Subscribes to changes on a specific attribute after the node is mounted and the attribute already exists. The listener auto-releases when the node is removed.

```ts
node.attributes.addListener("aria-expanded", (value) => {
    console.log("expanded:", value)
})
```

If you need to observe a value immediately, set the attribute first, then subscribe inside `_onMount` or another mounted lifecycle hook.

---

### `addClass(className)`

Adds a class to the element's class list.

```ts
node.attributes.addClass("active")
```

---

### `removeClass(className)`

Removes a class from the element's class list.

```ts
node.attributes.removeClass("active")
```

---

### `hasClass(className)`

Returns `true` if the class exists in the element's class list.

```ts
node.attributes.hasClass("active")      // boolean
```

---

### `toggleClass(className)`

Toggles a class in the element's class list.

```ts
node.attributes.toggleClass("active")
```

---

### `replaceClass(oldClass, newClass)`

Replaces an existing class with a new one.

```ts
node.attributes.replaceClass("old", "new")
```

