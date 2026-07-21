import type { DomphyElement, State } from "@domphy/core";
import { themeColor, themeSize, themeSpacing } from "@domphy/theme";

// Terminal surface — dark ramp via dataTheme so tokens stay themed.
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
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(3),
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
      {
        span: (l) => `Console · ${logs.get(l).length}`,
        style: { fontWeight: "600" },
      },
      {
        button: (listener) => (copied.get(listener) ? "Copied" : "Copy all"),
        type: "button",
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
          color: (listener) => themeColor(listener, "shift-9"),
          fontSize: (listener) => themeSize(listener, "decrease-2"),
          paddingBlock: themeSpacing(0.5),
          paddingInline: themeSpacing(2),
          borderRadius: themeSpacing(1),
          fontWeight: "600",
        },
      },
    ],
    _key: "header",
    dataTone: "shift-2",
    style: {
      position: "sticky",
      top: "0",
      zIndex: "1",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: "0",
      paddingBlock: themeSpacing(1.5),
      paddingInline: themeSpacing(3),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      borderBottom: (listener) => `1px solid ${themeColor(listener, "border")}`,
      color: (listener) => themeColor(listener, "shift-11"),
      fontSize: (listener) => themeSize(listener, "decrease-2"),
      textTransform: "uppercase",
      letterSpacing: "0.04em",
    },
  };
}

function ConsoleEmpty(): DomphyElement<"div"> {
  return {
    div: [
      {
        span: "No output yet. ",
        style: { color: (listener) => themeColor(listener, "muted") },
      },
      {
        code: "console.log(...)",
        style: {
          color: (listener) => themeColor(listener, "shift-10", "info"),
          fontFamily: monoFont,
        },
      },
      {
        span: " in the demo prints here. Tip: log the element to inspect the expanded patch tree.",
        style: { color: (listener) => themeColor(listener, "muted") },
      },
    ],
    _key: "empty",
    style: {
      paddingBlock: themeSpacing(4),
      paddingInline: themeSpacing(3),
      fontSize: (listener) => themeSize(listener, "decrease-1"),
      lineHeight: "1.5",
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
      if (!currentLogs.length) {
        return [ConsoleHeader(logs, copied), ConsoleEmpty()];
      }
      return [ConsoleHeader(logs, copied), ...currentLogs.map(ConsoleLog)];
    },
    dataTheme: "dark",
    dataTone: "shift-1",
    _doctorDisable: "inline-typography",
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minHeight: "0",
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "text"),
      fontFamily: monoFont,
      fontSize: (listener) => themeSize(listener, "decrease-1"),
      overflowY: "auto",
      position: "relative",
    },
  };
}
