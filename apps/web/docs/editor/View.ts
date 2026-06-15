import { type DomphyElement, type State, toState } from "@domphy/core";
import { ErrorOverlay } from "./ErrorOverlay";
import { Preview } from "./Preview";
import { Toolbar } from "./Toolbar";

// Draft consider include toolbar inside shadow dom
export function Container(
  code: State<string>,
  error: State<string>,
): DomphyElement<"div"> {
  const isDark = toState(false);
  const hasGrid = toState(true);
  const isFull = toState(false);
  return {
    div: [
      Toolbar({ isDark, isFull, hasGrid }),
      Preview(code, isDark, hasGrid, error),
      ErrorOverlay(error),
    ],

    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
    },
  };
}
