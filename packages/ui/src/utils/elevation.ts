/** Named elevation levels for floating/raised surfaces. */
type ElevationLevel = "low" | "medium" | "high";

// Layered soft shadows (a tight contact shadow + a broad ambient one), black at
// low alpha so the same value reads correctly on both light and dark surfaces
// without a theme/context lookup.
const SHADOWS: Record<ElevationLevel, string> = {
  low: "0 1px 2px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.10)",
  medium: "0 2px 4px rgba(0,0,0,0.10), 0 10px 24px rgba(0,0,0,0.14)",
  high: "0 6px 12px rgba(0,0,0,0.14), 0 24px 48px rgba(0,0,0,0.20)",
};

/**
 * Shared box-shadow value for a named elevation level. Used by floating/raised
 * surface patches (popover, menu, dialog, drawer, toast, tooltip, combobox/
 * selectBox dropdown, datePicker popup, fab) so elevation reads consistently
 * across the library instead of each patch picking its own shadow.
 */
function elevation(level: ElevationLevel): string {
  return SHADOWS[level];
}

export { elevation };
export type { ElevationLevel };
