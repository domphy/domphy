import { computed, type DomphyElement, type State } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { icon, tooltip } from "@domphy/ui";
import { PLAYGROUND_STACK_QUERY } from "./constants.js";

const svgDark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" /><path d="M11.089 7.083a5 5 0 0 1 5.826 5.84m-1.378 2.611a5.012 5.012 0 0 1 -.537 .466a3.5 3.5 0 0 0 -1 3a2 2 0 1 1 -4 0a3.5 3.5 0 0 0 -1 -3a5 5 0 0 1 -.528 -7.544" /><path d="M9.7 17h4.6" /><path d="M3 3l18 18" /></svg>`;
const svgLight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" /><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" /><path d="M9.7 17l4.6 0" /></svg>`;
const svgFullscreen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16 4l4 0l0 4" /><path d="M14 10l6 -6" /><path d="M8 20l-4 0l0 -4" /><path d="M4 20l6 -6" /><path d="M16 20l4 0l0 -4" /><path d="M14 14l6 6" /><path d="M8 4l-4 0l0 4" /><path d="M4 4l6 6" /></svg>`;
const svgExit = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 9l4 0l0 -4" /><path d="M3 3l6 6" /><path d="M5 15l4 0l0 4" /><path d="M3 21l6 -6" /><path d="M19 9l-4 0l0 -4" /><path d="M15 9l6 -6" /><path d="M19 15l-4 0l0 4" /><path d="M15 15l6 6" /></svg>`;
const svgGridOn = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -14" /><path d="M3 10h18" /><path d="M10 3v18" /></svg>`;
const svgGridOff = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 3h12a2 2 0 0 1 2 2v12m-.585 3.413a1.994 1.994 0 0 1 -1.415 .587h-14a2 2 0 0 1 -2 -2v-14c0 -.55 .223 -1.05 .583 -1.412" /><path d="M3 10h7m4 0h7" /><path d="M10 3v3m0 4v11" /><path d="M3 3l18 18" /></svg>`;

export const Toolbar = (props: {
  activeTab?: State<"code" | "preview">;
  isDark: State<boolean>;
  isFull: State<boolean>;
  hasGrid: State<boolean>;
}): DomphyElement<"div"> => {
  const { activeTab, isDark, isFull, hasGrid } = props;

  function makeTabButton(
    tab_: State<"code" | "preview">,
    label: string,
    value: "code" | "preview",
  ): DomphyElement<"button"> {
    return {
      button: label,
      onClick: () => tab_.set(value),
      style: {
        background: "none",
        border: "none",
        borderBottom: (listener) =>
          tab_.get(listener) === value
            ? `2px solid ${themeColor(listener, "shift-9", "primary")}`
            : "2px solid transparent",
        color: (listener) =>
          tab_.get(listener) === value
            ? themeColor(listener, "shift-9")
            : themeColor(listener, "shift-5"),
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "12px",
        fontWeight: (listener) =>
          tab_.get(listener) === value ? "600" : "400",
        letterSpacing: "0.03em",
        padding: `${themeSpacing(2)} ${themeSpacing(3)}`,
        transition: "color 0.15s, border-color 0.15s",
      },
    };
  }

  const tabs: DomphyElement<"div"> | null = activeTab
    ? {
        div: [
          makeTabButton(activeTab, "Code", "code"),
          makeTabButton(activeTab, "Preview", "preview"),
        ],
        // Hidden by default (the split view shows both panels at once); only
        // shown once the playground's own width drops below the stack
        // breakpoint, where a single panel is visible at a time instead.
        style: {
          display: "none",
          [PLAYGROUND_STACK_QUERY]: { display: "flex", alignItems: "stretch" },
        },
      }
    : null;

  const toggleGrid: DomphyElement<"span"> = {
    span: (listener) => (hasGrid.get(listener) ? svgGridOff : svgGridOn),
    onClick: () => hasGrid.set(!hasGrid.get()),
    $: [icon(), tooltip({ content: computed(() => (hasGrid.get() ? "Hide grid" : "Show grid")) })],
  };

  const toggleTheme: DomphyElement<"span"> = {
    span: (listener) => (isDark.get(listener) ? svgLight : svgDark),
    onClick: () => isDark.set(!isDark.get()),
    $: [icon(), tooltip({ content: computed(() => (isDark.get() ? "Light theme" : "Dark theme")) })],
  };

  const toggleScreen: DomphyElement<"span"> = {
    span: (listener) => (isFull.get(listener) ? svgExit : svgFullscreen),
    onClick: () => isFull.set(!isFull.get()),
    $: [icon(), tooltip({ content: computed(() => (isFull.get() ? "Exit fullscreen" : "Fullscreen")) })],
  };

  return {
    div: [
      tabs,
      {
        div: [toggleGrid, toggleTheme, toggleScreen],
        style: {
          display: "flex",
          alignItems: "center",
          gap: themeSpacing(3),
          paddingRight: themeSpacing(2),
        },
      },
    ],
    style: {
      display: "flex",
      alignItems: "stretch",
      justifyContent: "space-between",
      borderBottom: (listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      minHeight: "36px",
    },
  };
};
