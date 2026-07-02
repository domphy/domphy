import { type DomphyElement, toState } from "@domphy/core";
import { themeColor } from "@domphy/theme";
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
  const activeTab = toState<"code" | "preview">("code");

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
      Toolbar({ activeTab, isDark, isFull, hasGrid }),
      {
        div: [
          {
            div: [Editor(code)],
            class: "dp-editor-panel",
            style: { display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" },
          },
          {
            div: [
              Preview(code, isDark, hasGrid, error, shadowHost, previewContainer),
              ErrorOverlay(error),
            ],
            class: "dp-preview-panel",
            style: { position: "relative", display: "flex", flexDirection: "column" },
          },
        ],
        class: "dp-editor-grid",
        style: { display: "grid", flex: 1, minHeight: 0 },
      },
    ],
    class: (listener) => `dp-playground dp-tab-${activeTab.get(listener)}`,
    style: {
      display: "flex",
      flexDirection: "column",
      border: (listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      overflow: "hidden",
      position: (listener) => (isFull.get(listener) ? "fixed" : "relative"),
      inset: 0,
      // Code and preview stack in two rows (not side-by-side columns), so
      // each needs its own comfortable scroll height — taller than the old
      // side-by-side default.
      height: (listener) => (isFull.get(listener) ? "100vh" : "760px"),
      zIndex: 10,
      backgroundColor: (listener) => themeColor(listener, "inherit"),
    },
  };

  return {
    div: [workspace, TipBar, Console(logs, copied)],
    style: { display: "flex", flexDirection: "column" },
  };
}
