// @vitest-environment jsdom
//
// Domphy runs inside embedded browsers that are years behind evergreen ones.
// Truth source for what such an engine lacks: SketchUp 2022 embeds CEF 88
// (Chrome 88); MDN browser-compat-data lists `Object.hasOwn` as Chrome 93+.
// On 2026-09-17 a build of a SketchUp plugin died at the first mount with
// "Object.hasOwn is not a function" and every SketchUp 2022 user got a blank
// dialog for three days. jsdom itself calls `Object.hasOwn` (it shares Node's
// global `Object`), so the API cannot simply be deleted: it is replaced by a
// trap that throws exactly what Chrome 88 throws, but only when the caller is
// Domphy package source. Any new `Object.hasOwn` on the mount / attribute /
// context / behavior paths then fails here instead of in a customer's dialog.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import { behavior, toState } from "../src/utils.ts";

const nativeHasOwn = Object.hasOwn;

const DOMPHY_SOURCE = /[\\/]packages[\\/][a-z-]+[\\/]src[\\/]/;

beforeAll(() => {
  Object.hasOwn = function legacyEngineTrap(object: object, key: PropertyKey) {
    // Frame 0 is the Error line, 1 is this trap, 2 is the direct caller. Only the
    // direct caller counts: jsdom calls Object.hasOwn too, from underneath Domphy frames.
    const caller = (new Error().stack ?? "").split("\n")[2] ?? "";
    if (DOMPHY_SOURCE.test(caller)) {
      throw new TypeError("Object.hasOwn is not a function");
    }
    return nativeHasOwn(object, key);
  };
});

afterAll(() => {
  Object.hasOwn = nativeHasOwn;
});

function flush(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

function mount(element: ConstructorParameters<typeof ElementNode>[0]) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(element);
  node.render(host);
  return { host, node };
}

describe("engine without Object.hasOwn (Chrome 88, MDN: Object.hasOwn is Chrome 93+)", () => {
  it("the trap is armed: a call that comes from package source throws like Chrome 88", () => {
    const fromPackageSource = new Function(
      "return Object.hasOwn({ a: 1 }, 'a') //# sourceURL=file:///x/packages/core/src/probe.js",
    );
    expect(fromPackageSource).toThrow("Object.hasOwn is not a function");
    expect(Object.hasOwn({ a: 1 }, "a")).toBe(true); // test / jsdom callers still work
  });

  it("mounts an element with attributes and children (HTML serialization is the expected value)", () => {
    const { host } = mount({
      div: [{ span: "hello" }],
      id: "legacy",
      class: "box",
      title: "tip",
      dataRole: "panel",
    });
    const div = host.querySelector("div") as HTMLElement;
    expect(div.id).toBe("legacy");
    expect(div.classList.contains("box")).toBe(true);
    expect(div.getAttribute("title")).toBe("tip");
    expect(div.getAttribute("data-role")).toBe("panel");
    expect(div.textContent).toBe("hello");
  });

  it("resolves context from an ancestor and returns undefined for a missing name", () => {
    const { node } = mount({ div: [{ span: "leaf" }] });
    node.setContext("theme", "dark");
    const leaf = node.children.items[0] as ElementNode;
    expect(leaf.getContext("theme")).toBe("dark");
    expect(leaf.getContext("absent")).toBeUndefined();
  });

  it("keeps a per-node behavior alive across a reactive re-render (behavior reconcile path)", async () => {
    const refresh = toState(0);
    let attached = 0;
    const { host } = mount({
      div: (listener) => {
        refresh.get(listener);
        return [
          {
            button: "open",
            _key: "trigger",
            $: [
              behavior(
                "probe",
                () => {
                  attached++;
                  return { update() {}, destroy() {} };
                },
                {},
              ),
            ],
          },
        ];
      },
    });
    refresh.set(1);
    await flush();
    expect(host.querySelectorAll("button").length).toBe(1);
    expect(attached).toBe(1);
  });
});
