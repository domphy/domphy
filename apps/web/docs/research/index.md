# Research

Domphy is built on two quantitative models. Each model is published as an independent paper with open-source implementation and industry benchmarks.

## Paper 1 — A Quantitative Framework for Evaluating Sequential Color Palette Quality in Design Systems

**Axis:** Color (chromatic structure)

A quantitative framework for evaluating sequential monochromatic color palettes. Defines five evaluation metrics — contrast efficiency, lightness linearity, chroma smoothness, hue stability, and spacing uniformity — and benchmarks eleven industry design systems with composite scores ranging from 57 to 89.

The contrast span `K` derived in this paper is the foundation of Domphy's tone system: an 18-step ramp with `K = 9` guarantees WCAG 4.5:1 contrast between any two colors separated by at least 9 steps, enabling the three-zone semantic mapping used throughout `@domphy/theme`.

- Paper: [chromametry/paper/paper.pdf](https://github.com/chromametry/chromametry/blob/main/paper/paper.pdf)
- Repo: [github.com/chromametry/chromametry](https://github.com/chromametry/chromametry)
- Integration: [`@domphy/theme` tone system](/docs/theme/tone)

## Paper 2 — A Unified Sizing Model for User Interfaces

**Axis:** Space (spatial structure)

A unified sizing model that derives all element geometry — height, padding, and border radius — from three variables and one base unit:

```
U = fontSize / 4
h = (n · 6 + 2 · d · w) · U
```

Where `n` = text lines, `w` = wrapping level (0–3), `d` = density factor. The model is validated by a coverage proof over 69 production patches (100% match, 0 exceptions) and an industry benchmark showing that 8 of 10 major design systems converge on the same heights the formula produces.

- Paper: [domphy/paper/paper.pdf](https://github.com/domphy/domphy/blob/main/paper/paper.pdf)
- Integration: [`@domphy/theme` size system](/docs/theme/size), [`@domphy/ui` dimension](/docs/ui/dimension)

## How They Fit Together

The two papers address the two primary perceptual dimensions of UI design:

| | Chromametry (Paper 1) | Sizing (Paper 2) |
| --- | --- | --- |
| **Governs** | Surface color, text contrast, interaction feedback | Height, padding, radius, spacing |
| **Variables** | Tone ramp, contrast span K | n, w, d, U |
| **Propagation** | `dataTone` | `dataSize`, `dataDensity` |
| **Package** | `@domphy/theme` | `@domphy/theme` + `@domphy/ui` |

The two axes are algebraically independent — no sizing formula references a tone variable, and no tone formula references a spatial variable. They share the same context inheritance mechanism but operate on different data attributes.

An element's full visual specification reduces to:

| Variable | Axis | Source |
| --- | --- | --- |
| n | Sizing | Intrinsic (patch type) |
| w | Sizing | Intrinsic (patch type) |
| d | Sizing | Inherited (`dataDensity`) |
| U | Sizing | Inherited (`dataSize` → fontSize) |
| T | Tone | Inherited (`dataTone`) |

Two intrinsic constants, three inherited context values. No per-element overrides, no magic numbers, no token tables.
