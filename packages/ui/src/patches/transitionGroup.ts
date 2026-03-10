import { ElementNode, PartialElement } from "@domphy/core";

type RectMap = Map<string, DOMRect>;

function getItemId(node: ElementNode, index: number): string {
    if (node.key !== undefined && node.key !== null) {
        return String(node.key);
    }
    return `index-${index}`;
}

function transitionGroup(props: { duration?: number; delay?: number } = {}): PartialElement {
    const {
        duration = 300,
        delay = 0,
    } = props;

    let previousRects: RectMap = new Map();

    return {
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

                const previousTransition = dom.style.transition;
                const previousTransform = dom.style.transform;

                dom.style.transition = "none";
                dom.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                dom.getBoundingClientRect();

                requestAnimationFrame(() => {
                    dom.style.transition = `transform ${duration}ms ease ${delay}ms`;
                    dom.style.transform = "translate(0px, 0px)";
                });

                const cleanup = () => {
                    dom.style.transition = previousTransition;
                    dom.style.transform = previousTransform;
                    dom.removeEventListener("transitionend", onEnd);
                };

                const onEnd = (event: Event) => {
                    const transitionEvent = event as TransitionEvent;
                    if (transitionEvent.propertyName === "transform") {
                        cleanup();
                    }
                };

                dom.addEventListener("transitionend", onEnd);
                setTimeout(cleanup, duration + delay + 34);
            });
            previousRects.clear();
        },
    };
}


export { transitionGroup };
