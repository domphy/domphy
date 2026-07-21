import {
  computed,
  type DomphyElement,
  type Listener,
  type State,
} from "@domphy/core";
import { themeColor, themeSize, themeSpacing } from "@domphy/theme";
import { buttonGhost, icon, row, tooltip } from "@domphy/ui";

const svgDark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" /></svg>`;
const svgLight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></svg>`;
const svgFullscreen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 8v-2a2 2 0 0 1 2 -2h2" /><path d="M4 16v2a2 2 0 0 0 2 2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M16 20h2a2 2 0 0 0 2 -2v-2" /></svg>`;
const svgExit = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 4h-2a2 2 0 0 0 -2 2v2" /><path d="M9 20h-2a2 2 0 0 1 -2 -2v-2" /><path d="M15 4h2a2 2 0 0 1 2 2v2" /><path d="M15 20h2a2 2 0 0 0 2 -2v-2" /></svg>`;
const svgGridOn = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M14 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /></svg>`;
const svgGridOff = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7.744 3.744a.996 .996 0 0 1 .256 -.044h4a1 1 0 0 1 1 1v1m0 4v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6" /><path d="M14 3h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-2m-2 0h-2" /><path d="M3 14v-1" /><path d="M7 14h-1" /><path d="M10.5 20h-.5a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v1m0 4v1a1 1 0 0 1 -1 1h-1" /><path d="M14 14h5a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-4" /><path d="M3 3l18 18" /></svg>`;
const svgCopy = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /></svg>`;
const svgReset = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19.933 13.041a8 8 0 1 1 -9.925 -8.788c3.899 -1 7.935 1.007 9.425 4.747" /><path d="M20 4v5h-5" /></svg>`;
const svgConsole = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 9l3 3l-3 3" /><path d="M13 15h3" /><path d="M3 4m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" /></svg>`;

export type PlaygroundPane = "code" | "preview" | "split";

function toolButton(
  svg: string | ((l: Listener) => string),
  label: string | ((l: Listener) => string),
  onClick: () => void,
  opts: { active?: (l: Listener) => boolean } = {},
): DomphyElement<"button"> {
  return {
    button: [
      {
        span: typeof svg === "function" ? (l: Listener) => svg(l) : svg,
        $: [icon()],
        style: {
          width: themeSpacing(5),
          height: themeSpacing(5),
        },
      },
    ],
    type: "button",
    ariaLabel: typeof label === "function" ? undefined : label,
    onClick,
    $: [
      buttonGhost({ color: "neutral", size: "small" }),
      tooltip({
        content: typeof label === "function" ? computed(() => label()) : label,
      }),
    ],
    style: {
      width: themeSpacing(9),
      height: themeSpacing(9),
      flexShrink: "0",
      backgroundColor: (l: Listener) =>
        opts.active?.(l) ? themeColor(l, "hover") : "transparent",
    },
  };
}

function paneTab(
  id: PlaygroundPane,
  label: string,
  pane: State<PlaygroundPane>,
): DomphyElement<"button"> {
  return {
    button: label,
    type: "button",
    ariaPressed: (l: Listener) => (pane.get(l) === id ? "true" : "false"),
    onClick: () => pane.set(id),
    style: {
      appearance: "none",
      border: "none",
      cursor: "pointer",
      fontWeight: (l: Listener) => (pane.get(l) === id ? "600" : "500"),
      fontSize: (l: Listener) => themeSize(l, "decrease-1"),
      paddingBlock: themeSpacing(1.5),
      paddingInline: themeSpacing(3),
      borderRadius: themeSpacing(1.5),
      color: (l: Listener) =>
        pane.get(l) === id
          ? themeColor(l, "shift-12", "primary")
          : themeColor(l, "text"),
      backgroundColor: (l: Listener) =>
        pane.get(l) === id
          ? themeColor(l, "shift-2", "primary")
          : "transparent",
      transition: "background-color 140ms ease, color 140ms ease",
      "&:hover": {
        backgroundColor: (l: Listener) =>
          pane.get(l) === id
            ? themeColor(l, "shift-3", "primary")
            : themeColor(l, "hover"),
      },
      "&:focus-visible": {
        boxShadow: (l: Listener) =>
          `0 0 0 2px ${themeColor(l, "shift-6", "primary")}`,
      },
    },
  };
}

export interface ToolbarProps {
  isDark: State<boolean>;
  isFull: State<boolean>;
  hasGrid: State<boolean>;
  /** Active workspace pane (code / preview / split). */
  pane?: State<PlaygroundPane>;
  /** Whether to show Code/Preview/Split tabs (hide on bare preview widgets). */
  showPaneTabs?: boolean;
  /** Whether the console drawer is open. */
  consoleOpen?: State<boolean>;
  /** Number of console lines (badge). */
  logCount?: State<number>;
  /** Live compile error (status chip). */
  error?: State<string>;
  onCopy?: () => void;
  onReset?: () => void;
  title?: string;
}

export const Toolbar = (props: ToolbarProps): DomphyElement<"div"> => {
  const {
    isDark,
    isFull,
    hasGrid,
    pane,
    showPaneTabs = false,
    consoleOpen,
    logCount,
    error,
    onCopy,
    onReset,
    title = "Playground",
  } = props;

  const actions: DomphyElement[] = [];
  if (onCopy) {
    actions.push(toolButton(svgCopy, "Copy code", onCopy));
  }
  if (onReset) {
    actions.push(toolButton(svgReset, "Reset to original", onReset));
  }
  if (consoleOpen && logCount) {
    actions.push(
      toolButton(
        svgConsole,
        (l) => {
          const n = logCount.get(l);
          return n
            ? `Console (${n})`
            : consoleOpen.get(l)
              ? "Hide console"
              : "Show console";
        },
        () => consoleOpen.set(!consoleOpen.get()),
        { active: (l) => consoleOpen.get(l) },
      ),
    );
  }
  actions.push(
    toolButton(
      (l) => (hasGrid.get(l) ? svgGridOff : svgGridOn),
      (l) => (hasGrid.get(l) ? "Hide grid" : "Show grid"),
      () => hasGrid.set(!hasGrid.get()),
      { active: (l) => hasGrid.get(l) },
    ),
    toolButton(
      (l) => (isDark.get(l) ? svgLight : svgDark),
      (l) => (isDark.get(l) ? "Light preview" : "Dark preview"),
      () => isDark.set(!isDark.get()),
    ),
    toolButton(
      (l) => (isFull.get(l) ? svgExit : svgFullscreen),
      (l) => (isFull.get(l) ? "Exit fullscreen" : "Fullscreen"),
      () => isFull.set(!isFull.get()),
    ),
  );

  const left: DomphyElement[] = [
    {
      span: title,
      style: {
        color: (l: Listener) => themeColor(l, "text"),
        fontSize: (l: Listener) => themeSize(l, "decrease-1"),
        fontWeight: "700",
        letterSpacing: "-0.01em",
        userSelect: "none",
        whiteSpace: "nowrap",
      },
    },
  ];

  if (error) {
    left.push({
      span: (l: Listener) => (error.get(l) ? "Error" : "Ready"),
      style: {
        fontSize: (l: Listener) => themeSize(l, "decrease-2"),
        fontWeight: "600",
        paddingBlock: themeSpacing(0.5),
        paddingInline: themeSpacing(2),
        borderRadius: themeSpacing(999),
        color: (l: Listener) =>
          error.get(l)
            ? themeColor(l, "shift-0", "error")
            : themeColor(l, "shift-0", "success"),
        backgroundColor: (l: Listener) =>
          error.get(l)
            ? themeColor(l, "shift-9", "error")
            : themeColor(l, "shift-9", "success"),
      },
    });
  }

  if (showPaneTabs && pane) {
    left.push({
      div: [
        paneTab("code", "Code", pane),
        paneTab("preview", "Preview", pane),
        paneTab("split", "Split", pane),
      ],
      role: "tablist",
      ariaLabel: "Playground view",
      style: {
        display: "flex",
        alignItems: "center",
        gap: themeSpacing(0.5),
        padding: themeSpacing(0.5),
        borderRadius: themeSpacing(2),
        backgroundColor: (l: Listener) => themeColor(l, "shift-2"),
        // On very narrow screens wrap under the title.
        "@media (max-width: 480px)": {
          order: 3,
          width: "100%",
          justifyContent: "stretch",
        },
      },
    });
  }

  return {
    div: [
      {
        div: left,
        $: [row({ gap: 3, wrap: true })],
        style: { flex: "1", minWidth: "0" },
      },
      {
        div: actions,
        $: [row({ gap: 0.5 })],
        style: { flexShrink: "0" },
      },
    ],
    dataTone: "shift-1",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: themeSpacing(3),
      flexWrap: "wrap",
      rowGap: themeSpacing(2),
      flexShrink: "0",
      paddingBlock: themeSpacing(2),
      paddingInline: themeSpacing(3),
      borderBottom: (l: Listener) => `1px solid ${themeColor(l, "border")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit"),
      color: (l: Listener) => themeColor(l, "text"),
    },
  };
};
