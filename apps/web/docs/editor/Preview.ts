import { type DomphyElement, ElementNode, type State } from "@domphy/core";
import { moduleMap } from "./Modules";
import { Render } from "./Render.js";
import { stringify } from "./stringify.js";
import { transformCode } from "./transformCode.js";

export const PREVIEW_SANDBOX = "allow-scripts allow-same-origin";

function createSandboxFrame(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", PREVIEW_SANDBOX);
  iframe.setAttribute("title", "Playground preview sandbox");
  iframe.setAttribute("hidden", "");
  iframe.setAttribute("aria-hidden", "true");
  return iframe;
}

/**
 * Evaluates transformed playground source in `realm` (the iframe window).
 * Caller must pass the iframe window — never the parent.
 */
export function evaluatePlaygroundCode(
  compiled: string,
  modules: Record<string, unknown>,
  realm: Window,
): unknown {
  const fn = realm.Function("__modules__", compiled);
  return fn(modules);
}

export function Preview(
  code: State<string>,
  isDark: State<boolean>,
  hasGrid: State<boolean>,
  error: State<string>,
  shadowHost: HTMLElement,
  previewContainer: HTMLElement,
  onLog?: (line: string) => void,
): DomphyElement<"div"> {
  return {
    div: [],
    _onMount: (node) => {
      const dom = node.domElement as HTMLElement;
      dom.appendChild(shadowHost);
      const iframe = createSandboxFrame();
      dom.appendChild(iframe);
      const realm = iframe.contentWindow;
      if (!realm) {
        error.set("preview sandbox unavailable");
        return;
      }
      const originalLog = realm.console.log.bind(realm.console);
      realm.console.log = (...args: unknown[]) => {
        originalLog(...args);
        onLog?.(args.map((arg) => stringify(arg)).join(" "));
      };
      let newNode: ElementNode | null = null;

      const update = (val: string) => {
        previewContainer.textContent = "";
        try {
          if (newNode) newNode.remove();
          const el = evaluatePlaygroundCode(
            transformCode(val),
            moduleMap,
            realm,
          );
          if (!el) return;
          newNode = new ElementNode(
            Render(el as DomphyElement, isDark, hasGrid),
          );
          newNode.render(previewContainer);
        } catch (e: any) {
          error.set(e.message);
        }
      };
      update(code.get());
      code.addListener(update);
    },
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
    },
  };
}
