---
title: "Accessibility & Contrast"
description: "Reading WCAG and APCA contrast data from Ramp and Palette — spans, safe step pairs, and CI gating."
---

# Accessibility & Contrast

Every `Ramp` automatically computes WCAG and APCA contrast tables across its steps. Rather than checking a single pair, the analysis answers: **given any two swatches in this ramp, how far apart do they need to be to guarantee an accessibility target?** This span-based approach lets you generate safe text/background combinations without checking every pair manually.

## Types

```ts
import type { ContrastValue, WcagContrasts, ApcaContrasts } from "@domphy/palette"

type ContrastValue = {
  target:     number  // contrast target: ratio for WCAG, Lc value for APCA
  span:       number  // minimum step gap that guarantees the target for all pairs
  value:      number  // worst-case contrast achieved at that span
  efficiency: number  // span / (steps - 1) — raw normalized span, lower = better
}

// keys are the contrast level × 10 for WCAG (3:1, 4.5:1, 7:1)
type WcagContrasts = Record<30 | 45 | 70, ContrastValue>

// keys are the Lc target for APCA (45, 60, 75)
type ApcaContrasts = Record<45 | 60 | 75, ContrastValue>
```

## WCAG contrast

### Levels

| Key | Contrast target | Standard use case |
| --- | --- | --- |
| `30` | 3:1 | Large text (≥18pt or ≥14pt bold), UI components, focus indicators |
| `45` | 4.5:1 | Normal body text — WCAG 2 AA |
| `70` | 7:1 | Small text — WCAG 2 AAA |

```ts
import { Ramp } from "@domphy/palette"

const ramp = new Ramp(blueHexes, "blue")

const aa  = ramp.wcag[45]
const aaa = ramp.wcag[70]

aa.target      // 4.5
aa.span        // e.g. 5 — every pair 5+ steps apart clears 4.5:1
aa.value       // e.g. 4.72 — worst-case ratio among those pairs
aa.efficiency  // 5 / 17 = 0.294 (for an 18-step ramp)
```

### Understanding `span`

`span` is the **minimum index gap** such that *every* pair of swatches that far apart meets the target. For a ramp with `span = 5`:

- Any two swatches 5 or more steps apart: contrast is guaranteed.
- Pairs closer than 5 steps may or may not contrast — some will, some won't.

Lower `span` is better: the ramp reaches accessible contrast with fewer steps of separation, leaving more of the scale usable.

```ts
const aa = ramp.wcag[45]

if (aa.span === 1) {
  // Every adjacent pair already clears AA — exceptional density
} else {
  console.log(`Need ${aa.span} steps of separation for WCAG AA body text`)
}
```

### Selecting safe text/background pairs

Use `span` to enumerate all guaranteed-safe pairs:

```ts
const { span } = ramp.wcag[45]

for (let i = 0; i <= ramp.steps - 1 - span; i++) {
  const background = ramp.colors[i]       // lighter swatch
  const text       = ramp.colors[i + span] // darker swatch
  console.log(`bg ${background}  text ${text}`)
}
// bg #ffffff    text #3b82f6
// bg #dce8fd   text #2f6bd4
// …
```

For production use you typically fix one end (e.g. always a white or near-white background) and find the darkest swatch that still keeps the gap under your target:

```ts
function safeTextOnWhite(ramp: Ramp): string | null {
  const span = ramp.wcag[45].span
  // index 0 is the lightest step; find the lightest text color at ≥ span away
  const textIndex = span
  return textIndex < ramp.steps ? ramp.colors[textIndex] : null
}
```

### Checking AAA

```ts
const aaa = ramp.wcag[70]

if (aaa.value >= 7) {
  console.log("Ramp achieves WCAG AAA")
} else {
  console.log(`AAA gap: ${(7 - aaa.value).toFixed(2)} — only reached AAA at the extreme ends`)
}
```

## APCA contrast

APCA (Advanced Perceptual Contrast Algorithm) uses an asymmetric lightness model that distinguishes light-on-dark from dark-on-light. `ramp.apca` gives unsigned Lc values (`Math.abs(Lc)`); the sign is absorbed into the span computation.

### Levels

| Key | Lc target | Approximate use case |
| --- | --- | --- |
| `45` | Lc 45 | Large UI elements, decorative text |
| `60` | Lc 60 | Body copy, medium-weight text |
| `75` | Lc 75 | Small text, fine print, captions |

```ts
const bodyCopy = ramp.apca[60]
bodyCopy.target      // 60
bodyCopy.span        // e.g. 6
bodyCopy.value       // e.g. 63.4 (worst-case |Lc| among pairs 6 apart)
bodyCopy.efficiency  // 6 / 17 ≈ 0.353
```

### Checking APCA body text readiness

```ts
const lc60 = ramp.apca[60]

if (lc60.value >= 60) {
  console.log(`APCA body-text cleared — min Lc ${lc60.value.toFixed(1)} at span ${lc60.span}`)
} else {
  console.log(`APCA Lc 60 not reached — max Lc ${lc60.value.toFixed(1)}`)
}
```

## Palette-level contrast

`Palette.wcag` and `Palette.apca` aggregate across all ramps:

- **`span`** — the **maximum** span across all ramps (the worst ramp)
- **`value`** — the **average** worst-case contrast across all ramps
- **`efficiency`** — `span / (steps - 1)` using the palette's shared step count

```ts
import { Palette } from "@domphy/palette"

const palette = new Palette({ blue, red, green, yellow })

// The ramp that needs the most steps to reach AA
console.log("Worst AA span:", palette.wcag[45].span)

// Average contrast ratio across all ramps at that span
console.log("Avg ratio:", palette.wcag[45].value.toFixed(2))

// Worst ramp for APCA body copy
console.log("Worst Lc60 span:", palette.apca[60].span)
```

## Per-ramp accessibility report

```ts
import { Palette, type Ramp } from "@domphy/palette"

function contrastReport(ramp: Ramp) {
  const aa   = ramp.wcag[45]
  const aaa  = ramp.wcag[70]
  const lc60 = ramp.apca[60]

  const aaGrade   = aa.span  <= Math.ceil(ramp.steps / 3) ? "pass" : "warn"
  const aaaGrade  = aaa.value >= 7 ? "pass" : "info"
  const apcaGrade = lc60.value >= 60 ? "pass" : "warn"

  console.log(`${ramp.name} (${ramp.steps} steps)`)
  console.log(`  WCAG AA   span=${aa.span},   ratio=${aa.value.toFixed(2)}  [${aaGrade}]`)
  console.log(`  WCAG AAA  span=${aaa.span}, ratio=${aaa.value.toFixed(2)}  [${aaaGrade}]`)
  console.log(`  APCA Lc60 span=${lc60.span}, Lc=${lc60.value.toFixed(1)}   [${apcaGrade}]`)
}

const palette = new Palette({ blue, red, green })
palette.ramps.forEach(contrastReport)
```

## CI accessibility gate

Combine quality score with contrast requirements in one check:

```ts
import { Palette } from "@domphy/palette"

const palette = new Palette({ blue, red, green, yellow }, "brand")
const issues: string[] = []

// Overall quality
if (palette.score < 85) {
  issues.push(`score ${palette.score.toFixed(1)} is below 85`)
}

// Per-ramp contrast
for (const ramp of palette.ramps) {
  const aa   = ramp.wcag[45]
  const lc60 = ramp.apca[60]

  // Fail if you need more than 40% of the ramp's range to guarantee AA
  const maxSpan = Math.floor(ramp.steps * 0.4)
  if (aa.span > maxSpan) {
    issues.push(`${ramp.name}: AA requires span ${aa.span}, budget is ${maxSpan}`)
  }

  // Fail if APCA body-copy target is not reached at all
  if (lc60.value < 60) {
    issues.push(`${ramp.name}: APCA Lc60 not reached (Lc ${lc60.value.toFixed(1)})`)
  }
}

if (issues.length > 0) {
  console.error("Palette failed accessibility checks:")
  issues.forEach(issue => console.error(" ·", issue))
  process.exit(1)
}
```

## Contrast efficiency: metric vs raw

Two different numbers share similar names; they are not the same:

```ts
ramp.contrastEfficiency      // 0–1 quality metric: 1 = excellent, 0 = poor
ramp.wcag[45].efficiency     // raw span / (steps - 1) — lower = better
```

The quality metric (`ramp.contrastEfficiency`) uses a penalized formula: any `wcag[45].span` below 50% of the ramp length scores full marks (1.0). The raw `efficiency` is a plain ratio. A ramp with `wcag[45].span = 5` on 18 steps has:

- `wcag[45].efficiency` = 5/17 ≈ 0.294 (29%)
- `contrastEfficiency` = 1.0 (5/17 is under the 50% threshold)

Use `ramp.score` and the quality metrics for design-system grading; use `wcag[*].span` and `apca[*].span` for concrete pairing decisions.
