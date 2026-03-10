
# Size

These formulas converge with IBM Carbon, Adobe Spectrum, Material Design 3, and Apple HIG —
not by copying them, but because the formulas already existed implicitly in their outputs.
They were never formally recognized until derived from first principles. The reference paper for the full convergence analysis is not linked yet.

## Unit

All values derive from one unit: **`U = fontSize / 4`**

At standard `fontSize: 16px` → `U = 4px`. This is equivalent to the industry-standard 4-point grid system used across major design tools and systems. The difference: the 4pt grid is a fixed convention, while U scales with fontSize — making it a superset that works across all screen sizes and type scales without reconfiguration.

Use `themeSpacing(n)` from `@domphy/ui` to get the CSS variable em value.

## Perception Area

A **Perception Area** is any region the brain recognizes as a distinct visual entity — regardless of whether it has an explicit border or background. It is perceived through one or more of the following signals:

- **Typography density** — a block of text creates a perceived region through content mass alone
- **Background surface** — a distinct fill separates the element from its surroundings
- **Border or outline** — an explicit visual edge defines the boundary

Every UI element that creates a Perception Area has a calculable height using the formula. This is the **scope of the sizing system**.

What lies outside this scope is the whitespace **between** Perception Areas — the layout spacing that separates regions from each other. That spacing is a design decision governed by typography proportion and visual rhythm, not by formula.

---

## Wrapping Level (w)

`w` is not chosen arbitrarily — it is **derived from the element's minimum content lines `n` and its structural role**:

```
w = 0    inline — no boundary, no padding (text, icon)
w = 1    n = 1  — single-line bounded element (button, input)
w = 2    n > 1  — multi-line bounded element (textarea, blockquote, form)
w = 3    structural section — full-screen or page-level container (dialog, drawer, fieldset)
```

This means `paddingBlock = w × U` is fully determined once you know how many lines the element holds and whether it is a page-level structure. No arbitrary choice is needed.

| w   | Rule                  | Example                          |
| --- | --------------------- | -------------------------------- |
| 0   | inline / no boundary  | text, icon, span                 |
| 1   | n = 1, bounded        | button, input, select, tooltip   |
| 2   | n > 1, bounded        | textarea, blockquote, form, card |
| 3   | structural section    | dialog, drawer, fieldset         |

## Boundary Classification

Every element belongs to one of two classes defined by a single predicate:

> **`isBoundary(p) = 1`** if the element has a visual boundary — background, border, or shadow that separates it from surrounding content.
> **`isBoundary(p) = 0`** otherwise.

When `isBoundary = 0`, the wrapping level `w` is gated to zero — the element contributes no outer padding. Height is entirely the sum of its children. Padding lives inside the children, not the container.

This is the partition `P = B ∪ U` (bounded ∪ unbounded), and it determines which form of the height formula applies.

## Dimensions

`n` = number of text lines. The height formula is **recursive**:

```
H(p) = n×6 × U  +  2×w×isBoundary × U  +  Σ H(childᵢ)
paddingBlock  = w × isBoundary × U
paddingInline = ⌈3/w⌉ × w × U          (w ≥ 1;  w=0 → 2U if isBoundary=1, else 0)
radius        = (w+1) × U
```

For atomic elements `Σ H(childᵢ) = 0`. The original formula `(n×6 + 2w) × U` is the special case where `isBoundary = 1` and no children — valid for all single bounded elements where `n` is fixed (button, input, tag...).

For Perception Areas where `n = 1` (fixed), height is fully deterministic. For Perception Areas where `n` depends on content (paragraph, textarea, blockquote), the formula determines `paddingBlock` and `radius` — height follows the formula structure but requires knowing `n`.

```typescript
// button — w=1, n=1
const actionButton = {
    button: "Buy",
    dataSize: "increase-1", // shifts font size up 1 level via context — children read this automatically
    style: {
        fontSize: (listener) => themeSize(listener, "inherit"),
        paddingBlock: themeSpacing(1),   // w=1 → 1U
        paddingInline: themeSpacing(3),  // w=1 → 3U
        borderRadius: themeSpacing(2),   // w=1 → 2U
        // height is not set — it auto fits because paddingBlock + lineHeight = (1+6+1)U = 8U
    }
}

// icon — w=0, n=1, H(1,0) = 6U
const icon = {
    span: "...",
    style: {
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "middle",
        width: themeSpacing(6),   // H(1,0) = 6U = lineHeight
        height: themeSpacing(6),  // square — width = height
    }
}
```

Reference in U — use these numbers directly in `themeSpacing(n)`:

| Level         | w0  | w1  | w2  | w3  |
| ------------- | --- | --- | --- | --- |
| height (n=1)  | 6U  | 8U  | 10U | 12U |
| paddingBlock  | 0   | 1U  | 2U  | 3U  |
| paddingInline | 2U* | 3U  | 4U  | 3U  |
| radius        | 1U  | 2U  | 3U  | 4U  |

At `fontSize: 16px` (U = 4px):

| Level         | w0   | w1   | w2   | w3   |
| ------------- | ---- | ---- | ---- | ---- |
| height (n=1)  | 24px | 32px | 40px | 48px |
| paddingBlock  | 0    | 4px  | 8px  | 12px |
| paddingInline | 8px* | 12px | 16px | 12px |
| radius        | 4px  | 8px  | 12px | 16px |

\* w=0 `paddingInline` applies only to inline elements with a visual background (Badge, Tag, Code, etc.) — it widens the element horizontally but does not affect height. For pure inline elements without a background (text, icon), `paddingInline = 0`.

## Sub-baseline Scale

6U is the **baseline** — height of one body text line, the most visually dominant unit in any layout. Elements intentionally sized below this baseline follow a proportional sub-scale:

```
Sub-scale = { 2U, 4U, 6U }   (ratio 1:2:3)
```

Sub-baseline elements (Progress at 2U, Input Range at 4U) are accent/indicator elements whose smaller size is a deliberate visual signal — they do not compete with text. Their visual indicator lives inside a 6U hit area (for Checkbox, Radio, Switch) or is a genuinely shorter element (Progress, Range) that requires manual vertical alignment when placed inline.

## Local Scale

Use `themeSize(listener, key)` from `@domphy/ui` where `listener` is the reactive function param of Domphy.

Valid keys: `"decrease-2"` / `"decrease-1"` / `"inherit"` / `"increase-1"` / `"increase-2"` — max ±2 shift from current level.

```typescript
fontSize: (listener) => themeSize(listener, "inherit")    // current level
fontSize: (listener) => themeSize(listener, "increase-1") // one level up
fontSize: (listener) => themeSize(listener, "decrease-1") // one level down
```

Font scale (approximate ratio ~1.25):

| em  | 0.75rem | 0.875rem | 1rem | 1.25rem | 1.5625rem | 1.9375rem | 2.4375rem | 3.0625rem |
| --- | ------- | -------- | ---- | ------- | --------- | --------- | --------- | --------- |
| px  | 12      | 14       | 16   | 20      | 25        | 31        | 39        | 49        |

`sm/md/lg` are theme config values that shift which 6 levels are active:

|        | 12      | 14      | 16      | 20     | 25     | 31      | 39      | 49      |
| ------ | ------- | ------- | ------- | ------ | ------ | ------- | ------- | ------- |
| **sm** | **[12** | **14**  | **16**  | **20** | **25** | **31]** | 39      | 49      |
| **md** | 12      | **[14** | **16**  | **20** | **25** | **31**  | **39]** | 49      |
| **lg** | 12      | 14      | **[16** | **20** | **25** | **31**  | **39**  | **49]** |

## Context Size

`dataSize` propagates down the DOM tree via Domphy's context system. Any descendant calling `themeSize(listener, "inherit")` receives the correct font size automatically — no prop drilling needed.

```typescript
// parent sets context
{ div: [...], dataSize: "increase-1" }

// child reads automatically — no extra config
{ span: "text", style: { fontSize: (l) => themeSize(l, "inherit") } }
```

## Global Scale

To change size at breakpoints, just change the root `fontSize` — all dimensions scale automatically.

```css
@media (max-width: 768px) {
    :root { font-size: 14px; }
}
```

## Recommendation

**Use `outline` or `box-shadow` instead of `border`.**

Because all dimensions are precisely derived, a 1px border shifts the actual rendered size outside the formula — and at this scale, the error is significant. At `w=1`, `H(1,1) = 8U = 32px`. A 1px border on each side adds 2px total, which is a **6.25% height deviation** — equivalent to half a unit. This breaks alignment with adjacent elements that share the same wrapping level.

```typescript
// ❌ border shifts rendered height outside formula
border: "1px solid ..."

// ✅ outline sits outside the box model — no dimension shift
outline: "1px solid ..."
outlineOffset: "-1px" // inset to stay within bounds

// ✅ box-shadow also outside box model
boxShadow: "inset 0 0 0 1px ..."
```

This applies to all `w` levels. The smaller the element, the larger the relative error — `w=0` inline elements at `6U = 24px` would suffer a **8.3% deviation** from a 1px border.

**`gap` and `margin` should be ≥ the corresponding `padding`.**

For horizontal spacing: `gap` or `margin-inline` ≥ `paddingInline` of the element.
For vertical spacing: `gap` or `margin-block` ≥ `paddingBlock` of the element.

This ensures visual separation between elements is at least as large as the internal breathing room — preventing elements from feeling crowded against each other.

```typescript
// ✅ gap between controls (w=1) — horizontal
gap: themeSpacing(3)  // ≥ paddingInline(1) = 3U

// ✅ gap between cards (w=2) — vertical
gap: themeSpacing(2)  // ≥ paddingBlock(2) = 2U
```

**Layout-level whitespace is outside the scope of this formula.**

Large spacing between sections or around page regions is a design decision, not a derived value. It depends on typography density and the visual proportion of whitespace to content — a ratio that varies per design intent and cannot be precisely determined by formula. Use design judgment for these values.

---

UI sizing has two unsolved problems: deciding what values to use, and keeping them consistent across breakpoints and component variants. Token-based systems solve neither — they replace decisions with memorization, and scaling requires per-component overrides.

This system solves both. `paddingBlock`, `paddingInline`, and `radius` are fully determined for every bounded element by `(w, isBoundary)` derived from `(n, structural)` and one root value `fontSize`. Change `fontSize` and everything scales with no component touched.

**Precise scope of the formula:**

| Element class | Height | paddingBlock / radius |
| --- | --- | --- |
| Perception Area (`n = 1`, bounded) | ✓ fully determined | ✓ |
| Variable-content bounded (`n > 1`) | ✗ content-dependent | ✓ |
| Content containers (`isBoundary = 0`) | ✗ sum of children | ✓ on children |
| Layout regions (overlay/structural) | ✗ content + viewport | ✓ paddingBlock only |
| Separators | ✗ always 1px | — |
| Behavior (no visual) | — | — |

Width is intentionally outside the formula — element width follows content and typography. Layout-level whitespace (margins between regions) is a design decision depending on typography density and cannot be derived. These are not gaps: they are correct domain boundaries.

