import { PartialElement, merge } from "@domphy/core";
import { toState, ValueOrState } from "@domphy/core";

function tabs(props: {
  activeKey?: ValueOrState<number | string>;
} = {}): PartialElement {

  let partial: PartialElement = {
    role: "tablist",
    _onSchedule: (node, element) => {
      let partial = {
        _context: {
          tabs: {
            activeKey: toState(props.activeKey || 0),
            path: node.key
          }
        },
      }
      merge(element, partial)
    },
  }
  return partial;
}

export { tabs };
