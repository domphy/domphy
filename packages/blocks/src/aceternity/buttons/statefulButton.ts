// Aceternity UI "Stateful Button" — clean-room reimplementation ("inspired by
// the design of buttons on Family", per the reference page's own note).
//
// A button that morphs its content through idle label -> loading spinner ->
// success checkmark -> back to idle, giving inline feedback for an async
// click action. Implemented purely from the block's public functional/visual
// spec — no upstream Aceternity source was viewed or copied.
//
// The three states are mutually exclusive single-item arrays keyed by state
// name (`_key: "idle" | "loading" | "success"`) — the same keyed-swap
// technique `animatedList.ts`/`rippleButton.ts` use for their own dynamic
// entries. Domphy reconciles a changed `_key` as an unmount-then-mount pair,
// so each state's `motion()` patch gets its own enter (`initial` -> `animate`)
// and exit (`exit`) transition for free: a slide-up-and-fade in, slide-down-
// and-fade out. The button's own `paddingInline` is a reactive function of the
// same state, so it visually narrows toward a compact square while the
// spinner/checkmark (no label text) are shown, and widens back once the idle
// label returns — animated via a plain CSS `transition` on `padding-inline`.
import type { DomphyElement, Listener, State, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { motion, spinner, strong } from "@domphy/ui";
import { themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export type StatefulButtonPhase = "idle" | "loading" | "success";

export interface StatefulButtonProps {
  /** Idle label content. Defaults to `"Send message"`. */
  children?: string | DomphyElement | DomphyElement[];
  /** Click handler; may return a `Promise` — its resolve timing drives the loading-to-success transition. */
  onClick?: (event: MouseEvent) => void | Promise<unknown>;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  /** How long the success checkmark holds before reverting to idle, in ms. Defaults to `2000`. */
  successHoldDuration?: number;
  style?: StyleObject;
}

function asContent(value: string | DomphyElement | DomphyElement[]): (string | DomphyElement)[] {
  return Array.isArray(value) ? value : [value];
}

/** Small checkmark glyph, matching `interactiveHoverButton.ts`'s inline-SVG icon pattern. */
function checkGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [{ polyline: null, points: "20 6 9 17 4 12" }],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.5",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: { display: "inline-flex", width: themeSpacing(5), height: themeSpacing(5) },
  };
}

const SLIDE_TRANSITION = { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };

/** Builds the single visible content item for a given phase, keyed so Domphy
 * reconciles a phase change as an unmount-then-mount pair (driving `motion()`'s
 * enter/exit transitions on each swap). */
function contentForPhase(phase: StatefulButtonPhase, label: (string | DomphyElement)[]): DomphyElement<"span"> {
  const shared = {
    _key: phase,
    style: { display: "inline-flex", alignItems: "center", justifyContent: "center" } as StyleObject,
    $: [motion({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: SLIDE_TRANSITION })],
  };
  if (phase === "loading") {
    return { span: [{ span: null, $: [spinner({ color: "neutral" })] }], ...shared } as DomphyElement<"span">;
  }
  if (phase === "success") {
    return { span: [checkGlyph()], ...shared } as DomphyElement<"span">;
  }
  return { span: label, ...shared } as DomphyElement<"span">;
}

/**
 * A button that morphs its content from an idle label into a compact loading
 * spinner, then a success checkmark, before automatically reverting — inline
 * async-action feedback in the style of Family's buttons. Call with no
 * arguments for a working demo — a "Send message" button.
 */
function statefulButton(props: StatefulButtonProps = {}): DomphyElement<"button"> {
  const label = asContent(props.children ?? "Send message");
  const idleLabel: (string | DomphyElement)[] = [{ strong: label, $: [strong({ color: "neutral" })] } as DomphyElement<"strong">];
  const successHoldDuration = props.successHoldDuration ?? 2000;

  const phase: State<StatefulButtonPhase> = toState<StatefulButtonPhase>("idle");
  let successTimer: ReturnType<typeof setTimeout> | null = null;

  const clearSuccessTimer = () => {
    if (successTimer) {
      clearTimeout(successTimer);
      successTimer = null;
    }
  };

  const handleClick = async (event: MouseEvent) => {
    if (phase.get() !== "idle") return;
    clearSuccessTimer();
    phase.set("loading");
    try {
      await props.onClick?.(event);
    } finally {
      phase.set("success");
      successTimer = setTimeout(() => {
        successTimer = null;
        phase.set("idle");
      }, successHoldDuration);
    }
  };

  // Hand-rolls the button chrome instead of composing the `button()` patch: that
  // patch's `color` prop drives BOTH background and hover/focus/disabled states off
  // a single reactive tone, which would fight the fixed-dark `dataTone` anchor and
  // the reactive `paddingInline` this component needs for its own width-morph
  // (same tradeoff `rainbowButton.ts`/`shimmerButton.ts` make for their own bespoke
  // container chrome).
  const buttonElement: DomphyElement<"button"> = {
    button: (listener: Listener) => [contentForPhase(phase.get(listener), idleLabel)],
    type: props.type ?? "button",
    disabled: props.disabled,
    class: props.className,
    dataTone: "shift-15",
    ariaBusy: (listener: Listener) => (phase.get(listener) === "loading" ? "true" : "false"),
    style: {
      position: "relative",
      appearance: "none",
      border: "none",
      cursor: props.disabled ? "not-allowed" : "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      boxSizing: "border-box",
      minHeight: (listener: Listener) => themeSpacing(themeDensity(listener) * 4 + 12),
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener: Listener) =>
        phase.get(listener) === "idle"
          ? themeSpacing(themeDensity(listener) * 4)
          : themeSpacing(themeDensity(listener) * 1),
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      opacity: props.disabled ? 0.6 : 1,
      transition: "padding-inline 220ms cubic-bezier(0.22, 1, 0.36, 1)",
      ...(props.style ?? {}),
    } as StyleObject,
    onClick: handleClick,
    _onRemove: () => {
      clearSuccessTimer();
    },
  };

  return buttonElement;
}

export { statefulButton };
