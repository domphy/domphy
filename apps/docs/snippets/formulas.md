**Unit** — `U = fontSize / 4` — use `themeSpacing(n)`.

**Size** — `n` = lines or children, `w` = wrapping level (0–3):

```
height        = (n×6 + 2w) × U
paddingBlock  = w × U
paddingInline = ⌈3/w⌉ × w × U
radius        = (w+1) × U
```

| U             | w=0 | w=1 | w=2 | w=3 |
| ------------- | --- | --- | --- | --- |
| height (n=1)  | 6   | 8   | 10  | 12  |
| paddingBlock  | 0   | 1   | 2   | 3   |
| paddingInline | 2   | 3   | 4   | 3   |
| radius        | 1   | 2   | 3   | 4   |

**Tone** — `K = N / 2` (N = palette steps, must be even). For N=12: `K=6`, `K/2=3`, `K/3=2`.

| Role             | Shift         | n=0 |
| ---------------- | ------------- | --- |
| Background       | parent ± n    | 0   |
| Text             | bg + K        | 6   |
| Border           | bg + K/2      | 3   |
| Hover            | bg + 2K/3     | 4   |
| Selected / Focus | above ± K/3   | 2–4 |

State shift range: `K/3 ≤ Δ ≤ 2K/3` (2–4 steps for K=6).
