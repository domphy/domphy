import {
  type DomphyElement,
  type Listener,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/** One item inside a toggle group. */
type ToggleItem = {
  /** Button label — plain string (auto-wrapped) or any DomphyElement. */
  label: string | DomphyElement;
  /** Stable key. Defaults to the item's zero-based index as a string. */
  key?: string;
};

/**
 * All-in-one toggle group — single or multi-select button group. Generates
 * `<button>` toggle elements from the `items` array. Apply to any wrapper element.
 *
 * @param props.items - Item definitions `{ label, key? }`.
 * @param props.value - Selected key(s) (value or State). Defaults to `[]` (multiple) or `""` (single).
 * @param props.multiple - Allow multiple items selected at once. Defaults to `false`.
 * @param props.color - Theme color for the group background/border. Defaults to `"neutral"`.
 * @param props.accentColor - Theme color for the pressed state. Defaults to `"primary"`.
 * @example
 * { div: null, $: [toggleGroup({ multiple: true, items: [
 *   { label: "Bold",   key: "bold"   },
 *   { label: "Italic", key: "italic" },
 * ] })] }
 */
function toggleGroup(
  props: {
    items: ToggleItem[];
    value?: ValueOrState<string | string[]>;
    multiple?: boolean;
    color?: ThemeColor;
    accentColor?: ThemeColor;
  } = { items: [] },
): PartialElement {
  const { items = [], multiple = false, color = "neutral", accentColor = "primary" } =
    props;
  const value = toState(props.value ?? (multiple ? [] : ""));

  return {
    role: "group",
    // Expose value + multiple in context so toggle() escape-hatch still works.
    _context: { toggleGroup: { value, multiple } },
    _onSchedule: (node, element) => {
      const buttons: DomphyElement<"button">[] = items.map((item, index) => {
        const key = item.key ?? String(index);
        const labelEl: DomphyElement =
          typeof item.label === "string"
            ? ({ span: item.label } as DomphyElement<"span">)
            : item.label;

        return {
          button: [labelEl],
          _key: key,
          type: "button",
          role: "button",
          ariaPressed: (l: Listener) => {
            const val = value.get(l);
            return Array.isArray(val) ? val.includes(key) : val === key;
          },
          onClick: () => {
            const val = value.get();
            if (multiple) {
              const arr = Array.isArray(val) ? [...val] : [];
              value.set(
                arr.includes(key)
                  ? arr.filter((v) => v !== key)
                  : [...arr, key],
              );
            } else {
              value.set(val === key ? "" : key);
            }
          },
          style: {
            cursor: "pointer",
            fontSize: (l: Listener) => themeSize(l, "inherit"),
            height: themeSpacing(6),
            paddingBlock: themeSpacing(1),
            paddingInline: themeSpacing(2),
            border: "none",
            borderRadius: themeSpacing(1),
            color: (l: Listener) => themeColor(l, "shift-9", color),
            backgroundColor: (l: Listener) => themeColor(l, "inherit", color),
            transition: "background-color 300ms ease",
            "&:hover:not([disabled])": {
              backgroundColor: (l: Listener) => themeColor(l, "shift-2", color),
            },
            "&[aria-pressed=true]": {
              backgroundColor: (l: Listener) =>
                themeColor(l, "shift-3", accentColor),
              color: (l: Listener) => themeColor(l, "shift-12", accentColor),
            },
            "&:focus-visible": {
              outline: (l: Listener) =>
                `${themeSpacing(0.5)} solid ${themeColor(l, "shift-6", accentColor)}`,
              outlineOffset: `-${themeSpacing(0.5)}`,
            },
            "&[disabled]": {
              opacity: 0.7,
              cursor: "not-allowed",
            },
          },
        } as DomphyElement<"button">;
      });

      (element as any)[node.tagName] = buttons;
    },
    style: {
      display: "flex",
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(1),
      gap: themeSpacing(1),
      borderRadius: themeSpacing(2),
      fontSize: (l: Listener) => themeSize(l, "inherit"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", color),
      outline: (l: Listener) => `1px solid ${themeColor(l, "shift-3", color)}`,
      outlineOffset: "-1px",
    },
  };
}

export { toggleGroup };
export type { ToggleItem };
