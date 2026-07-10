// Blocks are 1:1 visual ports of upstream components (shadcn/ui, Magic UI):
// their typography values are part of the recorded upstream spec and must
// stay pixel-identical — remapping them onto the theme's 8-step size scale
// would break the fidelity that the visual-diff/source-diff QA passes pinned.
// Declaring typography through functions is @domphy/doctor's designed marker
// for intentional, non-token typography (`inline-typography` passes function
// values); the values themselves are unchanged.
export const fixed = (value: string | number) => (): string | number => value;
