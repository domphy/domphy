import type { PartialElement, DomphyElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

const xSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6.707 5.293l5.293 5.292l5.293 -5.292a1 1 0 0 1 1.414 1.414l-5.292 5.293l5.292 5.293a1 1 0 0 1 -1.414 1.414l-5.293 -5.292l-5.293 5.292a1 1 0 1 1 -1.414 -1.414l5.292 -5.293l-5.292 -5.293a1 1 0 0 1 1.414 -1.414" /></svg>`

function tag(props: {
  color?: ThemeColor
  removable?: boolean
} = {}): PartialElement {
  const { color = "neutral", removable=false } = props;

  return {
    dataTone: "shift-2",
    _onInit: (node) => {

      const removeBtn: DomphyElement<"span"> = {
        span: xSvg,
        onClick: (e) => { (e as Event).stopPropagation(); node.remove() },
        style: {
          display: "inline-flex",
          alignItems: "center",
          cursor: "pointer",
          borderRadius: themeSpacing(1),
          width: themeSpacing(4),
          height: themeSpacing(4),
          flexShrink: 0,
          "&:hover": {
            backgroundColor: (listener) => themeColor(listener, "shift-4", color),
          }
        }
      }

      removable && node.children.insert(removeBtn)
      
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      whiteSpace: "nowrap",
      userSelect: "none",
      height: themeSpacing(6),
      paddingBlock: "0px",
      borderRadius: themeSpacing(1),
      paddingInlineStart: themeSpacing(2),
      paddingInlineEnd: removable ? themeSpacing(1) : themeSpacing(2),
      gap: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      color: (listener) => themeColor(listener, "shift-9", color),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color)}`,
    },
  };
}

export { tag };
