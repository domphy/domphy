// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import type { DomphyElement } from "../src/types.ts";

function mount(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { host, node };
}

// Read the data-id of each rendered child in DOM order.
function domOrder(host: HTMLElement): string[] {
  return [...host.querySelector("ul")!.children].map(
    (el) => (el as HTMLElement).dataset.id ?? "",
  );
}

// Read the data-id of each ElementList item in logical order.
function itemOrder(node: ElementNode): string[] {
  return node.children.items.map(
    (item: any) => item.attributes?.get?.("data-id") ?? "",
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ElementList.swap", () => {
  it("swaps two items in both the logical list and the DOM", () => {
    const { host, node } = mount({
      ul: [
        { li: "A", "data-id": "a" },
        { li: "B", "data-id": "b" },
        { li: "C", "data-id": "c" },
      ],
    } as DomphyElement);

    expect(domOrder(host)).toEqual(["a", "b", "c"]);

    node.children.swap(0, 2);

    expect(itemOrder(node)).toEqual(["c", "b", "a"]);
    expect(domOrder(host)).toEqual(["c", "b", "a"]);
  });

  it("swaps adjacent items correctly", () => {
    const { host, node } = mount({
      ul: [
        { li: "A", "data-id": "a" },
        { li: "B", "data-id": "b" },
        { li: "C", "data-id": "c" },
      ],
    } as DomphyElement);

    node.children.swap(0, 1);

    expect(itemOrder(node)).toEqual(["b", "a", "c"]);
    expect(domOrder(host)).toEqual(["b", "a", "c"]);
  });

  it("is a no-op for out-of-range or equal indices", () => {
    const { host, node } = mount({
      ul: [
        { li: "A", "data-id": "a" },
        { li: "B", "data-id": "b" },
      ],
    } as DomphyElement);

    node.children.swap(0, 0);
    node.children.swap(0, 5);
    node.children.swap(-1, 1);

    expect(itemOrder(node)).toEqual(["a", "b"]);
    expect(domOrder(host)).toEqual(["a", "b"]);
  });
});

describe("ElementList.move", () => {
  it("moves an item forward in the logical list (splice math)", () => {
    const { node } = mount({
      ul: [
        { li: "A", "data-id": "a" },
        { li: "B", "data-id": "b" },
        { li: "C", "data-id": "c" },
        { li: "D", "data-id": "d" },
      ],
    } as DomphyElement);

    node.children.move(0, 2); // a -> index 2

    // The logical `items` array is repositioned by splice(from,1)+splice(to,0).
    expect(itemOrder(node)).toEqual(["b", "c", "a", "d"]);
  });

  it("keeps the DOM in sync with the logical list for a forward move", () => {
    const { host, node } = mount({
      ul: [
        { li: "A", "data-id": "a" },
        { li: "B", "data-id": "b" },
        { li: "C", "data-id": "c" },
        { li: "D", "data-id": "d" },
      ],
    } as DomphyElement);

    node.children.move(0, 2); // a -> logical index 2

    // _moveDomElement references the FOLLOWING node by identity, so a forward
    // move lands at the correct DOM slot ("a" between "c" and "d"), matching the
    // logical order exactly.
    expect(domOrder(host)).toEqual(["b", "c", "a", "d"]);
    expect(domOrder(host)).toEqual(itemOrder(node));
  });

  it("moves an item forward to the last slot", () => {
    const { host, node } = mount({
      ul: [
        { li: "A", "data-id": "a" },
        { li: "B", "data-id": "b" },
        { li: "C", "data-id": "c" },
      ],
    } as DomphyElement);

    node.children.move(0, 2); // a -> last index

    expect(itemOrder(node)).toEqual(["b", "c", "a"]);
    expect(domOrder(host)).toEqual(["b", "c", "a"]);
  });

  it("moves an item backward (higher index to lower index)", () => {
    const { host, node } = mount({
      ul: [
        { li: "A", "data-id": "a" },
        { li: "B", "data-id": "b" },
        { li: "C", "data-id": "c" },
        { li: "D", "data-id": "d" },
      ],
    } as DomphyElement);

    node.children.move(3, 1); // d -> index 1

    expect(itemOrder(node)).toEqual(["a", "d", "b", "c"]);
    expect(domOrder(host)).toEqual(["a", "d", "b", "c"]);
  });

  it("is a no-op for out-of-range or equal indices", () => {
    const { host, node } = mount({
      ul: [
        { li: "A", "data-id": "a" },
        { li: "B", "data-id": "b" },
      ],
    } as DomphyElement);

    node.children.move(0, 0);
    node.children.move(5, 0);
    node.children.move(0, -1);

    expect(itemOrder(node)).toEqual(["a", "b"]);
    expect(domOrder(host)).toEqual(["a", "b"]);
  });
});

describe("ElementNode.patch: attribute removal", () => {
  it("removes an attribute that was present before but is absent in the new element", () => {
    const { host, node } = mount({
      span: "x",
      title: "tip",
      "data-keep": "yes",
    } as DomphyElement);

    const span = host.querySelector("span")!;
    expect(span.getAttribute("title")).toBe("tip");
    expect(span.getAttribute("data-keep")).toBe("yes");

    // New element drops `title` but keeps `data-keep`.
    node.patch({
      span: "x",
      "data-keep": "yes",
    } as DomphyElement);

    expect(span.hasAttribute("title")).toBe(false);
    expect(span.getAttribute("data-keep")).toBe("yes");
  });
});
