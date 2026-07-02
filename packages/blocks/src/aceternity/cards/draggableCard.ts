// Aceternity UI "Draggable Card" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// Polaroid-style photo cards, each at a fixed random tilt, that can be
// dragged around a bounded area with velocity-driven tilt while dragging and
// a spring settle (slight overshoot) on release.
//
// Drag is plain Pointer Events (`onPointerDown` declaratively, then
// `pointermove`/`pointerup` on `window` for the duration of the drag — the
// same "continuous, purely visual, cursor-following effect stays imperative"
// tradeoff smoothCursor.ts makes) writing directly to `left`/`top`/`transform`
// so the card tracks the cursor with zero lag while held. Only the release
// phase runs a spring-damper simulation (same formula as smoothCursor.ts's
// `step`, applied to position AND rotation independently) so the card
// coasts to rest with a small bounce instead of snapping.
//
// Each card's initial tilt is a deterministic pseudo-random angle derived
// from its index (`pseudoRandomAngle`), generated once and reused — never
// re-randomized on re-render, so cards don't visibly jump.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { small } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface DraggableCardItem {
  id: string;
  /** Photo source. Defaults to a themed gradient placeholder when omitted. */
  imageSrc?: string;
  caption: string;
}

export interface DraggableCardProps {
  cards?: DraggableCardItem[];
  onDragEnd?: (id: string, position: { x: number; y: number }) => void;
  style?: StyleObject;
}

interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

const POSITION_SPRING: SpringConfig = { stiffness: 260, damping: 24, mass: 1 };
const ROTATION_SPRING: SpringConfig = { stiffness: 220, damping: 18, mass: 1 };
const REST_DELTA = 0.01;
const HOVER_SCALE = 1.04;
const DRAG_SCALE = 1.06;
const MAX_DRAG_TILT_DEG = 22;
const TILT_LAG = 0.25; // fraction of the way the rendered angle catches up to the target angle each pointermove
const EDGE_RESISTANCE = 0.35; // fraction of out-of-bounds distance still applied while dragging (rubber-band)
const CARD_WIDTH_UNITS = 44;

const DEFAULT_CARDS: DraggableCardItem[] = [
  { id: "polaroid-1", caption: "Prague, 2024" },
  { id: "polaroid-2", caption: "Kyoto, 2023" },
  { id: "polaroid-3", caption: "Lisbon, 2022" },
];

const PLACEHOLDER_COLORS: ThemeColor[] = ["primary", "secondary", "info", "success", "attention"];

/** Deterministic pseudo-random angle in [-12, 12] degrees, stable per `seed`. */
function pseudoRandomAngle(seed: number): number {
  const fractional = Math.sin(seed * 12.9898) * 43758.5453;
  const unitInterval = fractional - Math.floor(fractional);
  return (unitInterval - 0.5) * 24;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rubber-band clamp: fully free within [min, max], increasingly resistant beyond it. */
function clampWithResistance(value: number, min: number, max: number): number {
  if (value < min) return min - (min - value) * (1 - EDGE_RESISTANCE);
  if (value > max) return max + (value - max) * (1 - EDGE_RESISTANCE);
  return value;
}

function placeholderPhoto(index: number): DomphyElement<"div"> {
  const familyColor = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  const element = {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      width: "100%",
      aspectRatio: "1 / 1",
      borderRadius: themeSpacing(1),
      backgroundImage: (listener: Listener) =>
        `linear-gradient(135deg, ${themeColor(listener, "shift-6", familyColor)}, ${themeColor(listener, "shift-11", familyColor)})`,
    },
  };
  return element as DomphyElement<"div">;
}

/**
 * Polaroid-style photo cards, each with a fixed random tilt, freely
 * draggable within a bounded area and released with a small spring bounce.
 * Call with no arguments for a working demo — 3 generic placeholder photos.
 */
function draggableCard(props: DraggableCardProps = {}): DomphyElement<"div"> {
  const cards = props.cards && props.cards.length > 0 ? props.cards : DEFAULT_CARDS;

  let containerElement: HTMLElement | null = null;
  const cardElements: (HTMLElement | null)[] = cards.map(() => null);
  const baseAngles = cards.map((_item, index) => pseudoRandomAngle(index + 1));
  const angles = [...baseAngles];
  const positions = cards.map(() => ({ x: 0, y: 0 }));
  const dragging = cards.map(() => false);
  const hovered = cards.map(() => false);
  const settleFrameHandles: (number | null)[] = cards.map(() => null);

  const applyTransform = (index: number) => {
    const element = cardElements[index];
    if (!element) return;
    const scale = dragging[index] ? DRAG_SCALE : hovered[index] ? HOVER_SCALE : 1;
    element.style.left = `${positions[index].x}px`;
    element.style.top = `${positions[index].y}px`;
    element.style.transform = `rotate(${angles[index].toFixed(2)}deg) scale(${scale})`;
    element.style.zIndex = dragging[index] ? String(100 + index) : String(index);
  };

  const stopSettleLoop = (index: number) => {
    const handle = settleFrameHandles[index];
    if (handle !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(handle);
    settleFrameHandles[index] = null;
  };

  /** Spring-damper release: eases position toward `(targetX, targetY)` and rotation toward `targetAngle`, with a slight overshoot before settling. */
  const startSettleSpring = (index: number, targetX: number, targetY: number, targetAngle: number) => {
    stopSettleLoop(index);
    let velocityX = 0;
    let velocityY = 0;
    let velocityAngle = 0;
    let lastTime = typeof performance !== "undefined" ? performance.now() : Date.now();

    const step = (time: number) => {
      const deltaSeconds = Math.min((time - lastTime) / 1000, 1 / 30);
      lastTime = time;

      const positionX = positions[index].x;
      const positionY = positions[index].y;
      const accelerationX = (-POSITION_SPRING.stiffness * (positionX - targetX) - POSITION_SPRING.damping * velocityX) / POSITION_SPRING.mass;
      const accelerationY = (-POSITION_SPRING.stiffness * (positionY - targetY) - POSITION_SPRING.damping * velocityY) / POSITION_SPRING.mass;
      velocityX += accelerationX * deltaSeconds;
      velocityY += accelerationY * deltaSeconds;
      positions[index] = { x: positionX + velocityX * deltaSeconds, y: positionY + velocityY * deltaSeconds };

      const accelerationAngle =
        (-ROTATION_SPRING.stiffness * (angles[index] - targetAngle) - ROTATION_SPRING.damping * velocityAngle) / ROTATION_SPRING.mass;
      velocityAngle += accelerationAngle * deltaSeconds;
      angles[index] += velocityAngle * deltaSeconds;

      applyTransform(index);

      const settled =
        Math.abs(targetX - positions[index].x) < REST_DELTA &&
        Math.abs(targetY - positions[index].y) < REST_DELTA &&
        Math.abs(targetAngle - angles[index]) < REST_DELTA &&
        Math.hypot(velocityX, velocityY) < REST_DELTA &&
        Math.abs(velocityAngle) < REST_DELTA;

      if (settled) {
        positions[index] = { x: targetX, y: targetY };
        angles[index] = targetAngle;
        applyTransform(index);
        settleFrameHandles[index] = null;
        return;
      }
      settleFrameHandles[index] = requestAnimationFrame(step);
    };
    settleFrameHandles[index] = requestAnimationFrame(step);
  };

  const startDrag = (event: PointerEvent, index: number) => {
    if (!containerElement || typeof window === "undefined") return;
    event.preventDefault();
    stopSettleLoop(index);
    dragging[index] = true;
    applyTransform(index);

    const cardElement = cardElements[index];
    const containerRect = containerElement.getBoundingClientRect();
    // `getBoundingClientRect()` can transiently report an all-zero rect (not
    // yet laid out, or a headless/test DOM with no real layout engine) — fall
    // back to `clientWidth`/`clientHeight` rather than collapsing the drag
    // bounds to a single point.
    const containerWidth = containerRect.width || containerElement.clientWidth || 480;
    const containerHeight = containerRect.height || containerElement.clientHeight || 320;
    const cardWidth = cardElement?.offsetWidth || 176;
    const cardHeight = cardElement?.offsetHeight || 220;
    const minX = 0;
    const minY = 0;
    const maxX = Math.max(0, containerWidth - cardWidth);
    const maxY = Math.max(0, containerHeight - cardHeight);

    const startPointerX = event.clientX;
    const startPointerY = event.clientY;
    const startX = positions[index].x;
    const startY = positions[index].y;
    let lastX = startX;
    let lastTime = typeof performance !== "undefined" ? performance.now() : Date.now();

    const handleMove = (moveEvent: PointerEvent) => {
      const rawX = startX + (moveEvent.clientX - startPointerX);
      const rawY = startY + (moveEvent.clientY - startPointerY);
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const deltaTime = Math.max(1, now - lastTime);
      const instantVelocityX = ((rawX - lastX) / deltaTime) * 16; // approx px per animation frame
      lastX = rawX;
      lastTime = now;

      positions[index] = {
        x: clampWithResistance(rawX, minX, maxX),
        y: clampWithResistance(rawY, minY, maxY),
      };
      const targetAngle = baseAngles[index] + clamp(instantVelocityX * 1.6, -MAX_DRAG_TILT_DEG, MAX_DRAG_TILT_DEG);
      angles[index] += (targetAngle - angles[index]) * TILT_LAG;
      applyTransform(index);
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      dragging[index] = false;
      const clampedX = clamp(positions[index].x, minX, maxX);
      const clampedY = clamp(positions[index].y, minY, maxY);
      startSettleSpring(index, clampedX, clampedY, baseAngles[index]);
      props.onDragEnd?.(cards[index].id, { x: clampedX, y: clampedY });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const cardTrees: DomphyElement<"div">[] = cards.map((item, index) => {
    const media = item.imageSrc
      ? ({
          img: null,
          src: item.imageSrc,
          alt: item.caption,
          style: { width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", borderRadius: themeSpacing(1) },
        } as DomphyElement<"img">)
      : placeholderPhoto(index);

    return {
      div: [media, { small: item.caption, $: [small({ color: "neutral" })] }],
      _key: item.id,
      ariaLabel: item.caption,
      dataTone: "shift-1",
      onPointerDown: (event: PointerEvent) => startDrag(event, index),
      onMouseEnter: () => {
        hovered[index] = true;
        if (!dragging[index]) applyTransform(index);
      },
      onMouseLeave: () => {
        hovered[index] = false;
        if (!dragging[index]) applyTransform(index);
      },
      _onMount: (node: ElementNode) => {
        const element = node.domElement as HTMLElement;
        cardElements[index] = element;
        // Container mounts before its children (see lens.ts's note on mount
        // ordering), so `containerElement` is already assigned by now — scatter
        // this card into an initial stacked position using its own now-available
        // rendered size.
        const containerWidth = containerElement?.clientWidth || 480;
        const containerHeight = containerElement?.clientHeight || 320;
        const cardWidth = element.offsetWidth || 176;
        const cardHeight = element.offsetHeight || 220;
        const stackStep = (index - (cards.length - 1) / 2) * 28;
        positions[index] = {
          x: clamp((containerWidth - cardWidth) / 2 + stackStep, 0, Math.max(0, containerWidth - cardWidth)),
          y: clamp((containerHeight - cardHeight) / 2 + stackStep * 0.6, 0, Math.max(0, containerHeight - cardHeight)),
        };
        applyTransform(index);
      },
      _onRemove: () => {
        stopSettleLoop(index);
        cardElements[index] = null;
      },
      style: {
        position: "absolute",
        insetBlockStart: 0,
        insetInlineStart: 0,
        width: themeSpacing(CARD_WIDTH_UNITS),
        padding: themeSpacing(2),
        paddingBlockEnd: themeSpacing(5),
        borderRadius: themeSpacing(1),
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
        backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
        color: (listener: Listener) => themeColor(listener, "shift-9"),
        boxShadow: (listener: Listener) => `0 ${themeSpacing(3)} ${themeSpacing(6)} ${themeColor(listener, "shift-4", "neutral")}`,
        willChange: "transform, left, top",
      } as StyleObject,
    } as DomphyElement<"div">;
  });

  return {
    div: cardTrees,
    dataTone: "shift-1",
    _onMount: (node: ElementNode) => {
      containerElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      containerElement = null;
      cards.forEach((_item, index) => stopSettleLoop(index));
    },
    style: {
      position: "relative",
      height: themeSpacing(88),
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { draggableCard };
