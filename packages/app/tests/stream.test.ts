// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineRoutes, type Route } from "../src/index";

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
    (0, eval)(swap!.textContent ?? "");

    const root = document.getElementById("domphy-app");
    expect(root?.textContent).toContain("Loaded data!");
    expect(root?.textContent).not.toContain("Loading stream...");
  });
});
