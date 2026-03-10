import { PartialElement, merge } from "@domphy/core";
import { FormState } from "../classes/FormState.js";

function form(state: FormState): PartialElement {
  return {
    _onSchedule: (node, element) => {
      merge(element, { _context: { form: state } });
    },
  };
}

export { form };
