import {
  merge,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";

/**
 * Container patch that establishes a `tabs` context (with a shared `activeKey`
 * state) and the `tablist` role for child `tab`/`tabPanel` patches. No host tag
 * check; typically applied to a wrapper element.
 *
 * @param props.activeKey - Initially active tab key. Optional, accepts a value or state of `number | string`. Defaults to `0`.
 * @example { div: null, $: [tabs({ activeKey: 0 })] }
 */
function tabs(
  props: { activeKey?: ValueOrState<number | string> } = {},
): PartialElement {
  const partial: PartialElement = {
    role: "tablist",
    _onSchedule: (node, element) => {
      const partial = {
        _context: {
          tabs: {
            activeKey: toState(props.activeKey || 0),
          },
        },
      };
      merge(element, partial);
    },
  };
  return partial;
}

export { tabs };
