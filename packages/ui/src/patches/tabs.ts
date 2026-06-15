import {
  merge,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";

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
