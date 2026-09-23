// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createApp, defineRoutes, type Route } from "../src/index";

// Node ids are handed out by the ROOT of each tree, not by a module-global
// counter with a per-request reset. The truth these tests hold it to:
//
//  a. Within one served document every generated id is unique — that is the
//     HTML requirement (an id must be unique in its tree) and what
//     `aria-controls` depends on to point at one element.
//  b. A server render and the client that hydrates it compute the SAME ids,
//     because both build the same nodes in the same order.
//
// The reason for (a) being a real risk: renderToStream() flushes its shell,
// AWAITS the loaders, then builds its content root. With a global counter, a
// second request resetting it during that await made the content root re-issue
// the ids its own shell had already used.

// Only the ids DERIVED from nodeId. @domphy/ui builds them exactly this way
// (`domphy-popover-${node.nodeId}`, menu/tab item ids, the `aria-controls`
// that points at them); the framework's own fixed ids (`domphy-app`,
// `domphy-content`) carry no counter and would make these assertions vacuous.
function idsIn(html: string): string[] {
  return Array.from(html.matchAll(/\sid="(w-[^"]+)"/g)).map(
    (match) => match[1],
  );
}

function duplicates(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

// `_onSchedule` runs after the node has taken its id and before its element is
// merged, which is where a patch stamps a nodeId-derived DOM id — the same
// thing @domphy/ui's popover/menu/tabs do.
const widget = (content: unknown) => ({
  div: content,
  _onSchedule: (node: { nodeId: string }, element: Record<string, unknown>) => {
    element.id = `w-${node.nodeId}`;
  },
});

// A page with several id-bearing nodes per route so the counters overlap.
function panel(name: string) {
  return {
    section: [
      widget({ h2: name }),
      widget({ p: `body of ${name}` }),
      widget({ ul: [{ li: "one" }, { li: "two" }] }),
    ],
  };
}

function idRoutes(): Route[] {
  return defineRoutes([
    {
      path: "/",
      layout: (children) => ({
        div: [
          widget({ header: "shell" }),
          widget({ nav: [{ a: "home" }] }),
          children,
        ],
      }),
      children: [
        // The slow route's content root is built long after its shell, so
        // another request renders entirely inside that window.
        ...["slow", "fast", "a", "b", "c", "d", "e", "f", "hello", "noise"].map(
          (slug) => ({
            path: slug,
            loader: async () => {
              await new Promise((resolve) =>
                setTimeout(resolve, slug === "slow" ? 60 : 5),
              );
              return slug;
            },
            loading: () => ({ p: "loading" }),
            page: (context: { data: unknown }) => panel(String(context.data)),
          }),
        ),
      ],
    },
  ]);
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  return text;
}

describe("node ids under concurrent server rendering", () => {
  it("two interleaved renderToStream() responses each keep unique ids", async () => {
    const app = createApp(idRoutes());
    const [slow, fast] = await Promise.all([
      app.renderToStream("http://x/slow"),
      app.renderToStream("http://x/fast"),
    ]);
    const [slowHtml, fastHtml] = await Promise.all([
      collect(slow.stream),
      collect(fast.stream),
    ]);

    for (const [name, html] of [
      ["slow", slowHtml],
      ["fast", fastHtml],
    ] as const) {
      const ids = idsIn(html);
      // BOTH roots must have contributed, or the duplicate check has nothing
      // to catch. Each root counts from zero, so with one shared counter the
      // two sets would be the same strings. The content root is pinned to ""
      // (unprefixed) so it matches what hydrate() computes once the swap
      // script replaces the shell with it — only the shell carries "w-s".
      expect(
        ids.some((id) => id.startsWith("w-s")),
        `${name}: no ids from the shell root`,
      ).toBe(true);
      expect(
        ids.some((id) => !id.startsWith("w-s")),
        `${name}: no ids from the content root`,
      ).toBe(true);
      expect(duplicates(ids), `${name}: duplicate ids`).toEqual([]);
    }
  });

  it("a streamed shell and its content never share an id", async () => {
    const app = createApp(idRoutes());
    const result = await app.renderToStream("http://x/slow");
    const html = await collect(result.stream);
    // Both roots are in this one document; the shell's ids are emitted in the
    // first chunk and the content's in the second. With one counter shared
    // across roots both would start over and repeat each other.
    const ids = idsIn(html);
    expect(ids.some((id) => id.startsWith("w-s"))).toBe(true);
    expect(ids.some((id) => !id.startsWith("w-s"))).toBe(true);
    expect(duplicates(ids)).toEqual([]);
  });

  it("renderToStream's content root and the hydrating client compute the same ids", async () => {
    // Reproduces what the browser actually does: the shell paints first,
    // STREAM_SWAP_SCRIPT replaces it with the content template's clone, THEN
    // hydrate() runs against whatever is left in the DOM at that point.
    const app = createApp(idRoutes());
    const result = await app.renderToStream("http://x/hello");
    const html = await collect(result.stream);

    const contentMatch = html.match(
      /<template id="domphy-content">([\s\S]*?)<\/template>/,
    );
    expect(contentMatch).not.toBeNull();
    const contentHtml = contentMatch![1];
    const serverContentIds = idsIn(contentHtml);
    expect(serverContentIds.length).toBeGreaterThan(0);
    // None of the ids that survive the swap came from the shell.
    expect(serverContentIds.some((id) => id.startsWith("w-s"))).toBe(false);

    // Simulate the swap: #domphy-app ends up holding ONLY the content markup.
    document.body.innerHTML = `<div id="domphy-app">${contentHtml}</div>`;
    const target = document.getElementById("domphy-app")!;
    const before = target.innerHTML;

    const client = createApp(idRoutes());
    await client.hydrate(target.firstElementChild as HTMLElement);

    expect(target.innerHTML).toBe(before);
    expect(idsIn(target.innerHTML)).toEqual(serverContentIds);
  });

  it("many concurrent renderToString() responses are each self-consistent", async () => {
    const app = createApp(idRoutes());
    const results = await Promise.all(
      ["a", "b", "c", "d", "e", "f"].map((slug) =>
        app.renderToString(`http://x/${slug}`),
      ),
    );
    for (const result of results) {
      const ids = idsIn(result.html);
      expect(ids.length).toBeGreaterThan(0);
      expect(duplicates(ids)).toEqual([]);
    }
    // Every response numbers from its own root, so the same route shape
    // produces the same ids no matter how many requests ran alongside it.
    const first = idsIn(results[0].html);
    for (const result of results.slice(1)) {
      expect(idsIn(result.html)).toEqual(first);
    }
  });

  it("renderToString and the hydrating client compute the same ids", async () => {
    const app = createApp(idRoutes());
    const rendered = await app.renderToString("http://x/hello");
    const serverIds = idsIn(rendered.html);
    expect(serverIds.length).toBeGreaterThan(0);

    document.body.innerHTML = `<div id="domphy-app">${rendered.html}</div>`;
    const target = document.getElementById("domphy-app")!;
    const before = target.innerHTML;

    // A second app instance renders alongside it first, so a shared counter
    // would have been advanced before the client tree is built.
    const noise = createApp(idRoutes());
    await noise.renderToString("http://x/noise");

    const client = createApp(idRoutes());
    await client.hydrate(target.firstElementChild as HTMLElement);

    // Hydration binds the server nodes in place; the ids it computed are the
    // ones already in the DOM, so the markup must be untouched.
    expect(target.innerHTML).toBe(before);
    expect(idsIn(target.innerHTML)).toEqual(serverIds);
  });
});
