// Port of reference/react-three-fiber/packages/fiber/tests/index.test.tsx —
// the public API surface acceptance test named in SPEC.md's Testing section.
// React/zustand/xr/portal-specific cases have no Domphy equivalent and are
// NOT ported here; see tests/PORT-NOTES.md (index.test.tsx section) for the
// full accounting (never .skip — every unported upstream case gets a
// one-line reason instead).

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import * as ThreeBarrel from "../src/index.js";
import { three } from "../src/patch.js";
import { calculateDpr } from "../src/rootState.js";
import type { RootState, ThreeOptions } from "../src/types.js";
import { createStubRenderer } from "./stubRenderer.js";

// Same ResizeObserver stub pattern as patch.test.ts (three() always wires one
// on mount) — kept local rather than shared since it's a few lines and each
// test file already owns its jsdom globals independently.
class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverStub.instances.push(this);
  }

  observe(): void {}
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

afterEach(() => {
  document.body.innerHTML = "";
  ResizeObserverStub.instances.length = 0;
});

describe("three() — camera (upstream: 'will make an Orthographic Camera & set the position')", () => {
  it("builds an OrthographicCamera and applies the camera position prop", () => {
    let capturedRoot: RootState | undefined;
    mount({
      div: null,
      $: [
        three({
          scene: null,
          orthographic: true,
          camera: { position: [0, 0, 5] },
          createRenderer: () => createStubRenderer(),
          onCreated: (root) => {
            capturedRoot = root;
          },
        }),
      ],
    } as DomphyElement);

    expect(capturedRoot!.camera).toBeInstanceOf(THREE.OrthographicCamera);
    expect(capturedRoot!.camera.position.z).toEqual(5);
  });
});

describe("three() — dpr (upstream: 'should handle the DPR prop reactively')", () => {
  it("resolves, reactively updates, and re-clamps dpr through a ReadableState<ThreeOptions>", () => {
    const stub = createStubRenderer();
    let capturedRoot: RootState | undefined;
    const optionsState = toState<ThreeOptions>({
      scene: null,
      dpr: [1, 2],
      createRenderer: () => stub,
      onCreated: (root) => {
        capturedRoot = root;
      },
    });

    mount({ div: null, $: [three(optionsState)] } as DomphyElement);

    // Initial clamp (jsdom's devicePixelRatio defaults to 1).
    expect(capturedRoot!.size.get().dpr).toEqual(calculateDpr([1, 2]));

    // Reactive update: a plain number passes through unchanged.
    optionsState.set({ scene: null, dpr: 0.1, createRenderer: () => stub });
    flushSync();
    expect(capturedRoot!.size.get().dpr).toEqual(0.1);

    // Reactive clamp: back to a [min, max] range.
    optionsState.set({ scene: null, dpr: [1, 2], createRenderer: () => stub });
    flushSync();
    expect(capturedRoot!.size.get().dpr).toEqual(calculateDpr([1, 2]));
  });
});

describe("three() — renderer config (upstream: shadows/tonemapping/colorSpace)", () => {
  it("should set PCFSoftShadowMap as the default shadow map", () => {
    const stub = createStubRenderer();
    mount({
      div: null,
      $: [three({ scene: null, shadows: true, createRenderer: () => stub })],
    } as DomphyElement);

    expect(stub.shadowMap!.type).toBe(THREE.PCFSoftShadowMap);
  });

  it("sets tonemapping to ACESFilmicToneMapping and outputColorSpace to SRGBColorSpace when linear is false", () => {
    const stub = createStubRenderer();
    mount({
      div: null,
      $: [three({ scene: null, linear: false, createRenderer: () => stub })],
    } as DomphyElement);

    expect(stub.toneMapping).toBe(THREE.ACESFilmicToneMapping);
    expect(stub.outputColorSpace).toBe(THREE.SRGBColorSpace);
  });

  it("should respect color management preferences via linear (renderer outputColorSpace + texture colorSpace)", () => {
    const linearStub = createStubRenderer();
    const linearTexture = new THREE.Texture();
    mount({
      div: null,
      $: [
        three({
          scene: [{ mesh: [{ meshBasicMaterial: null, map: linearTexture }] }],
          linear: true,
          createRenderer: () => linearStub,
        }),
      ],
    } as DomphyElement);

    expect(linearStub.outputColorSpace).toBe(THREE.LinearSRGBColorSpace);
    expect(linearTexture.colorSpace).toBe(THREE.NoColorSpace);

    const srgbStub = createStubRenderer();
    const srgbTexture = new THREE.Texture();
    mount({
      div: null,
      $: [
        three({
          scene: [{ mesh: [{ meshBasicMaterial: null, map: srgbTexture }] }],
          linear: false,
          createRenderer: () => srgbStub,
        }),
      ],
    } as DomphyElement);

    expect(srgbStub.outputColorSpace).toBe(THREE.SRGBColorSpace);
    expect(srgbTexture.colorSpace).toBe(THREE.SRGBColorSpace);
  });
});

describe("exports (upstream: 'matches public API')", () => {
  it("matches SPEC.md Definition of done #6 exactly: three, extend, loadAsset, preloadAsset, clearAsset", () => {
    expect(Object.keys(ThreeBarrel).sort()).toEqual(
      ["clearAsset", "extend", "loadAsset", "preloadAsset", "three"].sort(),
    );
  });
});
