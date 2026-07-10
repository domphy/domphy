import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { three } from "../src/patch.js";
import { createStubRenderer } from "./stubRenderer.js";

// Port of reference/react-three-fiber/packages/fiber/tests/events.test.tsx.
// Every case drives the REAL `three()` patch through a real mount (no hand
// built RootState/SceneNode fixtures — see tests/events-unit.test.ts for
// that level) and dispatches real PointerEvent/MouseEvent objects on the
// canvas the patch created, exactly like a browser would. `act(async () =>
// render(...))` -> `mount()` (Domphy patches apply synchronously on mount,
// no scheduler to flush). `act(async () => rerender(...))` for a prop change
// -> `toState(...)` + `.set(...)` + `flushSync()` (this package's scene
// grammar takes a `SceneFunction` reading a Domphy State instead of React
// props, per SPEC.md's "State-in" rule).

// Fixed size (no ResizeObserver "trigger" ceremony needed — this file only
// ever needs one canvas size) so NDC math is easy to reason about: center of
// screen is offsetX=400, offsetY=300.
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

class ResizeObserverStub {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(): void {
    const entry = {
      contentRect: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
  unobserve(): void {}
  disconnect(): void {}
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

function getCanvas(host: HTMLElement): HTMLCanvasElement {
  return host.querySelector("canvas")!;
}

afterEach(() => {
  document.body.innerHTML = "";
});

// A box centered at the origin, viewed by the default camera (fov 75,
// position [0, 0, 5], looking at the origin): the screen center always hits
// it, a screen corner always misses it, regardless of the exact box size.
const CENTER = { offsetX: 400, offsetY: 300 };
const CORNER = { offsetX: 0, offsetY: 0 };

// offsetX/offsetY are computed read-only getters in real browsers (based on
// layout jsdom never performs), so they cannot be supplied through the
// PointerEventInit/MouseEventInit dict — overriding them as own properties is
// the standard workaround. `target` is left alone: dispatching on the real
// canvas element already sets it correctly.
function createPointerEvent(
  type: string,
  options: { offsetX: number; offsetY: number; pointerId?: number },
): PointerEvent {
  const event = new PointerEvent(type, {
    pointerId: options.pointerId ?? 1,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, "offsetX", {
    value: options.offsetX,
    configurable: true,
  });
  Object.defineProperty(event, "offsetY", {
    value: options.offsetY,
    configurable: true,
  });
  return event;
}

function createMouseEvent(
  type: string,
  options: { offsetX: number; offsetY: number },
): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "offsetX", {
    value: options.offsetX,
    configurable: true,
  });
  Object.defineProperty(event, "offsetY", {
    value: options.offsetY,
    configurable: true,
  });
  return event;
}

function boxMesh(props: Record<string, any> = {}): Record<string, any> {
  return {
    mesh: [{ boxGeometry: null, args: [2, 2] }, { meshBasicMaterial: null }],
    ...props,
  };
}

describe("events", () => {
  it("can handle onPointerDown", () => {
    const handlePointerDown = vi.fn();
    const { host } = mount({
      div: null,
      $: [
        three({
          scene: [boxMesh({ onPointerDown: handlePointerDown })],
          createRenderer: () => createStubRenderer(),
        }),
      ],
    } as DomphyElement);

    getCanvas(host).dispatchEvent(createPointerEvent("pointerdown", CENTER));

    expect(handlePointerDown).toHaveBeenCalled();
  });

  it("can handle onPointerMissed", () => {
    const handleClick = vi.fn();
    const handleMissed = vi.fn();
    const { host } = mount({
      div: null,
      $: [
        three({
          scene: [
            boxMesh({ onPointerMissed: handleMissed, onClick: handleClick }),
          ],
          createRenderer: () => createStubRenderer(),
        }),
      ],
    } as DomphyElement);

    const event = createMouseEvent("click", CORNER);
    getCanvas(host).dispatchEvent(event);

    expect(handleClick).not.toHaveBeenCalled();
    expect(handleMissed).toHaveBeenCalledWith(event);
  });

  it("should not fire onPointerMissed when same element is clicked", () => {
    const handleClick = vi.fn();
    const handleMissed = vi.fn();
    const { host } = mount({
      div: null,
      $: [
        three({
          scene: [
            boxMesh({ onPointerMissed: handleMissed, onClick: handleClick }),
          ],
          createRenderer: () => createStubRenderer(),
        }),
      ],
    } as DomphyElement);

    const canvas = getCanvas(host);
    canvas.dispatchEvent(createPointerEvent("pointerdown", CENTER));
    canvas.dispatchEvent(createPointerEvent("pointerup", CENTER));
    canvas.dispatchEvent(createMouseEvent("click", CENTER));

    expect(handleClick).toHaveBeenCalled();
    expect(handleMissed).not.toHaveBeenCalled();
  });

  it("should not fire onPointerMissed on parent when child element is clicked", () => {
    const handleClick = vi.fn();
    const handleMissed = vi.fn();
    const { host } = mount({
      div: null,
      $: [
        three({
          scene: [
            {
              group: [boxMesh({ onClick: handleClick })],
              onPointerMissed: handleMissed,
            },
          ],
          createRenderer: () => createStubRenderer(),
        }),
      ],
    } as DomphyElement);

    const canvas = getCanvas(host);
    canvas.dispatchEvent(createPointerEvent("pointerdown", CENTER));
    canvas.dispatchEvent(createPointerEvent("pointerup", CENTER));
    canvas.dispatchEvent(createMouseEvent("click", CENTER));

    expect(handleClick).toHaveBeenCalled();
    expect(handleMissed).not.toHaveBeenCalled();
  });

  it("can handle onPointerMissed on Canvas", () => {
    const handleMissed = vi.fn();
    const { host } = mount({
      div: null,
      $: [
        three({
          scene: [boxMesh()],
          onPointerMissed: handleMissed,
          createRenderer: () => createStubRenderer(),
        }),
      ],
    } as DomphyElement);

    const event = createMouseEvent("click", CORNER);
    getCanvas(host).dispatchEvent(event);

    expect(handleMissed).toHaveBeenCalledWith(event);
  });

  it("can handle onPointerMove", () => {
    const handlePointerMove = vi.fn();
    const handlePointerOver = vi.fn();
    const handlePointerEnter = vi.fn();
    const handlePointerOut = vi.fn();
    const { host } = mount({
      div: null,
      $: [
        three({
          scene: [
            boxMesh({
              onPointerOut: handlePointerOut,
              onPointerEnter: handlePointerEnter,
              onPointerMove: handlePointerMove,
              onPointerOver: handlePointerOver,
            }),
          ],
          createRenderer: () => createStubRenderer(),
        }),
      ],
    } as DomphyElement);

    const canvas = getCanvas(host);
    canvas.dispatchEvent(createPointerEvent("pointermove", CENTER));

    expect(handlePointerMove).toHaveBeenCalled();
    expect(handlePointerOver).toHaveBeenCalled();
    expect(handlePointerEnter).toHaveBeenCalled();

    canvas.dispatchEvent(createPointerEvent("pointermove", CORNER));

    expect(handlePointerOut).toHaveBeenCalled();
  });

  it("should handle stopPropagation", () => {
    const handlePointerEnter = vi.fn((event) => {
      expect(() => event.stopPropagation()).not.toThrow();
    });
    const handlePointerLeave = vi.fn();
    const { host } = mount({
      div: null,
      $: [
        three({
          scene: [
            boxMesh({
              onPointerLeave: handlePointerLeave,
              onPointerEnter: handlePointerEnter,
            }),
            boxMesh({ "position-z": 3 }),
          ],
          createRenderer: () => createStubRenderer(),
        }),
      ],
    } as DomphyElement);

    const canvas = getCanvas(host);
    canvas.dispatchEvent(createPointerEvent("pointermove", CENTER));

    expect(handlePointerEnter).toHaveBeenCalled();

    canvas.dispatchEvent(createPointerEvent("pointermove", CORNER));

    expect(handlePointerLeave).toHaveBeenCalled();
  });

  it("should handle stopPropagation on click events", () => {
    const handleClickFront = vi.fn((event) => event.stopPropagation());
    const handleClickRear = vi.fn();
    const { host } = mount({
      div: null,
      $: [
        three({
          scene: [
            boxMesh({ onClick: handleClickFront }),
            boxMesh({ onClick: handleClickRear, "position-z": -3 }),
          ],
          createRenderer: () => createStubRenderer(),
        }),
      ],
    } as DomphyElement);

    const canvas = getCanvas(host);
    canvas.dispatchEvent(createPointerEvent("pointerdown", CENTER));
    canvas.dispatchEvent(createPointerEvent("pointerup", CENTER));
    canvas.dispatchEvent(createMouseEvent("click", CENTER));

    expect(handleClickFront).toHaveBeenCalled();
    expect(handleClickRear).not.toHaveBeenCalled();
  });

  describe("swapping instances", () => {
    it("re-registers events when a primitive object prop is swapped", () => {
      const handleClick = vi.fn();
      const meshA = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2),
        new THREE.MeshBasicMaterial(),
      );
      const meshB = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2),
        new THREE.MeshBasicMaterial(),
      );
      const objectState = toState<THREE.Object3D>(meshA);

      const { host } = mount({
        div: null,
        $: [
          three({
            scene: (l: any) => [
              {
                primitive: null,
                object: objectState.get(l),
                onClick: handleClick,
              },
            ],
            createRenderer: () => createStubRenderer(),
          }),
        ],
      } as DomphyElement);

      // Swap the underlying THREE object — this triggers reconciler
      // reconstruction.
      objectState.set(meshB);
      flushSync();

      const canvas = getCanvas(host);
      canvas.dispatchEvent(createPointerEvent("pointerdown", CENTER));
      canvas.dispatchEvent(createPointerEvent("pointerup", CENTER));
      canvas.dispatchEvent(createMouseEvent("click", CENTER));

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick.mock.calls[0][0].eventObject).toBe(meshB);
    });

    it("re-registers events when an args change reconstructs the instance", () => {
      const handleClick = vi.fn();
      const geometry = new THREE.BoxGeometry(2, 2);
      const materialA = new THREE.MeshBasicMaterial();
      const materialB = new THREE.MeshBasicMaterial();
      const materialState = toState<THREE.Material>(materialA);

      const { host } = mount({
        div: null,
        $: [
          three({
            scene: (l: any) => [
              {
                mesh: null,
                args: [geometry, materialState.get(l)],
                onClick: handleClick,
              },
            ],
            createRenderer: () => createStubRenderer(),
          }),
        ],
      } as DomphyElement);

      // Reconstruct the mesh via args change while keeping onClick attached.
      materialState.set(materialB);
      flushSync();

      const canvas = getCanvas(host);
      canvas.dispatchEvent(createPointerEvent("pointerdown", CENTER));
      canvas.dispatchEvent(createPointerEvent("pointerup", CENTER));
      canvas.dispatchEvent(createMouseEvent("click", CENTER));

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(
        (handleClick.mock.calls[0][0].eventObject as THREE.Mesh).material,
      ).toBe(materialB);
    });

    it("keeps previous event state when an instance is swapped", () => {
      const handlePointerEnter = vi.fn();
      const handlePointerLeave = vi.fn();
      const handlePointerMove = vi.fn();
      const geometry = new THREE.BoxGeometry(2, 2);
      const materialA = new THREE.MeshBasicMaterial();
      const materialB = new THREE.MeshBasicMaterial();
      const materialState = toState<THREE.Material>(materialA);

      const { host } = mount({
        div: null,
        $: [
          three({
            scene: (l: any) => [
              {
                mesh: null,
                args: [geometry, materialState.get(l)],
                onPointerEnter: handlePointerEnter,
                onPointerLeave: handlePointerLeave,
                onPointerMove: handlePointerMove,
              },
            ],
            createRenderer: () => createStubRenderer(),
          }),
        ],
      } as DomphyElement);

      const canvas = getCanvas(host);

      // Move pointer over the mesh to establish hovered state.
      canvas.dispatchEvent(createPointerEvent("pointermove", CENTER));

      expect(handlePointerEnter).toHaveBeenCalledTimes(1);
      expect(handlePointerMove).toHaveBeenCalledTimes(1);

      // Swap instance via args change — should NOT trigger leave/enter.
      materialState.set(materialB);
      flushSync();

      expect(handlePointerLeave).not.toHaveBeenCalled();
      expect(handlePointerEnter).toHaveBeenCalledTimes(1);

      // Moving again over the same spot should still fire move, not a new
      // enter.
      canvas.dispatchEvent(createPointerEvent("pointermove", CENTER));

      expect(handlePointerMove).toHaveBeenCalledTimes(2);
      expect(handlePointerEnter).toHaveBeenCalledTimes(1);
      expect(handlePointerLeave).not.toHaveBeenCalled();
    });
  });

  describe("web pointer capture", () => {
    const pointerId = 1234;

    function mountCaptureTest(options: {
      hasMesh: boolean;
      manualRelease?: boolean;
    }): {
      canvas: HTMLCanvasElement;
      hasMeshState: ReturnType<typeof toState<boolean>>;
      handlePointerDown: ReturnType<typeof vi.fn>;
      handlePointerMove: ReturnType<typeof vi.fn>;
      handlePointerUp: ReturnType<typeof vi.fn>;
      handlePointerEnter: ReturnType<typeof vi.fn>;
      handlePointerLeave: ReturnType<typeof vi.fn>;
    } {
      const handlePointerMove = vi.fn();
      const handlePointerDown = vi.fn((event: any) =>
        event.target.setPointerCapture(event.nativeEvent.pointerId),
      );
      const handlePointerUp = vi.fn((event: any) =>
        event.target.releasePointerCapture(event.nativeEvent.pointerId),
      );
      const handlePointerEnter = vi.fn();
      const handlePointerLeave = vi.fn();
      const hasMeshState = toState<boolean>(options.hasMesh);

      const { host } = mount({
        div: null,
        $: [
          three({
            scene: (l: any) =>
              hasMeshState.get(l)
                ? [
                    boxMesh({
                      onPointerDown: handlePointerDown,
                      onPointerMove: handlePointerMove,
                      onPointerUp: options.manualRelease
                        ? handlePointerUp
                        : undefined,
                      onPointerLeave: handlePointerLeave,
                      onPointerEnter: handlePointerEnter,
                    }),
                  ]
                : [],
            createRenderer: () => createStubRenderer(),
          }),
        ],
      } as DomphyElement);

      const canvas = getCanvas(host);
      canvas.setPointerCapture = vi.fn();
      canvas.releasePointerCapture = vi.fn();

      return {
        canvas,
        hasMeshState,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerEnter,
        handlePointerLeave,
      };
    }

    it("should release when the capture target is unmounted", () => {
      const { canvas, hasMeshState, handlePointerDown, handlePointerMove } =
        mountCaptureTest({
          hasMesh: true,
        });

      canvas.dispatchEvent(
        createPointerEvent("pointerdown", { ...CENTER, pointerId }),
      );

      // This should have captured the DOM pointer.
      expect(handlePointerDown).toHaveBeenCalledTimes(1);
      expect(canvas.setPointerCapture).toHaveBeenCalledWith(pointerId);
      expect(canvas.releasePointerCapture).not.toHaveBeenCalled();

      // Now remove the mesh.
      hasMeshState.set(false);
      flushSync();

      expect(canvas.releasePointerCapture).toHaveBeenCalledWith(pointerId);

      canvas.dispatchEvent(
        createPointerEvent("pointermove", { ...CENTER, pointerId }),
      );

      // There should now be no pointer capture.
      expect(handlePointerMove).not.toHaveBeenCalled();
    });

    it("should not leave when captured", () => {
      const {
        canvas,
        handlePointerMove,
        handlePointerEnter,
        handlePointerLeave,
      } = mountCaptureTest({
        hasMesh: true,
        manualRelease: true,
      });

      const moveIn = { ...CENTER, pointerId };
      const moveOut = { offsetX: -10000, offsetY: -10000, pointerId };

      canvas.dispatchEvent(createPointerEvent("pointermove", moveIn));
      expect(handlePointerEnter).toHaveBeenCalledTimes(1);
      expect(handlePointerMove).toHaveBeenCalledTimes(1);

      canvas.dispatchEvent(
        createPointerEvent("pointerdown", { ...CENTER, pointerId }),
      );

      // If we move the pointer now, when it is captured, it should raise
      // the onPointerMove event even though the pointer is not over the
      // element, and NOT raise the onPointerLeave event.
      canvas.dispatchEvent(createPointerEvent("pointermove", moveOut));
      expect(handlePointerMove).toHaveBeenCalledTimes(2);
      expect(handlePointerLeave).not.toHaveBeenCalled();

      canvas.dispatchEvent(createPointerEvent("pointermove", moveIn));
      expect(handlePointerMove).toHaveBeenCalledTimes(3);

      canvas.dispatchEvent(
        createPointerEvent("pointerup", { ...CENTER, pointerId }),
      );
      canvas.dispatchEvent(
        createPointerEvent("lostpointercapture", { ...CENTER, pointerId }),
      );

      // The pointer is still over the element, so onPointerLeave should not
      // have been called.
      expect(handlePointerLeave).not.toHaveBeenCalled();

      // The element pointer should no longer be captured, so moving it away
      // should call onPointerLeave.
      canvas.dispatchEvent(createPointerEvent("pointermove", moveOut));
      expect(handlePointerEnter).toHaveBeenCalledTimes(1);
      expect(handlePointerLeave).toHaveBeenCalledTimes(1);
    });
  });

  it("can handle primitives", () => {
    const handlePointerDownOuter = vi.fn();
    const handlePointerDownInner = vi.fn();
    const object = new THREE.Group();
    object.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(2, 2),
        new THREE.MeshBasicMaterial(),
      ),
    );

    const { host } = mount({
      div: null,
      $: [
        three({
          scene: [
            {
              group: [
                {
                  primitive: null,
                  object,
                  name: "test",
                  onPointerDown: handlePointerDownInner,
                },
              ],
              onPointerDown: handlePointerDownOuter,
            },
          ],
          createRenderer: () => createStubRenderer(),
        }),
      ],
    } as DomphyElement);

    getCanvas(host).dispatchEvent(createPointerEvent("pointerdown", CENTER));

    expect(handlePointerDownOuter).toHaveBeenCalled();
    expect(handlePointerDownInner).toHaveBeenCalled();
  });
});
