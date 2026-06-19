import type { DomphyElement, PartialElement } from "@domphy/core";
import { themeDensity, themeSpacing } from "@domphy/theme";

/**
 * A horizontal flex row with vertically centered items. Useful for headers,
 * toolbars, navigation bars, and action strips.
 *
 * @param props.gap - Spacing multiplier for gap between items (default 4 = 1em).
 * @example { header: [...], $: [toolbar()] }
 * @example { nav: [...], $: [toolbar({ gap: 3 })] }
 */
function toolbar(props: { gap?: number } = {}): PartialElement {
  const gap = props.gap ?? 4;
  return {
    style: {
      display: "flex",
      alignItems: "center",
      gap: (listener) => themeSpacing(themeDensity(listener) * gap),
    },
  };
}

/**
 * A flex spacer that expands to fill available space in a toolbar, pushing
 * subsequent items to the far end.
 *
 * @example { header: [logo, toolbarSpacer(), nav, actions], $: [toolbar()] }
 */
function toolbarSpacer(): DomphyElement {
  return { div: null, style: { flex: "1 1 0" } };
}

export { toolbar, toolbarSpacer };
