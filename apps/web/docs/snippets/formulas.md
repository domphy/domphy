**Unit** - `U = fontSize / 4` - convert final values with `themeSpacing(n)`.

**Size** - `n` = intrinsic text lines, `w` = wrapping level, `d` = density factor:

```txt
height        = (n * 6 + 2 * d * w) * U
paddingBlock  = d * w * U
paddingInline = ceil(3 / w) * d * w * U
radius        = d * w * U
```

Base density `d = 1.5`:

| U | w=0 | w=1 | w=2 | w=3 |
| --- | --- | --- | --- | --- |
| height (`n = 1`) | 6 | 9 | 12 | 15 |
| paddingBlock | 0 | 1.5 | 3 | 4.5 |
| paddingInline | 3 | 4.5 | 6 | 4.5 |
| radius | 0 | 1.5 | 3 | 4.5 |

**Tone** - `K = N / 2` where `N` is the palette length. For `N = 18`, `K = 9`.

| Role | Shift | n=0 |
| --- | --- | --- |
| Background | parent +/- n | 0 |
| Text | bg + K | 6 |
| Border | bg + K/2 | 3 |
| Hover | bg + 2K/3 | 4 |
| Selected / Focus | above +/- K/3 | 2-4 |

State shift range: `K/3 <= delta <= 2K/3`.
