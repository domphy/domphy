// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineRoutes, type Route, redirect } from "../src/index";

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
  it("flushes the shell before the resolved content", async () => {
    const app = createApp(streamRoutes(), { history: null });
    const { stream, status } = await app.renderToStream("/slow");
    expect(status).toBe(200);

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const first = decoder.decode((await reader.read()).value);

    // Shell flushes first: header + loading fallback, no content yet.
    expect(first).toContain("Shell Header");
    expect(first).toContain("Loading stream...");
    expect(first).not.toContain("Loaded data!");

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
});
