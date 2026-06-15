import { type DomphyElement, toState } from "@domphy/core";
import { Console } from "./Console";
import { Editor } from "./Editor";
import { ErrorOverlay } from "./ErrorOverlay";
import { moduleMap } from "./Modules";
import { Preview } from "./Preview";
import { stringify } from "./stringify";
import { TipBar } from "./TipBar";
import { Toolbar } from "./Toolbar";
import { transformCode } from "./transformCode";

export function Container(
  initialCode: string,
  shadowHost: HTMLElement,
  previewContainer: HTMLElement,
  storageKey?: string,
): DomphyElement<"div"> {
  const savedCode = storageKey
    ? (localStorage.getItem(storageKey) ?? initialCode)
    : initialCode;
  const code = toState(savedCode);
  const error = toState("");
  const logs = toState<string[]>([]);
  const copied = toState(false);
  const isDark = toState(false);
  const isFull = toState(false);
  const hasGrid = toState(false);

  const update = (val: string) => {
    error.set("");
    logs.set([]);

    const originalLog = console.log;
    console.log = (...args) => {
      logs.set([...logs.get(), args.map((a) => stringify(a)).join(" ")]);
      originalLog(...args);
    };

    try {
      const fn = new Function("__modules__", transformCode(val));
      const el = fn(moduleMap);
      if (!el) throw new Error("Code must have export default");
    } catch (e: any) {
      error.set(e.message);
    } finally {
      console.log = originalLog;
    }
  };

  update(savedCode);
  code.addListener((val) => {
    if (storageKey) localStorage.setItem(storageKey, val);
    update(val);
  });

  const workspace: DomphyElement<"div"> = {
    div: [
      {
        div: [
          Editor(code),
          {
            div: [
              Toolbar({ isDark, isFull, hasGrid }),
              Preview(
                code,
                isDark,
                hasGrid,
                error,
                shadowHost,
                previewContainer,
              ),
              ErrorOverlay(error),
            ],

            style: {
              position: "relative",
              display: "flex",
              flexDirection: "column",
            },
          },
        ],
        // Layout (incl. the mobile 2-row stack) is in the docs theme stylesheet
        // via this class — a global stylesheet's @media is reliable, whereas an
        // @media inside a Domphy inline style object is not emitted on client render.
        class: "dp-editor-grid",
        style: {
          display: "grid",
          flex: 1,
          minHeight: 0,
        },
      },
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      border: "1px solid var(--vp-c-divider)",
      overflow: "hidden",
      position: (listener) => (isFull.get(listener) ? "fixed" : "relative"),
      inset: 0,
      height: (listener) => (isFull.get(listener) ? "100vh" : "600px"),
      zIndex: 10,
      backgroundColor: `var(--vp-c-bg)`,
    },
  };
  return {
    div: [workspace, TipBar, Console(logs, copied)],
    style: {
      display: "flex",
      flexDirection: "column",
    },
  };
}
