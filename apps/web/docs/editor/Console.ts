import type { DomphyElement, State } from "@domphy/core";
import { themeColor, themeSize, themeSpacing } from "@domphy/theme";

// The console is a terminal surface — deliberately dark on both site themes.
// dataTheme="dark" + dataTone gives it a real dark ramp from the theme itself,
// so every color below stays a token instead of a hard-coded hex.
const monoFont =
  "var(--dp-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

function ConsoleLog(log: string, i: number): DomphyElement<"div"> {
  return {
    div: [
      {
        span: "›",
        style: {
          flexShrink: "0",
          color: (listener) => themeColor(listener, "shift-7"),
          userSelect: "none",
        },
      },
      { span: log, style: { whiteSpace: "pre-wrap", wordBreak: "break-all" } },
    ],
    _key: i,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: themeSpacing(1.5),
      paddingBlock: themeSpacing(0.75),
      paddingInline: themeSpacing(2.5),
      color: (listener) => themeColor(listener, "shift-10", "info"),
      borderBottom: (listener) =>
        `1px solid ${themeColor(listener, "shift-2")}`,
    },
  };
}

function ConsoleHeader(
  logs: State<string[]>,
  copied: State<boolean>,
): DomphyElement<"div"> {
  return {
    div: [
      { span: "Console" },
      {
        button: (listener) => (copied.get(listener) ? "✓ Copied" : "Copy"),
        onClick: () => {
          navigator.clipboard.writeText(logs.get().join("\n")).then(() => {
            copied.set(true);
            setTimeout(() => copied.set(false), 2000);
          });
        },
        style: {
          cursor: "pointer",
          background: "transparent",
          border: (listener) =>
            `1px solid ${themeColor(listener, "border-strong")}`,
          color: (listener) => themeColor(listener, "shift-8"),
          fontSize: (listener) => themeSize(listener, "decrease-2"),
          paddingBlock: themeSpacing(0.5),
          paddingInline: themeSpacing(2),
          borderRadius: themeSpacing(1),
          textTransform: "uppercase",
        },
      },
    ],
    _key: "header",
    // Raised strip over the log lines so the sticky header stays readable
    // while scrolling.
    dataTone: "shift-2",
    style: {
      position: "sticky",
      top: "0",
      zIndex: "1",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(2.5),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      borderBottom: (listener) => `1px solid ${themeColor(listener, "border")}`,
      color: (listener) => themeColor(listener, "shift-11"),
      fontSize: (listener) => themeSize(listener, "decrease-2"),
      textTransform: "uppercase",
    },
  };
}

export function Console(
  logs: State<string[]>,
  copied: State<boolean>,
): DomphyElement<"div"> {
  return {
    div: (listener) => {
      const currentLogs = logs.get(listener);
      if (!currentLogs.length) return [];
      return [ConsoleHeader(logs, copied), ...currentLogs.map(ConsoleLog)];
    },
    dataTheme: "dark",
    dataTone: "shift-1",
    // Terminal output is semantically monospace — the typography patches
    // cover prose, not consoles. Uses the theme's own --dp-font-mono token.
    _doctorDisable: "inline-typography",
    style: {
      // Collapse fully when there are no logs — an empty strip with just a
      // border-top read as a rendering bug.
      display: (listener) => (logs.get(listener).length ? "block" : "none"),
      borderTop: (listener) => `1px solid ${themeColor(listener, "border")}`,
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "text"),
      fontFamily: monoFont,
      fontSize: (listener) => themeSize(listener, "decrease-1"),
      maxHeight: "clamp(160px, 32svh, 480px)",
      overflowY: "auto",
      position: "relative",
    },
  };
}
