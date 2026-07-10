// Magic UI "Ripple Button" — clean-room reimplementation.
//
// An ordinary button that, on every click, spawns a semi-transparent circle
// expanding out from the exact pointer position and fading away — classic
// tactile click feedback. Implemented purely from the block's public
// functional/visual spec — no upstream Magic UI source was viewed or copied.
//
// Each click reads its coordinates relative to the button's own bounding box
// (not the button's center) and pushes a new entry onto a reactive array —
// the same keyed-reactive-list pattern `animatedList.ts` uses for its feed —
// so rapid repeated clicks can have several ripples animating at once. Every
// ripple carries its own stable id (used as `_key`) and is dropped from the
// array via a `setTimeout` matching its animation `duration`, so the DOM
// never accumulates finished ripples.
//
// The upstream spec's `rippleColor` prop is a literal RGB string. Domphy's
// doctor rules forbid raw rgb/hex color literals on style props, so it is
// exposed as a `ThemeColor` role instead (default `"neutral"`, resolved at
// its lightest edge tone — a near-white ripple that flashes at full opacity
// then fades, matching the spec's own stated default) — the same tradeoff
// `animatedGradientText` documents for its own literal-color props.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString, toState } from "@domphy/core";
import { type ThemeColor, themeColor } from "@domphy/theme";
import { button } from "@domphy/ui";

export interface RippleButtonProps {
  /** Button label content. Defaults to `"Click me"`. */
  children?: DomphyElement | DomphyElement[] | string;
  /** `button()` patch color tone for the button's own chrome. Defaults to `"primary"`. */
  color?: ThemeColor;
  /** Theme color family the ripple wave is drawn from. Defaults to `"neutral"`. */
  rippleColor?: ThemeColor;
  /** One ripple's grow-and-fade cycle, in milliseconds. Defaults to `600`. */
  duration?: number;
  onClick?: (event: MouseEvent) => void;
  disabled?: boolean;
  style?: StyleObject;
}

interface RippleInstance {
  id: string;
  /** Click offset from the button's own left edge, in px. */
  x: number;
  /** Click offset from the button's own top edge, in px. */
  y: number;
  /** Final rendered diameter, in px — large enough to cover the button from any origin. */
  size: number;
}

let rippleButtonInstanceCounter = 0;

/** Normalizes a `DomphyElement | DomphyElement[] | string` prop into the flat
 * `(string | DomphyElement)[]` shape `DomphyElement<T>`'s content field expects — a
 * bare single element isn't part of that type, only primitives/arrays/functions are. */
function asContent(
  value: DomphyElement | DomphyElement[] | string,
): (string | DomphyElement)[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * A themed button that spawns an expanding, fading circular ripple from the
 * exact click point every time it's pressed. Purely tactile — at rest it
 * looks like an ordinary button; the ripple only appears on interaction. Call
 * with no arguments for a working demo button.
 */
function rippleButton(props: RippleButtonProps = {}): DomphyElement<"button"> {
  const label = props.children ?? "Click me";
  const color = props.color ?? "primary";
  const rippleColor = props.rippleColor ?? "neutral";
  const duration = props.duration ?? 600;

  const instanceId = ++rippleButtonInstanceCounter;
  const rippleAnimationName = `ripple-button-wave-${hashString(
    JSON.stringify({ instanceId, duration }),
  )}`;
  const rippleKeyframes = {
    // Matches upstream's `rippling` keyframe: the wave flashes at full opacity
    // then fades to nothing (0%{opacity:1} -> 100%{opacity:0}).
    from: { transform: "translate(-50%, -50%) scale(0)", opacity: 1 },
    to: { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
  };

  const ripples = toState<RippleInstance[]>([], "ripples");
  let rippleIdCounter = 0;
  let pendingTimers: ReturnType<typeof setTimeout>[] = [];

  // `_doctorDisable` isn't part of core's strict `PartialElement` type — build through
  // an untyped literal, then assert, so the excess-property check doesn't fire (mirrors
  // `overlayCanvas` in confetti.ts).
  const rippleCircle = (ripple: RippleInstance): DomphyElement<"span"> =>
    ({
      span: null,
      _key: ripple.id,
      ariaHidden: "true",
      // Decorative wave with no text of its own — exempt from the missing-color contract.
      _doctorDisable: "missing-color",
      style: {
        position: "absolute",
        left: `${ripple.x}px`,
        top: `${ripple.y}px`,
        width: `${ripple.size}px`,
        height: `${ripple.size}px`,
        borderRadius: "50%",
        pointerEvents: "none",
        backgroundColor: (listener: Listener) =>
          themeColor(listener, "shift-0", rippleColor),
        animation: `${rippleAnimationName} ${duration}ms ease-out forwards`,
        [`@keyframes ${rippleAnimationName}`]: rippleKeyframes,
      } as StyleObject,
    }) as DomphyElement<"span">;

  const rippleLayer: DomphyElement<"span"> = {
    span: (listener: Listener) => ripples.get(listener).map(rippleCircle),
    ariaHidden: "true",
    style: { position: "absolute", inset: 0, pointerEvents: "none" },
  };

  const buttonElement: DomphyElement<"button"> = {
    button: [
      { span: asContent(label), style: { position: "relative", zIndex: 1 } },
      rippleLayer,
    ],
    type: "button",
    disabled: props.disabled,
    $: [button({ color })],
    style: {
      position: "relative",
      overflow: "hidden",
      ...(props.style ?? {}),
    } as StyleObject,
    onClick: (event: MouseEvent) => {
      const targetElement = event.currentTarget as HTMLElement | null;
      if (targetElement) {
        const boundingBox = targetElement.getBoundingClientRect();
        const width = boundingBox.width || targetElement.offsetWidth;
        const height = boundingBox.height || targetElement.offsetHeight;
        const size = Math.max(width, height, 1) * 2;
        const x = event.clientX - boundingBox.left;
        const y = event.clientY - boundingBox.top;
        const id = `ripple-${instanceId}-${++rippleIdCounter}`;

        ripples.set([...ripples.get(), { id, x, y, size }]);

        const cleanupTimer = setTimeout(() => {
          ripples.set(ripples.get().filter((entry) => entry.id !== id));
          pendingTimers = pendingTimers.filter(
            (timer) => timer !== cleanupTimer,
          );
        }, duration);
        pendingTimers.push(cleanupTimer);
      }
      props.onClick?.(event);
    },
    _onRemove: () => {
      pendingTimers.forEach(clearTimeout);
      pendingTimers = [];
    },
  };

  return buttonElement;
}

export { rippleButton };
