import { type DomphyElement, toState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { splitter, splitterHandle, splitterPanel } from "@domphy/ui";
import { Console } from "./Console";
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
  // Start the preview on the site's own theme — a light preview box in the
  // middle of dark-mode docs reads as a bug. The toolbar toggle still
  // flips it independently afterwards.
  const isDark = toState(
    document.documentElement.getAttribute("data-theme") === "dark",
  );
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

  lockScrollOnFullscreen(isFull);

  // Code above, preview below — both always at full width. A side-by-side
  // split looks nice for small self-contained widgets, but most blocks in
  // this gallery are full-page mockups (login screens, dashboards,
  // sidebars) that are laid out assuming a full-width viewport; halving
  // their width breaks their own internal grid/breakpoints. Full width for
  // both, with a draggable divider to trade code height for preview height,
  // works for both kinds of demo.
  const editorPanel: DomphyElement<"div"> = {
    div: [Editor(code)],
    class: "dp-editor-panel",
    style: {
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden",
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
    },
    $: [splitterPanel()],
  };

  const handle: DomphyElement<"div"> = {
    div: null,
    class: "dp-splitter-handle",
    // Decorative drag grip, no text content of its own. Tall enough to be a
    // usable touch target on mobile.
    _doctorDisable: "missing-color",
    style: { height: themeSpacing(2.5) },
    $: [splitterHandle()],
  };

  const stack: DomphyElement<"div"> = {
    div: [editorPanel, handle, previewPanel],
    class: "dp-editor-stack",
    style: { flex: 1, minHeight: 0 },
    $: [splitter({ direction: "vertical", defaultSize: 30, min: 15, max: 70 })],
  };

  // One rounded card owns the whole playground: toolbar, code/preview split,
  // console output, and the tip footer all live inside the same border
  // instead of hanging below it as disconnected strips.
  const workspace: DomphyElement<"div"> = {
    div: [
      Toolbar({ isDark, isFull, hasGrid }),
      stack,
      Console(logs, copied),
      TipBar,
    ],
    class: "dp-playground",
    style: {
      display: "flex",
      flexDirection: "column",
      border: (listener) => `1px solid ${themeColor(listener, "border")}`,
      borderRadius: (listener) =>
        isFull.get(listener) ? "0" : themeSpacing(2),
      overflow: "hidden",
      position: (listener) => (isFull.get(listener) ? "fixed" : "relative"),
      inset: 0,
      // Non-fullscreen: track the viewport (tall screens get a tall
      // playground, short ones never overflow the page). svh keeps mobile
      // browser chrome from eating the bottom of the card.
      height: (listener) =>
        isFull.get(listener)
          ? "100vh"
          : "clamp(420px, calc(100svh - 220px), 900px)",
      // Above the site header's own z-index:100 (packages/press/src/layout.ts)
      // so fullscreen genuinely covers the whole page instead of having its
      // toolbar hidden underneath the sticky header.
      zIndex: (listener) => (isFull.get(listener) ? 300 : 10),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "text"),
    },
  };

  return workspace;
}
