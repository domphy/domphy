import { type DomphyElement, type Listener, toState } from "@domphy/core";
import { themeColor, themeSize, themeSpacing } from "@domphy/theme";
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

/** Desktop breakpoint: side-by-side code | preview (full-height code pane). */
const WIDE_QUERY = "(min-width: 900px)";

function createWideState() {
  const matches =
    typeof matchMedia === "function" ? matchMedia(WIDE_QUERY).matches : false;
  const wide = toState(matches);
  if (typeof matchMedia === "function") {
    const mq = matchMedia(WIDE_QUERY);
    const onChange = () => wide.set(mq.matches);
    // modern + Safari <14 fallback
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(onChange);
    }
  }
  return wide;
}

function panelChrome(
  label: string,
  child: DomphyElement,
  opts: { minHeight?: string; minWidth?: string; className?: string } = {},
): DomphyElement<"div"> {
  return {
    div: [
      {
        div: label,
        style: {
          flexShrink: "0",
          paddingBlock: themeSpacing(1),
          paddingInline: themeSpacing(3),
          fontSize: (listener) => themeSize(listener, "decrease-2"),
          fontWeight: "600",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: (listener) => themeColor(listener, "muted"),
          backgroundColor: (listener) => themeColor(listener, "shift-1"),
          borderBottom: (listener) =>
            `1px solid ${themeColor(listener, "border")}`,
          userSelect: "none",
        },
      },
      child,
    ],
    class: opts.className,
    style: {
      display: "flex",
      flexDirection: "column",
      minHeight: opts.minHeight ?? "0",
      minWidth: opts.minWidth ?? "0",
      overflow: "hidden",
    },
    $: [splitterPanel()],
  };
}

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
  const isWide = createWideState();

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

  // Remount when orientation flips so splitter direction + defaultSize rebind.
  const stack: DomphyElement<"div"> = {
    div: (listener: Listener) => {
      const wide = isWide.get(listener);
      const editorInner: DomphyElement<"div"> = {
        div: [Editor(code)],
        style: {
          display: "flex",
          flexDirection: "column",
          flex: "1",
          minHeight: "0",
          overflow: "hidden",
        },
      };
      const previewInner: DomphyElement<"div"> = {
        div: [
          Preview(code, isDark, hasGrid, error, shadowHost, previewContainer),
          ErrorOverlay(error),
        ],
        style: {
          position: "relative",
          display: "flex",
          flexDirection: "column",
          flex: "1",
          minHeight: "0",
          overflow: "hidden",
        },
      };

      // Code pane: ≥280px tall (stack) or ≥min width (side-by-side) so the
      // editor is never a "stub" strip.
      const editorPanel = panelChrome("Code", editorInner, {
        minHeight: wide ? "0" : "280px",
        minWidth: wide ? "240px" : "0",
        className: "dp-editor-panel",
      });

      const previewPanel = panelChrome("Preview", previewInner, {
        minHeight: wide ? "0" : "200px",
        minWidth: wide ? "240px" : "0",
        className: "dp-preview-panel",
      });

      const handle: DomphyElement<"div"> = {
        div: null,
        class: "dp-splitter-handle",
        ariaLabel: wide
          ? "Resize code and preview columns"
          : "Resize code and preview rows",
        _doctorDisable: "missing-color",
        style: wide
          ? {
              width: themeSpacing(2.5),
              flexShrink: "0",
              alignSelf: "stretch",
            }
          : {
              height: themeSpacing(2.5),
              flexShrink: "0",
              width: "100%",
            },
        $: [splitterHandle()],
      };

      return [
        {
          div: [editorPanel, handle, previewPanel],
          _key: wide ? "playground-h" : "playground-v",
          class: "dp-editor-stack",
          style: {
            flex: "1",
            minHeight: "0",
            minWidth: "0",
            display: "flex",
          },
          // Wide: code ~42% of width (full height → readable).
          // Narrow: code ~48% of height (never the old 30% stub).
          $: [
            splitter({
              direction: wide ? "horizontal" : "vertical",
              defaultSize: wide ? 42 : 48,
              min: 30,
              max: 70,
            }),
          ],
        } as DomphyElement,
      ];
    },
    style: {
      flex: "1",
      minHeight: "0",
      display: "flex",
      flexDirection: "column",
    },
  };

  // One rounded card owns the whole playground: toolbar, code/preview split,
  // console output, and the tip footer all live inside the same border.
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
      border: (listener) =>
        `1px solid ${themeColor(listener, "border-strong")}`,
      borderRadius: (listener) =>
        isFull.get(listener) ? "0" : themeSpacing(2.5),
      overflow: "hidden",
      position: (listener) => (isFull.get(listener) ? "fixed" : "relative"),
      inset: 0,
      // Tall enough for a usable code pane + preview on phones and desktops.
      // Mobile: nearly full viewport minus chrome. Desktop: cap at 960px.
      height: (listener) =>
        isFull.get(listener)
          ? "100dvh"
          : "clamp(520px, calc(100svh - 140px), 960px)",
      // Soft elevation so the playground reads as a product surface, not a
      // flat markdown fence.
      boxShadow: (listener) =>
        isFull.get(listener)
          ? "none"
          : "0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
      // Above the site header's own z-index:100 (packages/press/src/layout.ts)
      // so fullscreen genuinely covers the whole page.
      zIndex: (listener) => (isFull.get(listener) ? 300 : 10),
      backgroundColor: (listener) => themeColor(listener, "surface"),
      color: (listener) => themeColor(listener, "text"),
    },
  };

  return workspace;
}
