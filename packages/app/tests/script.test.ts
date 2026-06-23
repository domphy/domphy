// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { script } from "../src/script";

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Drives a `script()` block's lifecycle directly: `script()` returns an element
 * whose tag is `script` (intentionally absent from core's renderable HtmlTags
 * allowlist, so it cannot be rendered through `ElementNode`). The strategy and
 * dedupe logic all live in `_onMount`, which we invoke against a real jsdom
 * `<script>` element wrapped in a minimal node stub.
 */
function runMount(part: ReturnType<typeof script>): HTMLScriptElement {
  const element = document.createElement("script");
  const onMount = (part as { _onMount?: (node: unknown) => void })._onMount;
  onMount?.({ domElement: element });
  return element;
}

describe("script", () => {
  it("carries async and id onto the element part", () => {
    const part = script({
      src: "https://example.test/with-id.js",
      id: "analytics",
      async: false,
    });
    expect(part.async).toBe(false);
    expect((part as { id?: string }).id).toBe("analytics");
  });

  it("afterInteractive sets src synchronously on mount", () => {
    const element = runMount(script({ src: "https://example.test/after.js" }));
    expect(element.src).toBe("https://example.test/after.js");
  });

  it("lazyOnload defers src until after load + idle", async () => {
    const element = runMount(
      script({
        src: "https://example.test/lazy.js",
        strategy: "lazyOnload",
      }),
    );
    // jsdom reports readyState "complete", so the script waits for the idle
    // callback (setTimeout(0) fallback) rather than setting src synchronously.
    expect(element.src).toBe("");
    await tick(0);
    expect(element.src).toBe("https://example.test/lazy.js");
  });

  it("lazyOnload waits for the window load event when not yet complete", async () => {
    // Force a non-complete readyState so the block subscribes to `load`.
    const originalReadyState = Object.getOwnPropertyDescriptor(
      document,
      "readyState",
    );
    Object.defineProperty(document, "readyState", {
      configurable: true,
      get: () => "loading",
    });

    const element = runMount(
      script({
        src: "https://example.test/lazy-load.js",
        strategy: "lazyOnload",
      }),
    );
    expect(element.src).toBe("");

    window.dispatchEvent(new Event("load"));
    await tick(0);
    expect(element.src).toBe("https://example.test/lazy-load.js");

    if (originalReadyState) {
      Object.defineProperty(document, "readyState", originalReadyState);
    }
  });

  it("loads a duplicate source only once (dedupe by src)", () => {
    const src = "https://example.test/dedupe-src.js";
    const first = runMount(script({ src }));
    expect(first.src).toBe(src);

    // A second mount with the same src is deduped: its src is never assigned.
    const second = runMount(script({ src }));
    expect(second.src).toBe("");
  });

  it("dedupes by id even when the src differs", () => {
    const first = runMount(
      script({ src: "https://example.test/a.js", id: "shared-id" }),
    );
    expect(first.src).toBe("https://example.test/a.js");

    const second = runMount(
      script({ src: "https://example.test/b.js", id: "shared-id" }),
    );
    // Same dedupe key (id) means the second source is never loaded.
    expect(second.src).toBe("");
  });
});
