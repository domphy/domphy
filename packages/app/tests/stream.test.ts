// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  createApp,
  defineRoutes,
  type Route,
  redirect,
  rewrite,
} from "../src/index";

function streamRoutes(): Route[] {
  return defineRoutes([
    {
      path: "/",
      layout: (children) => ({ div: [{ header: "Shell Header" }, children] }),
      children: [
        {
          path: "slow",
          loader: () =>
            new Promise((resolve) => setTimeout(() => resolve("data!"), 40)),
          loading: () => ({ p: "Loading stream..." }),
          page: (context) => ({ h1: `Loaded ${context.data}` }),
        },
      ],
    },
  ]);
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value));
  }
  return chunks;
}

afterEach(() => {
  document.documentElement.innerHTML = "<head></head><body></body>";
});

describe("renderToStream", () => {
  it("returns the stream and flushes the shell before loaders settle", async () => {
    let resolveLoader!: (value: string) => void;
    const held = new Promise<string>((resolve) => {
      resolveLoader = resolve;
    });
    const routes = defineRoutes([
      {
        path: "/",
        layout: (children) => ({ div: [{ header: "Shell Header" }, children] }),
        children: [
          {
            path: "slow",
            loader: () => held,
            loading: () => ({ p: "Loading stream..." }),
            page: (context) => ({ h1: `Loaded ${context.data}` }),
          },
        ],
      },
    ]);
    const app = createApp(routes, { history: null });
    // Must resolve while `held` is still pending — otherwise the first byte
    // is blocked on the loader, which is the TTFB contract of renderToStream.
    const { stream, status } = await app.renderToStream("/slow");
    expect(status).toBe(200);

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const first = decoder.decode((await reader.read()).value);

    // Shell flushes first: header + loading fallback, no content yet.
    expect(first).toContain("Shell Header");
    expect(first).toContain("Loading stream...");
    expect(first).not.toContain("Loaded data!");

    resolveLoader("data!");

    let rest = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      rest += decoder.decode(value);
    }
    // Content + hydration data stream after the loader settles.
    expect(rest).toContain("Loaded data!");
    expect(rest).toContain("__DOMPHY_APP_DATA__");
    expect(rest).toContain('id="domphy-content"');
  });

  it("the streamed swap script replaces the shell with the content", async () => {
    const app = createApp(streamRoutes(), { history: null });
    const { stream } = await app.renderToStream("/slow");
    const html = (await collect(stream)).join("");

    document.documentElement.innerHTML = html
      .replace(/^<!DOCTYPE html><html>/i, "")
      .replace(/<\/html>$/i, "");

    // Run the inline swap script that the stream emitted.
    const swap = Array.from(document.querySelectorAll("script")).find((tag) =>
      tag.textContent?.includes("domphy-content"),
    );
    expect(swap).toBeTruthy();
    // biome-ignore lint/security/noGlobalEval: executing the framework's own emitted swap script under test
    // biome-ignore lint/complexity/noCommaOperator: the (0, eval) comma idiom forces indirect (global-scope) eval
    (0, eval)(swap!.textContent ?? "");

    const root = document.getElementById("domphy-app");
    expect(root?.textContent).toContain("Loaded data!");
    expect(root?.textContent).not.toContain("Loading stream...");
  });

  it("runs per-route middleware, like transition()/renderToString()", async () => {
    let ran = false;
    const routes = defineRoutes([
      {
        path: "/",
        children: [
          {
            path: "admin",
            middleware: [
              () => {
                ran = true;
              },
            ],
            page: () => ({ h1: "Admin" }),
          },
        ],
      },
    ]);
    const app = createApp(routes, { history: null });
    const { stream } = await app.renderToStream("/admin");
    await collect(stream);
    expect(ran).toBe(true);
  });

  it("resolves gracefully (does not reject) when global middleware redirects", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        children: [
          {
            path: "go",
            page: () => ({ h1: "Go" }),
          },
          { path: "about", page: () => ({ h1: "About" }) },
        ],
      },
    ]);
    const app = createApp(routes, {
      history: null,
      middleware: [
        (context) => {
          if (context.pathname === "/go") redirect("/about");
        },
      ],
    });

    const {
      stream,
      status,
      redirect: target,
    } = await app.renderToStream("/go");
    expect(status).toBe(307);
    expect(target).toBe("/about");

    const body = (await collect(stream)).join("");
    expect(body).not.toContain("Go");
  });

  it("swaps in the error block when content generation fails mid-stream", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        children: [
          {
            path: "fragile",
            loader: () =>
              new Promise((resolve) => setTimeout(() => resolve("x"), 20)),
            loading: () => ({ p: "Loading fragile..." }),
            page: () => {
              throw new Error("page exploded");
            },
          },
        ],
      },
    ]);
    const app = createApp(routes, {
      history: null,
      error: (error) => ({ h1: `Stream error: ${error.message}` }),
    });
    const { stream, status } = await app.renderToStream("/fragile");
    // The shell already flushed with a 200; the error can only arrive as a chunk.
    expect(status).toBe(200);

    const body = (await collect(stream)).join("");
    expect(body).toContain("Loading fragile...");
    // The stream closes normally with an error chunk, not a truncated document.
    expect(body).toContain('id="domphy-content"');
    expect(body).toContain("Stream error: page exploded");
    expect(body).toContain("</body></html>");
  });

  it("streams a client redirect when a loader redirects after the shell", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        children: [
          {
            path: "private",
            loader: () => redirect("/about"),
            page: () => ({ h1: "Private" }),
          },
          { path: "about", page: () => ({ h1: "About" }) },
        ],
      },
    ]);
    const app = createApp(routes, { history: null });
    const {
      stream,
      status,
      redirect: target,
    } = await app.renderToStream("/private");
    // Shell already committed as 200; HTTP status cannot reflect the loader.
    expect(status).toBe(200);
    expect(target).toBeUndefined();

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const first = decoder.decode((await reader.read()).value);
    expect(first).toContain("domphy-app");
    expect(first).not.toContain("Private");
    expect(first).not.toContain("location.replace");

    let rest = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      rest += decoder.decode(value);
    }
    expect(rest).toContain('location.replace("/about")');
    expect(rest).not.toContain("Private");
  });

  it("streams a client redirect when a slot loader redirects after the shell", async () => {
    const routes = defineRoutes([
      {
        path: "dash",
        layout: (children, _context, slots) => ({
          div: [slots.panel ?? { span: "" }, children],
        }),
        slots: {
          panel: [
            {
              path: "",
              loader: () => redirect("/about"),
              page: () => ({ span: "panel" }),
            },
          ],
        },
        children: [{ path: "", page: () => ({ h1: "Dash" }) }],
      },
      { path: "about", page: () => ({ h1: "About" }) },
    ]);
    const app = createApp(routes, { history: null });
    const {
      stream,
      status,
      redirect: target,
    } = await app.renderToStream("/dash");
    expect(status).toBe(200);
    expect(target).toBeUndefined();

    const body = (await collect(stream)).join("");
    expect(body).toContain('location.replace("/about")');
    expect(body).not.toContain("panel");
  });

  it("fails with an actionable error on route-middleware rewrite loops", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        children: [
          {
            path: "a",
            middleware: [() => rewrite("/b")],
            page: () => ({ h1: "A" }),
          },
          {
            path: "b",
            middleware: [() => rewrite("/a")],
            page: () => ({ h1: "B" }),
          },
        ],
      },
    ]);
    const app = createApp(routes, { history: null });
    const { stream, status } = await app.renderToStream("/a");
    expect(status).toBe(500);

    const body = (await collect(stream)).join("");
    expect(body).toContain("Rewrite loop detected");
  });

  // HTML Standard 4.2.5.5: a document must declare its encoding inside the
  // first 1024 bytes when the transport does not; WCAG 3.1.1 requires the
  // page language. renderToStream emits the <html>/<head> itself, so both are
  // its responsibility, not the caller's.
  it("emits a charset declaration and html lang (HTML Standard 4.2.5.5, WCAG 3.1.1)", async () => {
    const app = createApp(streamRoutes(), { history: null });
    const first = (
      await collect((await app.renderToStream("/slow")).stream)
    )[0];
    expect(first.indexOf('<meta charset="utf-8">')).toBeLessThan(1024);
    expect(first).toContain('<html lang="en">');

    const vietnamese = await app.renderToStream("/slow", { lang: "vi" });
    expect((await collect(vietnamese.stream))[0]).toContain('<html lang="vi">');
  });

  // renderToString answers an unexpected failure with a 500 page; a streaming
  // host must not additionally have to catch what the buffered path handles.
  it("answers a throwing middleware with a 500 shell, like renderToString", async () => {
    const app = createApp(streamRoutes(), {
      history: null,
      middleware: [
        () => {
          throw new Error("upstream down");
        },
      ],
    });
    const { stream, status } = await app.renderToStream("/slow");
    expect(status).toBe(500);
    expect((await collect(stream)).join("")).toContain("Application error");
  });

  // A path whose percent-encoding cannot be decoded matches nothing; before
  // the matcher guarded the decode it threw URIError out of renderToStream.
  it("answers 404 for an invalid percent-escape instead of throwing", async () => {
    const app = createApp(streamRoutes(), { history: null });
    const { status } = await app.renderToStream("/%E0%A4%A");
    expect(status).toBe(404);
  });
});
