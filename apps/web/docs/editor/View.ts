import { type DomphyElement, type State, toState } from "@domphy/core";
import { Console } from "./Console";
import { Editor } from "./Editor";
import { ErrorOverlay } from "./ErrorOverlay";
import { moduleMap } from "./Modules";
import { Preview } from "./Preview";
import { stringify } from "./stringify";
import { TipBar } from "./TipBar";
import { Toolbar } from "./Toolbar";
import { transformCode } from "./transformCode";

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
