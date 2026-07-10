import type { RendererLike } from "../src/types.js";

export interface StubRenderer extends RendererLike {
  calls: {
    render: Array<[scene: unknown, camera: unknown]>;
    setSize: Array<[width: number, height: number]>;
    setPixelRatio: Array<[ratio: number]>;
    dispose: number;
    forceContextLoss: number;
  };
  renderLists: { dispose: () => void };
  forceContextLoss: () => void;
}

// A RendererLike stub with no WebGL context, so every test in this package
// can run under jsdom. Records every call so tests can assert on loop/patch
// behavior (e.g. "did the loop call render exactly once per advance()").
// `renderLists`/`forceContextLoss` mirror the real (non-contractual, WebGL-
// specific) THREE.WebGLRenderer members patch.ts's teardown reaches for
// defensively — stubbed here so a regression test can assert they're called.
export function createStubRenderer(): StubRenderer {
  const calls: StubRenderer["calls"] = {
    render: [],
    setSize: [],
    setPixelRatio: [],
    dispose: 0,
    forceContextLoss: 0,
  };

  return {
    calls,
    domElement: undefined,
    shadowMap: { enabled: false },
    toneMapping: 0,
    outputColorSpace: "",
    renderLists: { dispose: () => {} },
    forceContextLoss() {
      calls.forceContextLoss += 1;
    },
    render(scene: unknown, camera: unknown) {
      calls.render.push([scene, camera]);
    },
    setSize(width: number, height: number) {
      calls.setSize.push([width, height]);
    },
    setPixelRatio(ratio: number) {
      calls.setPixelRatio.push([ratio]);
    },
    dispose() {
      calls.dispose += 1;
    },
  };
}
