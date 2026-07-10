// Blocks are 1:1 visual ports of upstream components (shadcn/ui, Magic UI):
// their typography values are part of the recorded upstream spec and must
// stay pixel-identical — remapping them onto the theme's 8-step size scale
// would break the fidelity that the visual-diff/source-diff QA passes pinned.
// Declaring typography through functions is @domphy/doctor's designed marker
// for intentional, non-token typography (`inline-typography` passes function
// values); the values themselves are unchanged.
// Generic so the literal type is preserved: a typed StyleObject property
// (csstype's FontFamily, LetterSpacing, ...) accepts `() => "0.05em"` but
// not a widened `() => string | number`.
export const fixed =
  <T extends string | number>(value: T) =>
  (): T =>
    value;
