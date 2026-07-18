/**
 * The `fontSize` step for `button()`/`buttonGhost()`'s `size` prop. Padding stays
 * per-component (button and buttonGhost start from different base paddings) so
 * only the part that's genuinely identical — the font-size step — lives here.
 */
const BUTTON_SIZE_FONT = {
  small: "decrease-1",
  medium: "inherit",
  large: "increase-1",
} as const;

type ButtonSize = keyof typeof BUTTON_SIZE_FONT;

export { BUTTON_SIZE_FONT };
export type { ButtonSize };
