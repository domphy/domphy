import { PartialElement, Listener } from "@domphy/core";
import { FieldValidator } from "../classes/FieldState.js";
import { FormState } from "../classes/FormState.js";

function field(path: string, validator?: FieldValidator): PartialElement {
  return {
    _onInsert: (node) => {
      const state = node.getContext("form") as FormState;
      const f = state.setField(path, undefined, validator);
      const tag = node.tagName;
      const type = node.attributes.get("type") as string | undefined;

      if (!["input", "select", "textarea"].includes(tag)) {
        console.warn(`"field" patch must use input, select, or textarea tag`);
      }

      const part: PartialElement<"input"> = {
        onBlur: () => f.setTouched(),
        ariaInvalid: (listener: Listener) => !!f.message("error", listener) || undefined,
        dataStatus: (listener: Listener) => f.status(listener),
      };

      if (tag === "input" && type === "checkbox") {
        part.checked = f.value() as boolean;
        part.onChange = (e) => f.setValue((e.target as HTMLInputElement).checked);
      } else if (tag === "input" && type === "radio") {
        part.onChange = (e) => f.setValue((e.target as HTMLInputElement).value);
      } else if (tag === "select") {
        part.value = f.value() as string;
        part.onChange = (e) => f.setValue((e.target as HTMLSelectElement).value);
      } else if (tag === "textarea") {
        part.value = f.value() as string;
        part.onInput = (e) => f.setValue((e.target as HTMLTextAreaElement).value);
      } else {
        part.value = f.value() as string;
        part.onInput = (e) => f.setValue((e.target as HTMLInputElement).value);
      }

      node.merge(part);

      // NOTE: value/checked are intentionally set as static defaults (one-way: DOM → state).
      // Do NOT change them to reactive functions like `(listener) => f.value(listener)`.
      // Two-way reactive binding causes an infinite loop:
      //   setValue → notify listener → update DOM value → trigger onInput → setValue → ...
      // Note: Domphy's `silent` flag in setValue is NOT a solution here —
      // it is only used for tree synchronization when external libs (e.g. SortableJS)
      // manipulate the DOM directly. It does not apply to form field binding.
    },
  };
}

export { field };
