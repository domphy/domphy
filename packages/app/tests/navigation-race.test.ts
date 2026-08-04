// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createMemoryHistory,
  type DomphyApp,
  defineRoutes,
  type Metadata,
  type Route,
} from "../src/index";

const flush = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("navigation races", () => {
  let app: DomphyApp;
  let container: HTMLElement;
  let slowMetadata: ReturnType<typeof deferred<Metadata>>;

  function buildRoutes(): Route[] {
    return defineRoutes([
      {
        path: "/",
        page: () => ({ h1: "Home" }),
        metadata: { title: "Home" },
        children: [
          {
            path: "slow-meta",
            page: () => ({ h1: "Slow" }),
            // Async metadata (the generateMetadata shape) that this test
            // resolves manually, after a newer navigation has committed.
            metadata: () => slowMetadata.promise,
          },
        ],
      },
    ]);
  }

  beforeEach(() => {
    slowMetadata = deferred<Metadata>();
    vi.stubGlobal("scrollTo", () => {});
  });

  afterEach(() => {
    app?.destroy();
    container?.remove();
    vi.unstubAllGlobals();
    document.head.innerHTML = "";
  });

  it("a superseded navigation never applies its metadata or head tags", async () => {
    app = createApp(buildRoutes(), { history: createMemoryHistory("/") });
    container = document.createElement("div");
    document.body.appendChild(container);
    await app.render(container);
    await flush();
    expect(document.title).toBe("Home");

    // Navigate to the route whose metadata function stays pending...
    const staleNavigation = app.router.push("/slow-meta");
    await flush();
    // ...then navigate back before it resolves; the newer navigation wins.
    await app.router.push("/");
    await flush();
    expect(document.title).toBe("Home");

    // Now the stale navigation's metadata promise resolves, after it lost
    // the race. Its title must NOT reach the document or the router state.
    slowMetadata.resolve({ title: "Slow Page" });
    await staleNavigation;
    await flush();

    expect(document.title).toBe("Home");
    expect(app.router.metadata.title).toBe("Home");
    expect(app.router.getMatch()?.route.id).toBe("/");
    expect(app.router.state.get("pathname")).toBe("/");
  });
});
