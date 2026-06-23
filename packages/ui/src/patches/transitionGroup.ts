import { ElementNode, type PartialElement } from "@domphy/core";

type RectMap = Map<string, DOMRect>;

function getItemId(node: ElementNode, index: number): string {
  if (node.key !== undefined && node.key !== null) {
    return String(node.key);
  }
  return `index-${index}`;
}

/**
 * Animates child reordering using the FLIP technique: records each child's
 * position before an update and smoothly transitions it from its old to new
 * position afterward. No host tag check; applied to the list container.
 *
 * @param props.duration - Transition duration in milliseconds. Optional. Defaults to `300`.
 * @param props.delay - Transition delay in milliseconds. Optional. Defaults to `0`.
 * @example { ul: null, $: [transitionGroup({ duration: 300 })] }
 */
function transitionGroup(
  props: { duration?: number; delay?: number } = {},
): PartialElement {
  const { duration = 300, delay = 0 } = props;

  let previousRects: RectMap = new Map();
  // Cancels any in-flight animation for a given DOM element before starting a new one.
  const cancelMap = new Map<HTMLElement, () => void>();
  // Pending fallback timers and queued rAF callbacks, tracked so a removal of
  // the container mid-animation can clear them instead of firing on a detached node.
  const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
  const pendingFrames = new Set<number>();

  return {
    _onMount: (node) => {
      node.addHook("Remove", () => {
        // Stop every in-flight animation: removes transitionend listeners.
        for (const cancel of Array.from(cancelMap.values())) cancel();
        cancelMap.clear();
        // Clear queued fallback timers.
        for (const timer of pendingTimers) clearTimeout(timer);
        pendingTimers.clear();
        // Cancel queued animation frames.
        for (const frame of pendingFrames) cancelAnimationFrame(frame);
        pendingFrames.clear();
      });
    },
    _onBeforeUpdate: (node) => {
      previousRects = new Map();
      node.children.items.forEach((item, index) => {
        if (!(item instanceof ElementNode)) return;
        const dom = item.domElement as HTMLElement | undefined;
        if (!dom) return;
        previousRects.set(getItemId(item, index), dom.getBoundingClientRect());
      });
    },
    _onUpdate: (node) => {
      node.children.items.forEach((item, index) => {
        if (!(item instanceof ElementNode)) return;
        const dom = item.domElement as HTMLElement | undefined;
        if (!dom) return;

        const key = getItemId(item, index);
        const prev = previousRects.get(key);
        if (!prev) return;

        const next = dom.getBoundingClientRect();
        const deltaX = prev.left - next.left;
        const deltaY = prev.top - next.top;
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

        // Cancel any in-flight animation on this element before starting a new one.
        cancelMap.get(dom)?.();

        dom.style.transition = "none";
        dom.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        dom.getBoundingClientRect();

        const frame = requestAnimationFrame(() => {
          pendingFrames.delete(frame);
          dom.style.transition = `transform ${duration}ms ease ${delay}ms`;
          dom.style.transform = "translate(0px, 0px)";
        });
        pendingFrames.add(frame);

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const finish = () => {
          if (cancelled) return;
          cancelled = true;
          if (timer) {
            pendingTimers.delete(timer);
            timer = null;
          }
          cancelMap.delete(dom);
          dom.removeEventListener("transitionend", onEnd);
          dom.style.transition = "";
          dom.style.transform = "";
        };

        const onEnd = (event: Event) => {
          if ((event as TransitionEvent).propertyName === "transform") finish();
        };

        cancelMap.set(dom, () => {
          cancelled = true;
          if (timer) {
            clearTimeout(timer);
            pendingTimers.delete(timer);
            timer = null;
          }
          cancelMap.delete(dom);
          dom.removeEventListener("transitionend", onEnd);
        });

        dom.addEventListener("transitionend", onEnd);
        timer = setTimeout(finish, duration + delay + 34);
        pendingTimers.add(timer);
      });
      previousRects.clear();
    },
  };
}

export { transitionGroup };
