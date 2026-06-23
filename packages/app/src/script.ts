import type { DomphyElement } from "@domphy/core";

export interface ScriptProps {
  src: string;
  /**
   * Loading strategy, like `next/script`:
   * `"afterInteractive"` loads as soon as the element mounts (default),
   * `"lazyOnload"` waits for the window `load` event plus idle time.
   */
  strategy?: "afterInteractive" | "lazyOnload";
  id?: string;
  async?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

const loadedScripts = new Set<string>();

function whenIdle(callback: () => void): void {
  const idle = (
    globalThis as { requestIdleCallback?: (cb: () => void) => void }
  ).requestIdleCallback;
  if (idle) {
    idle(callback);
  } else {
    setTimeout(callback, 0);
  }
}

/**
 * Block that loads an external script once, the equivalent of `next/script`.
 * Place it anywhere in the tree; duplicate sources are loaded only once.
 */
export function script(props: ScriptProps): DomphyElement<"script"> {
  const {
    src,
    strategy = "afterInteractive",
    id,
    async = true,
    onLoad,
    onError,
  } = props;
  const dedupeKey = id ?? src;

  const start = (element: HTMLScriptElement) => {
    if (loadedScripts.has(dedupeKey)) return;
    loadedScripts.add(dedupeKey);
    element.src = src;
  };

  const part: DomphyElement<"script"> = {
    script: "",
    async,
    onLoad: () => onLoad?.(),
    onError: () => onError?.(),
    _onMount: (node) => {
      const element = node.domElement as HTMLScriptElement;
      if (strategy === "afterInteractive") {
        start(element);
        return;
      }
      if (document.readyState === "complete") {
        whenIdle(() => start(element));
      } else {
        window.addEventListener("load", () => whenIdle(() => start(element)), {
          once: true,
        });
      }
    },
  };
  if (id !== undefined) part.id = id;
  return part;
}
