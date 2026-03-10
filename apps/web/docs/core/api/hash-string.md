# hashString

Generates a deterministic hash string from a given input. The result always starts with a lowercase letter (`a`–`z`) and is safe to use as a CSS identifier.

```ts
import { hashString } from "@domphy/core"

hashString("hello")  // e.g. "b4a2f1c3"
hashString("hello")  // same input → always same output
```

## `hashString(str?)`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `str` | `string` | `""` | Input string to hash |

Returns a `string` — hex hash prefixed with a letter `a`–`z`.

## Common use case — animation name from keyframes

The primary use case is generating a stable, unique animation name from a keyframe object so you never have to name animations manually.

```ts
import { hashString } from "@domphy/core"

const keyframes = { to: { transform: "rotate(360deg)" } }
const name = hashString(JSON.stringify(keyframes))

const style = {
    animation: `${name} 0.7s linear infinite`,
    [`@keyframes ${name}`]: keyframes,
}
```

Same keyframe object → same hash → same CSS rule. The browser deduplicates automatically.

## Notes

- Uses **FNV-1a 32-bit** — good distribution, low collision rate for short strings
- Output is always a valid CSS identifier (starts with a letter)
- Not suitable for cryptographic purposes

