// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ElementNode } from "../src/index.js";

// Node ids come from the tree's ROOT, not from a module-global counter with a
// per-request reset. Two truths are in tension and both have to hold:
//
//  a. Hydration: the server and the client must compute the SAME ids. That
//     rules out ANY discriminator derived from how much work the process has
//     done — a static-site build renders many page roots per process, a server
//     handles many requests per process, a test file runs many cases in one
//     realm — because the browser that later hydrates one of them shares none
//     of that history.
//  b. HTML: an id must be unique within its document, and several roots in one
//     page each number from zero.
//
// (a) is the default and is absolute; (b) is the caller's to declare with
// `_idPrefix`. That is React's rule for `useId` verbatim: ids are a function of
// the tree, and rendering several independent apps into one page means passing
// `identifierPrefix`.

const tree = () => ({ div: [{ p: "a" }, { p: "b" }] });

function ids(node: ElementNode): string[] {
  const out = [node.nodeId];
  for (const child of node.children.items) {
    if (child instanceof ElementNode) out.push(...ids(child));
  }
  return out;
}

describe("node id scoping", () => {
  it("numbers every unlabelled root from zero while nothing is in a document", () => {
    // The press case: page A and page B built in one process and only
    // serialized, never rendered, so neither occupies a document's id space.
    const pageA = ids(new ElementNode(tree()));
    const pageB = ids(new ElementNode(tree()));
    expect(pageA).toEqual(["n0", "n1", "n2"]);
    expect(pageB).toEqual(pageA);
  });

  it("is unaffected by other roots built in between", () => {
    // A server handling other requests, or a build rendering other pages.
    new ElementNode(tree());
    const a = ids(new ElementNode(tree()));
    new ElementNode({ ...tree(), _idPrefix: "other" });
    new ElementNode(tree());
    const b = ids(new ElementNode(tree()));
    expect(a).toEqual(b);
    expect(a).toEqual(["n0", "n1", "n2"]);
  });

  it("an explicit prefix is equally history-independent", () => {
    new ElementNode(tree());
    const a = ids(new ElementNode({ ...tree(), _idPrefix: "p" }));
    new ElementNode(tree());
    const b = ids(new ElementNode({ ...tree(), _idPrefix: "p" }));
    expect(a).toEqual(b);
    expect(a).toEqual(["pn0", "pn1", "pn2"]);
  });

  it("keeps two labelled roots of one document apart", () => {
    const shell = ids(new ElementNode({ ...tree(), _idPrefix: "s" }));
    const content = ids(new ElementNode({ ...tree(), _idPrefix: "c" }));
    expect(shell).toEqual(["sn0", "sn1", "sn2"]);
    expect(content).toEqual(["cn0", "cn1", "cn2"]);
    expect(shell.filter((id) => content.includes(id))).toEqual([]);
  });

  it("numbers a subtree from its root, not from the module", () => {
    // A child added later still draws from the root that owns it, so an id is
    // a function of the tree it belongs to and nothing else.
    const root = new ElementNode({ ...tree(), _idPrefix: "" });
    const before = ids(root);
    new ElementNode({ ...tree(), _idPrefix: "" }); // another tree, interleaved
    root.children.insert({ p: "c" }, root.children.items.length);
    const after = ids(root);
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after[after.length - 1]).toBe("n3");
  });

  it("never leaks `_idPrefix` into the DOM or the server markup", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = new ElementNode({ ...tree(), _idPrefix: "s" });
    node.render(host);
    const element = host.firstElementChild as HTMLElement;
    expect(
      element.getAttributeNames().filter((name) => name.includes("id-prefix")),
    ).toEqual([]);
    expect(
      new ElementNode({ ...tree(), _idPrefix: "s" }).generateHTML(),
    ).not.toContain("prefix");
  });
});

// The press case, end to end: a static-site build renders many pages from ONE
// process, and each page is later hydrated on its own by a browser that shares
// none of that build's history. Every page must therefore serve the ids its own
// hydrating client computes from scratch.
describe("static-build SSR then a fresh-document hydration", () => {
  const page = (title: string) => ({
    main: [
      { h1: title },
      { p: "body" },
      { ul: [{ li: "one" }, { li: "two" }] },
    ],
  });

  function idsInMarkup(markup: string): string[] {
    return Array.from(markup.matchAll(/\sid="([^"]+)"/g)).map((m) => m[1]);
  }

  // Stamp a nodeId-derived DOM id the way @domphy/ui's popover/menu/tabs do,
  // so the markup actually carries the ids under test.
  const stamped = (title: string) => {
    const element = page(title) as Record<string, unknown>;
    element._onSchedule = (
      node: { nodeId: string },
      target: Record<string, unknown>,
    ) => {
      target.id = `w-${node.nodeId}`;
    };
    return element;
  };

  it("renders page A then page B in one process and page B still hydrates clean", () => {
    // Build order: A first, then B — B is the one we hydrate.
    new ElementNode(stamped("page A") as never).generateHTML();
    const serverMarkup = new ElementNode(
      stamped("page B") as never,
    ).generateHTML();
    const serverIds = idsInMarkup(serverMarkup);
    expect(serverIds.length).toBeGreaterThan(0);

    // A browser opening page B on its own: nothing of the build's history.
    document.body.innerHTML = `<div id="root">${serverMarkup}</div>`;
    const target = document.getElementById("root")!;
    const before = target.innerHTML;

    const client = new ElementNode(stamped("page B") as never);
    client.mount(target.firstElementChild as HTMLElement);

    // Hydration binds the server nodes in place, so the ids the client
    // computed are the ones already in the markup — any drift shows up as a
    // changed id attribute here.
    expect(idsInMarkup(target.innerHTML)).toEqual(serverIds);
    expect(target.innerHTML).toBe(before);
  });
});

// The other half of the contract: a root that JOINS a live document takes part
// of that document's id space, so the next one built must not reuse it.
describe("roots mounted into one live document", () => {
  it("discriminates each unlabelled root after the first", () => {
    const mountRoot = () => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const node = new ElementNode(tree());
      node.render(host);
      return ids(node);
    };
    const first = mountRoot();
    const second = mountRoot();
    const third = mountRoot();
    // Distinctness is the contract. The exact prefix depends on how many roots
    // are already live in this realm, which is the whole point — and is why
    // only render()/mount() bump it, never generateHTML().
    const all = [...first, ...second, ...third];
    expect(all.length).toBe(9);
    expect(new Set(all).size).toBe(all.length);
  });

  it("does not let a serialized root consume the document's id space", () => {
    // generateHTML() joins no document, so it must not shift the prefix the
    // NEXT client root takes — this is what keeps an SSR process at "".
    const before = ids(new ElementNode(tree()));
    new ElementNode(tree()).generateHTML();
    new ElementNode(tree()).generateHTML();
    const after = ids(new ElementNode(tree()));
    expect(after).toEqual(before);
  });

  it("keeps SSR and hydration on the same prefix in one realm", () => {
    // Both sides count the same thing, so a server render and the client that
    // hydrates it agree even when other roots are already live on the page.
    const host = document.createElement("div");
    document.body.appendChild(host);
    new ElementNode(tree()).render(host); // an unrelated app already mounted

    const server = new ElementNode(tree());
    const serverIds = ids(server);
    const markup = server.generateHTML();

    const target = document.createElement("div");
    target.innerHTML = markup;
    document.body.appendChild(target);
    const client = new ElementNode(tree());
    const clientIds = ids(client);
    client.mount(target.firstElementChild as HTMLElement);

    expect(clientIds).toEqual(serverIds);
  });
});
