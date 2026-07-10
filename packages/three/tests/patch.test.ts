import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { three } from "../src/patch.js";
import type { RootState, ThreeOptions } from "../src/types.js";
import { createStubRenderer } from "./stubRenderer.js";

// A ResizeObserver stub for jsdom (no native implementation): records every
// constructed instance so a test can reach in and fire its callback
// manually, exactly as SPEC.md's testing guidance suggests ("fire
// ResizeObserver manually or call the size setter").
class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];
  callback: ResizeObserverCallback;
  targets: Element[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverStub.instances.push(this);
  }

  observe(target: Element): void {
    this.targets.push(target);
  }
  unobserve(target: Element): void {
    this.targets = this.targets.filter((each) => each !== target);
  }
  disconnect(): void {
    this.targets = [];
  }

  trigger(rect: { width: number; height: number }): void {
    const entry = { contentRect: rect } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
}
(globalThis as any).ResizeObserver = ResizeObserverStub;

function mount(element: DomphyElement): {
  host: HTMLElement;
  node: ElementNode;
} {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(element);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  ResizeObserverStub.instances.length = 0;
});

describe("three() — mount", () => {
  it("creates a canvas child, builds the scene graph, and calls onCreated with the root", () => {
    let capturedRoot: RootState | undefined;
    const { host } = mount({
      div: null,
      $: [
        three({
          scene: [
            {
              mesh: [
                { boxGeometry: null, args: [1, 1, 1] },
                { meshBasicMaterial: null },
              ],
            },
          ],
          createRenderer: () => createStubRenderer(),
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    expect(host.querySelector("canvas")).toBeInstanceOf(HTMLCanvasElement);
    expect(capturedRoot).toBeDefined();
    expect(capturedRoot!.internal.active).toBe(true);

    const meshInstance = capturedRoot!.scene.children[0];
    expect(meshInstance).toBeInstanceOf(THREE.Mesh);
    expect(meshInstance.geometry).toBeInstanceOf(THREE.BoxGeometry);
    expect(meshInstance.material).toBeInstanceOf(THREE.MeshBasicMaterial);
  });

  it("applies non-adopted camera props via props.ts", () => {
    let capturedRoot: RootState | undefined;
    mount({
      div: null,
      $: [
        three({
          scene: null,
          camera: { fov: 50, position: [1, 2, 3] },
          createRenderer: () => createStubRenderer(),
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    expect(capturedRoot!.camera.fov).toBe(50);
    expect(capturedRoot!.camera.position.toArray()).toEqual([1, 2, 3]);
  });

  it("adopts a user camera instance verbatim, applying no props on top", () => {
    const userCamera = new THREE.PerspectiveCamera(35, 1, 1, 10);
    let capturedRoot: RootState | undefined;
    mount({
      div: null,
      $: [
        three({
          scene: null,
          camera: { instance: userCamera, fov: 999 } as any,
          createRenderer: () => createStubRenderer(),
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    expect(capturedRoot!.camera).toBe(userCamera);
    expect(capturedRoot!.camera.fov).toBe(35);
  });
});

describe("three() — raycaster options", () => {
  it("merges raycaster.params onto the existing per-object-type defaults instead of replacing them", () => {
    let capturedRoot: RootState | undefined;
    mount({
      div: null,
      $: [
        three({
          scene: null,
          raycaster: { params: { Points: { threshold: 0.1 } } },
          createRenderer: () => createStubRenderer(),
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    expect(capturedRoot!.raycaster.params.Points.threshold).toBe(0.1);
    // Other object-type defaults (Line threshold, etc.) must survive —
    // wholesale-replacing `params` would wipe them.
    expect(capturedRoot!.raycaster.params.Line.threshold).toBe(1);
    expect(capturedRoot!.raycaster.params.Mesh).toEqual({});
  });
});

describe("three() — resize", () => {
  it("wires the ResizeObserver to renderer.setSize + camera aspect + reactive size", () => {
    const stub = createStubRenderer();
    let capturedRoot: RootState | undefined;
    mount({
      div: null,
      $: [
        three({
          scene: null,
          createRenderer: () => stub,
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    const observer = ResizeObserverStub.instances.at(-1)!;
    observer.trigger({ width: 800, height: 400 });

    expect(stub.calls.setSize).toContainEqual([800, 400]);
    expect(capturedRoot!.camera.aspect).toBeCloseTo(2);
    expect(capturedRoot!.size.get()).toMatchObject({ width: 800, height: 400 });
  });
});

describe("three() — reactive scene", () => {
  it("reconciles a scene function (l, root) => children on State change", () => {
    const ids = toState(["a", "b"]);
    let capturedRoot: RootState | undefined;
    mount({
      div: null,
      $: [
        three({
          scene: (l: any) =>
            ids.get(l).map((id: string) => ({ mesh: null, _key: id })),
          createRenderer: () => createStubRenderer(),
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    expect(capturedRoot!.scene.children).toHaveLength(2);

    ids.set(["a", "c", "d"]);
    flushSync();

    expect(capturedRoot!.scene.children).toHaveLength(3);
  });

  it("swaps the whole scene when `three()` is given a ReadableState<ThreeOptions>", () => {
    const stub = createStubRenderer();
    let capturedRoot: RootState | undefined;
    const optionsState = toState<ThreeOptions>({
      scene: [{ mesh: null, _key: "a" }],
      createRenderer: () => stub,
      onCreated: (root) => {
        capturedRoot = root;
      },
    });

    mount({ div: null, $: [three(optionsState)] } as DomphyElement);

    expect(capturedRoot!.scene.children).toHaveLength(1);

    optionsState.set({
      scene: [
        { mesh: null, _key: "b" },
        { mesh: null, _key: "c" },
      ],
      createRenderer: () => stub,
    });
    flushSync();

    expect(capturedRoot!.scene.children).toHaveLength(2);
  });
});

describe("three() — unmount", () => {
  it("disposes the renderer, disposes scene instances, and releases subscriptions", () => {
    const stub = createStubRenderer();
    let capturedRoot: RootState | undefined;
    const { node } = mount({
      div: null,
      $: [
        three({
          scene: [
            {
              mesh: [
                { boxGeometry: null, args: [1, 1, 1] },
                { meshBasicMaterial: null },
              ],
            },
          ],
          createRenderer: () => stub,
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    const meshInstance = capturedRoot!.scene.children[0];
    const geometryDisposeSpy = vi.spyOn(meshInstance.geometry, "dispose");
    const materialDisposeSpy = vi.spyOn(meshInstance.material, "dispose");
    const observer = ResizeObserverStub.instances.at(-1)!;

    node.remove();

    expect(stub.calls.dispose).toBe(1);
    expect(geometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(materialDisposeSpy).toHaveBeenCalledTimes(1);
    expect(capturedRoot!.internal.active).toBe(false);
    expect(capturedRoot!.scene.children).toHaveLength(0);
    expect(observer.targets).toHaveLength(0);
  });

  it("releases the WebGL context (forceContextLoss/renderLists) on teardown, not just gl.dispose()", () => {
    const stub = createStubRenderer();
    const renderListsDisposeSpy = vi.spyOn(stub.renderLists, "dispose");
    const { node } = mount({
      div: null,
      $: [three({ scene: null, createRenderer: () => stub })],
    } as DomphyElement);

    node.remove();

    expect(stub.calls.forceContextLoss).toBe(1);
    expect(renderListsDisposeSpy).toHaveBeenCalledTimes(1);
    expect(stub.calls.dispose).toBe(1);
  });

  it("disposes plain (non-child) properties assigned directly on the scene as a backstop", () => {
    // Nothing in ThreeOptions lets a caller author a prop directly onto the
    // root Scene instance (SPEC.md's `scene` field is children-only) — this
    // stands in for r3f's `<scene background={texture}>` case, verifying
    // the teardown WIRING (disposeInstanceProperties call) is correct.
    const stub = createStubRenderer();
    let capturedRoot: RootState | undefined;
    const { node } = mount({
      div: null,
      $: [
        three({
          scene: null,
          createRenderer: () => stub,
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    const backgroundTexture = { dispose: vi.fn() };
    (capturedRoot!.scene as any).background = backgroundTexture;

    node.remove();

    expect(backgroundTexture.dispose).toHaveBeenCalledTimes(1);
  });
});

describe("three() — reused-node re-render", () => {
  it("does not re-run _onMount (no duplicate canvas/renderer/ResizeObserver/onCreated) when a reactive parent re-patches the host div", () => {
    const generation = toState(0);
    const stubFirst = createStubRenderer();
    const stubSecond = createStubRenderer();
    let mountCount = 0;

    const buildThree = (stub: ReturnType<typeof createStubRenderer>) =>
      three({
        scene: null,
        createRenderer: () => stub,
        onCreated: () => {
          mountCount++;
        },
      });

    const { host } = mount({
      div: (l: any) => {
        const value = generation.get(l);
        return {
          div: null,
          $: [buildThree(value === 0 ? stubFirst : stubSecond)],
        };
      },
    } as unknown as DomphyElement);

    expect(mountCount).toBe(1);
    expect(host.querySelectorAll("canvas")).toHaveLength(1);
    expect(ResizeObserverStub.instances).toHaveLength(1);

    generation.set(1);
    flushSync();

    // The inner div is REUSED (patched), not recreated — _onMount must not
    // re-run, so the second three() call's own closure (createRenderer:
    // stubSecond) is entirely ignored: still exactly one canvas, one
    // ResizeObserver, one onCreated call.
    expect(mountCount).toBe(1);
    expect(host.querySelectorAll("canvas")).toHaveLength(1);
    expect(ResizeObserverStub.instances).toHaveLength(1);
    expect(
      stubSecond.calls.render.length + stubSecond.calls.setSize.length,
    ).toBe(0);
  });
});

describe("three() — events", () => {
  it("events: false skips wiring canvas pointer listeners", () => {
    let capturedRoot: RootState | undefined;
    const { host } = mount({
      div: null,
      $: [
        three({
          scene: null,
          events: false,
          createRenderer: () => createStubRenderer(),
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    const canvas = host.querySelector("canvas")!;
    canvas.dispatchEvent(new Event("pointerdown", { bubbles: true }));

    expect(capturedRoot!.internal.lastEvent).toBeNull();
  });

  it("connects canvas pointer listeners by default", () => {
    let capturedRoot: RootState | undefined;
    const { host } = mount({
      div: null,
      $: [
        three({
          scene: null,
          createRenderer: () => createStubRenderer(),
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    const canvas = host.querySelector("canvas")!;
    const event = new Event("pointerdown", { bubbles: true }) as PointerEvent;
    (event as any).offsetX = 0;
    (event as any).offsetY = 0;
    (event as any).pointerId = 1;
    canvas.dispatchEvent(event);

    expect(capturedRoot!.internal.lastEvent).toBe(event);
  });
});
