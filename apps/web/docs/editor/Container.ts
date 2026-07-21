import {
  type DomphyElement,
  type Listener,
  type State,
  toState,
} from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { splitter, splitterHandle, splitterPanel } from "@domphy/ui";
import { Console } from "./Console";
import { Editor } from "./Editor";
import { ErrorOverlay } from "./ErrorOverlay";
import { lockScrollOnFullscreen } from "./fullscreenLock";
import { moduleMap } from "./Modules";
import { Preview } from "./Preview";
import { stringify } from "./stringify";
import { type PlaygroundPane, Toolbar } from "./Toolbar";
import { transformCode } from "./transformCode";

/**
 * Live component playground — product shell (Sandpack / Storybook-class):
 *
 *  Desktop (≥900px): side-by-side Code | Preview, both full height.
 *  Tablet/phone:     tabbed Code / Preview / Split — Code gets the full
 *                    workspace when selected (never a stub strip).
 *  Console:          optional bottom drawer, toggled from the toolbar.
 *
 * Reused on every patch/block docs page via <CodeEditor>.
 */

const WIDE_QUERY = "(min-width: 900px)";

function createWideState(): State<boolean> {
  const matches =
    typeof matchMedia === "function" ? matchMedia(WIDE_QUERY).matches : true;
  const wide = toState(matches);
  if (typeof matchMedia === "function") {
    const mq = matchMedia(WIDE_QUERY);
    const onChange = () => wide.set(mq.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(onChange);
    }
  }
  return wide;
}

function editorSurface(code: State<string>): DomphyElement<"div"> {
  return {
    div: [Editor(code)],
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minHeight: "0",
      minWidth: "0",
      overflow: "hidden",
      // Editor is a dark surface so code always has high contrast.
      backgroundColor: "#0d1117",
    },
  };
}

function previewSurface(
  code: State<string>,
  isDark: State<boolean>,
  hasGrid: State<boolean>,
  error: State<string>,
  shadowHost: HTMLElement,
  previewContainer: HTMLElement,
): DomphyElement<"div"> {
  return {
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
      minWidth: "0",
      overflow: "hidden",
    },
  };
}

function splitHandle(horizontal: boolean): DomphyElement<"div"> {
  return {
    div: [
      {
        // Grip affordance — three dots / a bar so the handle is discoverable.
        span: null,
        style: {
          width: horizontal ? themeSpacing(1) : themeSpacing(8),
          height: horizontal ? themeSpacing(8) : themeSpacing(1),
          borderRadius: themeSpacing(999),
          backgroundColor: (l: Listener) => themeColor(l, "shift-5"),
        },
      },
    ],
    class: "dp-splitter-handle",
    ariaLabel: horizontal
      ? "Drag to resize code and preview columns"
      : "Drag to resize code and preview rows",
    _doctorDisable: ["missing-color", "tone-background-inherit"],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: "0",
      ...(horizontal
        ? {
            width: themeSpacing(3),
            alignSelf: "stretch",
            cursor: "col-resize",
          }
        : {
            height: themeSpacing(3),
            width: "100%",
            cursor: "row-resize",
          }),
      backgroundColor: (l: Listener) => themeColor(l, "shift-1"),
      borderInline: horizontal
        ? (l: Listener) => `1px solid ${themeColor(l, "border")}`
        : undefined,
      borderBlock: horizontal
        ? undefined
        : (l: Listener) => `1px solid ${themeColor(l, "border")}`,
      transition: "background-color 140ms ease",
      "&:hover": {
        backgroundColor: (l: Listener) => themeColor(l, "shift-2"),
      },
      "&:focus-visible": {
        boxShadow: (l: Listener) =>
          `inset 0 0 0 2px ${themeColor(l, "shift-6", "primary")}`,
      },
    },
    $: [splitterHandle()],
  };
}

function splitWorkspace(
  direction: "horizontal" | "vertical",
  editor: DomphyElement,
  preview: DomphyElement,
  key: string,
): DomphyElement<"div"> {
  const horizontal = direction === "horizontal";
  const editorPanel: DomphyElement<"div"> = {
    div: [editor],
    class: "dp-editor-panel",
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: horizontal ? "280px" : "0",
      minHeight: horizontal ? "0" : "240px",
      overflow: "hidden",
    },
    $: [splitterPanel()],
  };
  const previewPanel: DomphyElement<"div"> = {
    div: [preview],
    class: "dp-preview-panel",
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: horizontal ? "280px" : "0",
      minHeight: horizontal ? "0" : "200px",
      overflow: "hidden",
    },
    $: [splitterPanel()],
  };
  return {
    div: [editorPanel, splitHandle(horizontal), previewPanel],
    _key: key,
    class: "dp-editor-stack",
    style: {
      flex: "1",
      minHeight: "0",
      minWidth: "0",
      display: "flex",
    },
    // Code is the primary surface — slightly more than half.
    $: [
      splitter({
        direction,
        defaultSize: horizontal ? 50 : 55,
        min: 32,
        max: 72,
      }),
    ],
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
  const consoleOpen = toState(false);
  const logCount = toState(0);
  const isDark = toState(
    document.documentElement.getAttribute("data-theme") === "dark",
  );
  const isFull = toState(false);
  const hasGrid = toState(false);
  const isWide = createWideState();
  // Mobile defaults to Code (the pane users edit); desktop uses split.
  const pane = toState<PlaygroundPane>(isWide.get() ? "split" : "code");

  // When crossing the breakpoint, prefer split on desktop and code on mobile
  // unless the user already chose something else this session.
  let userPickedPane = false;
  isWide.addListener((wide) => {
    if (userPickedPane) return;
    pane.set(wide ? "split" : "code");
  });
  const setPane = (next: PlaygroundPane) => {
    userPickedPane = true;
    pane.set(next);
  };
  // Wrap pane so Toolbar clicks mark user intent.
  const paneProxy = {
    get: (l?: Listener) => pane.get(l as Listener),
    set: (v: PlaygroundPane) => setPane(v),
    addListener: pane.addListener.bind(pane),
    _isState: true as const,
  } as unknown as State<PlaygroundPane>;

  const update = (val: string) => {
    error.set("");
    logs.set([]);
    logCount.set(0);

    const originalLog = console.log;
    console.log = (...args) => {
      const next = [...logs.get(), args.map((a) => stringify(a)).join(" ")];
      logs.set(next);
      logCount.set(next.length);
      // Auto-open console when the demo prints something.
      if (next.length === 1) consoleOpen.set(true);
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

  const onCopy = () => {
    void navigator.clipboard.writeText(code.get()).then(() => {
      copied.set(true);
      setTimeout(() => copied.set(false), 1600);
    });
  };
  const onReset = () => {
    code.set(initialCode);
    if (storageKey) localStorage.removeItem(storageKey);
  };

  const workspace: DomphyElement<"div"> = {
    div: (listener: Listener) => {
      const wide = isWide.get(listener);
      const mode = pane.get(listener);
      // Desktop always offers split; mobile tabs still allow split.
      const effective: PlaygroundPane =
        wide && mode === "code" && !userPickedPane ? "split" : mode;

      const editor = editorSurface(code);
      const preview = previewSurface(
        code,
        isDark,
        hasGrid,
        error,
        shadowHost,
        previewContainer,
      );

      let main: DomphyElement;
      if (effective === "code") {
        main = {
          div: [editor],
          _key: "pane-code",
          style: {
            flex: "1",
            minHeight: "0",
            display: "flex",
            flexDirection: "column",
          },
        };
      } else if (effective === "preview") {
        main = {
          div: [preview],
          _key: "pane-preview",
          style: {
            flex: "1",
            minHeight: "0",
            display: "flex",
            flexDirection: "column",
          },
        };
      } else {
        main = splitWorkspace(
          wide ? "horizontal" : "vertical",
          editor,
          preview,
          wide ? "split-h" : "split-v",
        );
      }

      const showConsole = consoleOpen.get(listener);

      return [
        Toolbar({
          isDark,
          isFull,
          hasGrid,
          pane: paneProxy,
          // Tabs always available so users can focus code full-height on
          // any viewport (the original complaint).
          showPaneTabs: true,
          consoleOpen,
          logCount,
          error,
          onCopy,
          onReset,
        }),
        main,
        showConsole
          ? {
              div: [Console(logs, copied)],
              _key: "console-drawer",
              style: {
                flexShrink: "0",
                height: "min(32svh, 280px)",
                display: "flex",
                flexDirection: "column",
                minHeight: "0",
                borderTop: (l: Listener) =>
                  `1px solid ${themeColor(l, "border")}`,
              },
            }
          : { div: null, _key: "console-empty" },
      ];
    },
    class: "dp-playground",
    style: {
      display: "flex",
      flexDirection: "column",
      // Product shell — strong border + layered elevation.
      border: (l: Listener) => `1px solid ${themeColor(l, "border-strong")}`,
      borderRadius: (l: Listener) => (isFull.get(l) ? "0" : themeSpacing(3)),
      overflow: "hidden",
      position: (l: Listener) => (isFull.get(l) ? "fixed" : "relative"),
      inset: 0,
      // Nearly full viewport on phone; generous cap on desktop. Fullscreen
      // owns the whole screen including mobile browser chrome via dvh.
      height: (l: Listener) =>
        isFull.get(l) ? "100dvh" : "clamp(560px, calc(100svh - 120px), 1000px)",
      boxShadow: (l: Listener) =>
        isFull.get(l)
          ? "none"
          : "0 8px 30px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.06)",
      zIndex: (l: Listener) => (isFull.get(l) ? 300 : 10),
      backgroundColor: (l: Listener) => themeColor(l, "surface"),
      color: (l: Listener) => themeColor(l, "text"),
    },
  };

  return workspace;
}
