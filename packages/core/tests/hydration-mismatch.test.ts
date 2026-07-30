// @vitest-environment jsdom
//
// DEV-only hydration mismatch detection: mount() binds server DOM purely by
// position, so a server/client tree drift used to bind the WRONG node
// silently. In DEV (NODE_ENV !== "production", which includes this test run)
// mount() now warns with expected vs actual. Production behavior is
// unchanged — the binding still proceeds after the warning.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import type { DomphyElement } from "../src/types.ts";

/** Mount clientApp onto the server-rendered DOM of serverApp. */
function mountClientOnServerDom(
  serverApp: DomphyElement,
  clientApp: DomphyElement,
) {
  const host = document.createElement("div");
  host.innerHTML = new ElementNode(serverApp).generateHTML();
  document.body.appendChild(host);
  const rootEl = host.firstElementChild as HTMLElement;
  new ElementNode(clientApp).mount(rootEl);
  return rootEl;
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  document.body.innerHTML = "";
});

function hydrationWarnings(): string[] {
  return warnSpy.mock.calls
    .map((call) => String(call[0]))
    .filter((msg) => msg.includes("Hydration mismatch"));
}

describe("hydration mismatch detection (DEV)", () => {
  it("warns when a child tag differs between server and client", () => {
    mountClientOnServerDom(
      { div: [{ span: "a" }] } as DomphyElement,
      { div: [{ p: "a" }] } as DomphyElement,
    );
    const warnings = hydrationWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("expected <p> but found <span>");
    expect(warnings[0]).toContain("<div> child 0");
  });

  it("warns when a declared id attribute differs", () => {
    mountClientOnServerDom(
      { div: [{ span: "a", id: "one" }] } as DomphyElement,
      { div: [{ span: "a", id: "two" }] } as DomphyElement,
    );
    const warnings = hydrationWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('expected id="two" but found id="one"');
  });

  it("warns when a declared class attribute differs", () => {
    mountClientOnServerDom(
      { div: [{ span: "a", class: "server-class" }] } as DomphyElement,
      { div: [{ span: "a", class: "client-class" }] } as DomphyElement,
    );
    const warnings = hydrationWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("client-class");
    expect(warnings[0]).toContain("server-class");
  });

  it("warns when an element child binds a server text node", () => {
    mountClientOnServerDom(
      { div: ["just text"] } as DomphyElement,
      { div: [{ b: "x" }] } as DomphyElement,
    );
    const warnings = hydrationWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("expected <b> but found a text node");
  });

  it("warns when a text child binds a server element node", () => {
    mountClientOnServerDom(
      { div: [{ b: "x" }] } as DomphyElement,
      { div: ["just text"] } as DomphyElement,
    );
    const warnings = hydrationWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("expected a text node");
    expect(warnings[0]).toContain("<b>");
  });

  it("warns when the mount root tag differs", () => {
    const host = document.createElement("div");
    host.innerHTML = new ElementNode({
      section: "x",
    } as DomphyElement).generateHTML();
    document.body.appendChild(host);
    new ElementNode({ article: "x" } as DomphyElement).mount(
      host.firstElementChild as HTMLElement,
    );
    const warnings = hydrationWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("mount root");
    expect(warnings[0]).toContain("expected <article> but found <section>");
  });

  it("does not warn when server and client trees match", () => {
    const App = {
      div: [
        { h2: "Title", id: "heading" },
        { p: "Body", class: "lead" },
      ],
      id: "root",
    } as DomphyElement;
    mountClientOnServerDom(App, App);
    expect(hydrationWarnings()).toHaveLength(0);
  });

  it("still binds the node after warning (production behavior unchanged)", () => {
    const rootEl = mountClientOnServerDom(
      { div: [{ span: "a" }] } as DomphyElement,
      {
        div: [{ p: "a", onClick: (_e: any, node: any) => (hit = node) }],
      } as DomphyElement,
    );
    let hit: any = null;
    rootEl.firstElementChild!.dispatchEvent(new window.MouseEvent("click"));
    expect(hydrationWarnings()).toHaveLength(1);
    expect(hit).not.toBeNull();
  });
});
