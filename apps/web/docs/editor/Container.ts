import { type DomphyElement, toState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { splitter, splitterHandle, splitterPanel } from "@domphy/ui";
import { Console } from "./Console";
import { PLAYGROUND_STACK_QUERY } from "./constants";
import { Editor } from "./Editor";
import { ErrorOverlay } from "./ErrorOverlay";
import { lockScrollOnFullscreen } from "./fullscreenLock";
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

  lockScrollOnFullscreen(isFull);

  // Both panels are always in the DOM. On a wide-enough playground they sit
  // side by side (resizable via the drag handle); below PLAYGROUND_STACK_QUERY
  // they stack and only the active tab's panel stays visible — the `!important`
  // width override is required there because splitterPanel() binds width via a
  // live DOM mutation (not a stylesheet rule), which normal cascade order can't
  // out-rank.
  const editorPanel: DomphyElement<"div"> = {
    div: [Editor(code)],
    class: "dp-editor-panel",
    style: {
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden",
      [PLAYGROUND_STACK_QUERY]: {
        width: "100% !important",
        height: "100%",
        display: (listener) =>
          activeTab.get(listener) === "code" ? "flex" : "none",
      },
    },
    $: [splitterPanel()],
  };

  const previewPanel: DomphyElement<"div"> = {
    div: [
      Preview(code, isDark, hasGrid, error, shadowHost, previewContainer),
      ErrorOverlay(error),
    ],
    class: "dp-preview-panel",
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden",
      [PLAYGROUND_STACK_QUERY]: {
        width: "100% !important",
        height: "100%",
        display: (listener) =>
          activeTab.get(listener) === "preview" ? "flex" : "none",
      },
    },
    $: [splitterPanel()],
  };

  const handle: DomphyElement<"div"> = {
    div: null,
    class: "dp-splitter-handle",
    // Decorative drag grip, no text content of its own.
    _doctorDisable: "missing-color",
    style: {
      width: themeSpacing(1.5),
      [PLAYGROUND_STACK_QUERY]: { display: "none" },
    },
    $: [splitterHandle()],
  };

  const grid: DomphyElement<"div"> = {
    div: [editorPanel, handle, previewPanel],
    class: "dp-editor-grid",
    style: {
      flex: 1,
      minHeight: 0,
      [PLAYGROUND_STACK_QUERY]: { flexDirection: "column" },
    },
    $: [splitter({ direction: "horizontal", defaultSize: 50, min: 25, max: 75 })],
  };

  const workspace: DomphyElement<"div"> = {
    div: [Toolbar({ activeTab, isDark, isFull, hasGrid }), grid],
    class: "dp-playground",
    style: {
      display: "flex",
      flexDirection: "column",
      border: (listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      overflow: "hidden",
      position: (listener) => (isFull.get(listener) ? "fixed" : "relative"),
      inset: 0,
      // Only one panel's worth of height is ever visible at once now (either
      // half the width in split view, or the full width in stacked view) —
      // shorter than the old stacked-rows layout needed.
      height: (listener) => (isFull.get(listener) ? "100vh" : "520px"),
      // Above the site header's own z-index:100 (packages/press/src/layout.ts)
      // so fullscreen genuinely covers the whole page instead of having its
      // toolbar hidden underneath the sticky header.
      zIndex: (listener) => (isFull.get(listener) ? 300 : 10),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      // Establishes the query container PLAYGROUND_STACK_QUERY measures
      // against — the playground's own rendered width, not the viewport, so
      // it degrades correctly inside a narrow docs sidebar+TOC column too.
      containerType: "inline-size",
    },
  };

  return {
    div: [workspace, TipBar, Console(logs, copied)],
    style: { display: "flex", flexDirection: "column" },
  };
}
