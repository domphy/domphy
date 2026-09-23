// @vitest-environment jsdom
//
// Shared (de-duplicated) CSSOM rules. Truth sources:
//  - CSS cascade semantics: two byte-identical rules with the same selector
//    resolve to exactly the same computed style as one, so collapsing them is
//    observationally equivalent — and the element's declarations must keep
//    existing for as long as any element using them does;
//  - the declarative contract that each node owns its own style, so a value
//    that diverges on one node must not reach another;
//  - real CSSOM behavior (jsdom's live stylesheet), not a recorded snapshot.
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import { flushSync } from "../src/classes/Reactive.ts";
import type { DomphyElement } from "../src/types.ts";
import { toState } from "../src/utils.ts";

function sheetRules(): string[] {
  const rules: string[] = [];
  for (const style of document.head.querySelectorAll("style")) {
    const sheet = (style as HTMLStyleElement).sheet;
    if (!sheet) continue;
    for (const rule of sheet.cssRules) rules.push(rule.cssText);
  }
  return rules;
}

function declarationOf(selectorFragment: string): string[] {
  return sheetRules()
    .filter((text) => text.includes(selectorFragment))
    .map((text) => text.slice(text.indexOf("{")));
}

function mount(element: DomphyElement): ElementNode {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(element);
  node.render(host);
  return node;
}

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

const tree = (): DomphyElement =>
  ({
    div: [
      { p: "one", style: { color: "rgb(1, 2, 3)", padding: "4px" } },
      { p: "two", style: { color: "rgb(1, 2, 3)", padding: "4px" } },
    ],
    style: { display: "flex" },
  }) as DomphyElement;

describe("shared CSSOM rules", () => {
  it("never leaves two byte-identical rules in one stylesheet", () => {
    mount(tree());
    mount(tree());
    const rules = sheetRules();
    expect(rules.length).toBe(new Set(rules).size);
  });

  it("keeps the same declarations the un-shared sheet produced (CSS cascade equivalence)", () => {
    const single = mount(tree());
    const beforeSecondMount = new Set(sheetRules());
    mount(tree());
    // The second mount adds no new declarations — every rule it needs already
    // exists — and removes none.
    expect(new Set(sheetRules())).toEqual(beforeSecondMount);
    expect(single.domElement).toBeTruthy();
  });

  it("keeps a shared rule alive while another node still uses it", () => {
    const first = mount(tree());
    mount(tree());
    const selector = `.${first.scopeClass}`;
    expect(declarationOf(selector).length).toBe(1);

    first._dispose();

    // The second mount's element still carries the same auto class, so its
    // rule must survive the first mount's removal.
    expect(declarationOf(selector).length).toBe(1);
  });

  it("drops the rule once the last user is removed", () => {
    const first = mount(tree());
    const second = mount(tree());
    const selector = `.${first.scopeClass}`;
    first._dispose();
    second._dispose();
    expect(declarationOf(selector)).toEqual([]);
  });

  it("does not leak a diverging reactive value into a node that shared the rule", () => {
    // Both trees start with the same resolved color, so their rules are
    // byte-identical and get shared; changing one node's source must give it a
    // private rule instead of rewriting the other's.
    const colorA = toState("rgb(1, 2, 3)");
    const colorB = toState("rgb(1, 2, 3)");
    const make = (color: typeof colorA): DomphyElement =>
      ({
        section: "x",
        style: { color: (listener: any) => color.get(listener) },
      }) as DomphyElement;

    const a = mount(make(colorA));
    const b = mount(make(colorB));
    expect(a.scopeClass).toBe(b.scopeClass); // same resolved style -> same class

    colorA.set("rgb(9, 9, 9)");
    flushSync();

    // The private class a diverging node takes is unique per DOCUMENT, not per
    // root — these are two separate roots, and `nodeId` restarts at n0 in each,
    // so naming it from nodeId would give both the same class and let the later
    // rule win for both elements.
    expect(a.scopeClass).not.toBe(b.scopeClass);

    const texts = sheetRules().filter((text) => text.includes("section_"));
    expect(texts.some((text) => text.includes("rgb(9, 9, 9)"))).toBe(true);
    expect(texts.some((text) => text.includes("rgb(1, 2, 3)"))).toBe(true);
  });

  it("moves a patched node to its own class, leaving the shared rule untouched", () => {
    const first = mount(tree());
    const second = mount(tree());
    const shared = first.children.items[0] as ElementNode;
    const patched = second.children.items[0] as ElementNode;
    expect(patched.scopeClass).toBe(shared.scopeClass);
    const sharedSelector = `.${shared.scopeClass}`;
    expect(declarationOf(sharedSelector).length).toBe(1);

    patched.patch({
      p: "one",
      style: { color: "rgb(7, 7, 7)", padding: "4px" },
    } as DomphyElement);

    // The node that changed left the shared scope: the rule every other node
    // is wearing still says what it said, and the new value lives under a
    // class only this node carries.
    expect(patched.scopeClass).not.toBe(shared.scopeClass);
    const sharedDeclarations = declarationOf(sharedSelector);
    expect(sharedDeclarations.length).toBe(1);
    expect(sharedDeclarations[0]).toContain("rgb(1, 2, 3)");

    const ownDeclarations = declarationOf(`.${patched.scopeClass}`);
    expect(ownDeclarations.length).toBe(1);
    expect(ownDeclarations[0]).toContain("rgb(7, 7, 7)");

    // And the untouched element still resolves to the shared declaration.
    expect(shared.domElement?.className).toContain(shared.scopeClass!);
    expect(patched.domElement?.className).not.toContain(shared.scopeClass!);
  });
});

// Truth sources: real CSSOM (jsdom's live stylesheet, same as the rest of
// this file) plus the same cascade-equivalence argument as "shared CSSOM
// rules" above, extended to at-rules (@keyframes/@font-face/@media/@supports/
// @container/@layer) rather than just plain selector rules.
describe("shared @keyframes and @media wrappers (including reactive content)", () => {
  const spinner = (opacity: any): DomphyElement =>
    ({
      div: "spin",
      style: {
        animationName: "spin",
        "@keyframes spin": {
          from: { opacity: (l: any) => opacity.get(l) },
          to: { opacity: "1" },
        },
      },
    }) as DomphyElement;

  it("shares one @keyframes CSSOM rule across byte-identical reactive instances", () => {
    const opacityA = toState("0");
    const opacityB = toState("0");
    mount(spinner(opacityA));
    mount(spinner(opacityB));

    const keyframesRules = sheetRules().filter((text) =>
      text.startsWith("@keyframes spin"),
    );
    expect(keyframesRules.length).toBe(1);
  });

  it("detaches to a private rule when one instance's reactive value diverges, leaving the other's untouched (copy-on-write)", () => {
    const opacityA = toState("0");
    const opacityB = toState("0");
    mount(spinner(opacityA));
    mount(spinner(opacityB));

    opacityA.set("0.5");
    flushSync();

    const keyframesRules = sheetRules().filter((text) =>
      text.startsWith("@keyframes spin"),
    );
    // A now differs from B — they can no longer share one CSSOM rule, and B's
    // declaration must still read its own (unchanged) value, not A's.
    expect(keyframesRules.length).toBe(2);
    expect(keyframesRules.some((text) => text.includes("opacity: 0.5"))).toBe(
      true,
    );
    expect(
      keyframesRules.some(
        (text) => text.includes("opacity: 0") && !text.includes("0.5"),
      ),
    ).toBe(true);
  });

  it("drops the shared @keyframes rule only once the last user is removed", () => {
    const opacityA = toState("0");
    const opacityB = toState("0");
    const a = mount(spinner(opacityA));
    mount(spinner(opacityB));
    expect(
      sheetRules().filter((text) => text.startsWith("@keyframes spin")).length,
    ).toBe(1);

    a._dispose();
    expect(
      sheetRules().filter((text) => text.startsWith("@keyframes spin")).length,
    ).toBe(1);
  });

  const mediaTree = (): DomphyElement =>
    ({
      div: "x",
      style: {
        display: "block",
        "@media (max-width: 640px)": { display: "none" },
      },
    }) as DomphyElement;

  it("shares one @media CSSOM rule (wrapper + nested content) across byte-identical instances", () => {
    mount(mediaTree());
    mount(mediaTree());

    const mediaRules = sheetRules().filter((text) =>
      text.startsWith("@media (max-width: 640px)"),
    );
    expect(mediaRules.length).toBe(1);
    expect(mediaRules[0]).toContain("display: none");
  });

  it("keeps the shared @media rule alive while another node still uses it", () => {
    const first = mount(mediaTree());
    mount(mediaTree());
    first._dispose();

    const mediaRules = sheetRules().filter((text) =>
      text.startsWith("@media (max-width: 640px)"),
    );
    expect(mediaRules.length).toBe(1);
  });
});

describe("SSR stylesheet", () => {
  it("serializes each distinct rule once", () => {
    const css = new ElementNode(tree()).generateCSS();
    const rules = css
      .split("} ")
      .map((part) => part.trim())
      .filter(Boolean);
    expect(rules.length).toBe(new Set(rules).size);
  });

  it("still emits every distinct declaration the tree needs", () => {
    const node = new ElementNode(tree());
    const css = node.generateCSS();
    const paragraph = node.children.items[0] as ElementNode;
    expect(css).toContain(`.${node.scopeClass}`);
    expect(css).toContain(`.${paragraph.scopeClass}`);
    expect(css).toContain("display: flex");
    expect(css).toContain("padding: 4px");
  });
});

// Truth source: an exact counterfactual computed from the SAME real
// StyleRule objects the tree actually built — `naiveCssBytes` calls the
// identical `cssText()` method `generateCSS()` uses internally, just without
// its de-duplication `Set`, so it is a real "before the fix" byte count, not
// a hand-typed number. Scale (24 nav links + 240 rows) is chosen to be a
// full PAGE, not a single component/block: the previous SSR byte-savings
// measurement only had a before/after pair for one block
// (`signup03`, 13320->8727 bytes, -34%).
function naiveCssBytes(node: ElementNode): number {
  let total = 0;
  const walk = (current: ElementNode) => {
    for (const rule of current.styles.items) total += rule.cssText().length;
    for (const child of current.children.items) {
      if (child instanceof ElementNode) walk(child);
    }
  };
  walk(node);
  return total;
}

describe("SSR byte savings at page scale (measured, not block scale)", () => {
  it("a 24-link nav + 240-row page ships every distinct rule once, saving real bytes over the un-deduped counterfactual", () => {
    const NAV_LINK_COUNT = 24;
    const ROW_COUNT = 240;
    const page = (): DomphyElement =>
      ({
        div: [
          {
            nav: Array.from({ length: NAV_LINK_COUNT }, (_, index) => ({
              a: `Section ${index}`,
              _key: index,
              style: { padding: "4px", color: "rgb(10, 20, 30)" },
            })),
          },
          {
            ul: Array.from({ length: ROW_COUNT }, (_, index) => ({
              li: `Row ${index}`,
              _key: index,
              style: {
                padding: "2px 4px",
                color: "rgb(1, 2, 3)",
                "&:hover": { color: "rgb(9, 9, 9)" },
              },
            })),
          },
        ],
      }) as DomphyElement;

    const node = new ElementNode(page());
    const dedupedCss = node.generateCSS();
    const dedupedBytes = dedupedCss.length;
    const naiveBytes = naiveCssBytes(node);
    const savingsRatio = (naiveBytes - dedupedBytes) / naiveBytes;

    console.log(
      `[measured] page (${NAV_LINK_COUNT} nav links + ${ROW_COUNT} rows): ` +
        `naive ${naiveBytes}B -> deduped ${dedupedBytes}B ` +
        `(-${(savingsRatio * 100).toFixed(1)}%)`,
    );

    // The row rule (280 declared instances: 240 base + 240 hover, minus the
    // nav's own repeats counted separately) is byte-identical across every
    // row, so dedup MUST beat the naive count — true for any input with a
    // repeated rule, guaranteed here by construction (ROW_COUNT structurally
    // identical <li> siblings).
    expect(dedupedBytes).toBeLessThan(naiveBytes);

    // Every distinct rule still appears in the deduped output exactly once.
    const rules = dedupedCss
      .split("} ")
      .map((part) => part.trim())
      .filter(Boolean);
    expect(rules.length).toBe(new Set(rules).size);
  });
});

describe("node identity and scope class", () => {
  it("gives every node in a tree its own id, and labelled roots never collide", () => {
    // What `domphy-popover-${nodeId}`, menu/tab item ids and aria-controls are
    // built from: duplicate ids are invalid HTML and cross-wire the two
    // instances' ARIA relationships. Ids are a function of the TREE — an
    // unlabelled root always numbers from n0, whatever the process rendered
    // before — so two roots in one document are told apart by `_idPrefix`,
    // exactly as React requires `identifierPrefix` for several apps on a page.
    const ids = (node: ElementNode): string[] => [
      node.nodeId,
      ...node.children.items
        .filter((child): child is ElementNode => child instanceof ElementNode)
        .flatMap(ids),
    ];
    const first = ids(mount({ ...tree(), _idPrefix: "a" } as DomphyElement));
    const second = ids(mount({ ...tree(), _idPrefix: "b" } as DomphyElement));
    expect(first.length).toBeGreaterThan(1);
    expect(new Set([...first, ...second]).size).toBe(
      first.length + second.length,
    );
  });

  it("puts structurally identical siblings on one class and one rule", () => {
    // The two paragraphs of `tree()` declare the same style, so they are the
    // same style — one class, one rule, however many of them there are.
    const node = mount({
      ul: Array.from({ length: 20 }, (_, index) => ({
        li: `row ${index}`,
        _key: index,
        style: { padding: "2px", color: "rgb(1, 2, 3)" },
      })),
    } as DomphyElement);
    const rows = node.children.items as ElementNode[];
    const classes = new Set(rows.map((row) => row.scopeClass));
    expect(classes.size).toBe(1);
    expect(declarationOf(`.${rows[0].scopeClass}`).length).toBe(1);
  });

  it("gives an element with no declared style no class at all", () => {
    const node = mount({ div: [{ span: "plain" }] } as DomphyElement);
    const span = node.children.items[0] as ElementNode;
    expect(span.scopeClass).toBe(null);
    expect(span.domElement?.getAttribute("class")).toBe(null);
  });

  it("produces the same class on the server and on the client (hydration parity)", () => {
    const server = new ElementNode(tree());
    const html = server.generateHTML();
    const css = server.generateCSS();

    const client = new ElementNode(tree());
    expect(client.scopeClass).toBe(server.scopeClass);
    expect(html).toContain(`class="${server.scopeClass}"`);
    expect(css).toContain(`.${client.scopeClass}`);
  });
});
