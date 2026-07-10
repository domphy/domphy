import type { Listener, ReadableState, State } from "@domphy/core";

// A three.js class constructor (THREE.Mesh, THREE.BoxGeometry, a user class
// registered through extend()...). Kept loose on purpose — the package never
// pins a specific three.js version, so args/props are checked at runtime via
// duck-typing (.set/.copy/.setScalar) and the .isX flags, never with types
// tied to a particular three.js release.
export type Constructable = new (...args: any[]) => any;

// Minimal renderer contract — what the loop and patch actually call.
// WebGLRenderer satisfies it; WebGPURenderer satisfies it; tests stub it.
export interface RendererLike {
  render(scene: unknown, camera: unknown): void;
  setSize(width: number, height: number): void;
  setPixelRatio?(ratio: number): void;
  dispose?(): void;
  domElement?: HTMLCanvasElement;
  shadowMap?: { enabled: boolean; type?: number };
  toneMapping?: number;
  outputColorSpace?: string;
}

export type FrameCallback = (root: RootState, delta: number) => void;

export interface SizeState {
  width: number;
  height: number;
  dpr: number;
}

export interface RootState {
  gl: RendererLike;
  scene: any; // THREE.Scene
  camera: any; // THREE.Camera — current active camera
  canvas: HTMLCanvasElement;
  raycaster: any; // THREE.Raycaster
  pointer: any; // THREE.Vector2 — NDC coords, updated by events
  clock: any; // THREE.Clock
  frameloop: "always" | "demand" | "never";
  size: State<SizeState>; // reactive — read with size.get(listener)
  invalidate(frames?: number): void;
  advance(timestamp: number, runGlobalCallbacks?: boolean): void;
  frame(callback: FrameCallback, priority?: number): () => void;
  setFrameloop(mode: "always" | "demand" | "never"): void;
  onPointerMissed?: (event: MouseEvent) => void;
  internal: RootInternal;
}

export interface RootInternal {
  frameCallbacks: { callback: FrameCallback; priority: number }[];
  priorityCount: number; // callbacks with priority > 0 take over rendering
  interactive: any[]; // Object3D instances carrying pointer handlers
  captured: Map<number, Set<any>>; // pointerId -> capturing instances
  initialClick: [number, number];
  initialHits: any[];
  hovered: Map<string, any>; // event id -> last hover event data
  lastEvent: PointerEvent | MouseEvent | WheelEvent | null;
  active: boolean; // false after teardown — loop must stop touching this root
  frames: number; // pending demand-mode frames
  subscribersDirty: boolean;
}

// One node of the scene tree. `instance.__domphy` back-references the node.
export interface SceneNode {
  tag: string;
  instance: any;
  root: RootState;
  parent: SceneNode | null;
  children: SceneNode[];
  key: string | number | null;
  props: Record<string, any>; // last raw (unresolved) props for diffing
  attach: string | null; // resolved attach target ("geometry", "material-0", ...)
  previousAttach: any; // value restored on detach
  isPrimitive: boolean;
  autoDispose: boolean; // false when dispose: null or primitive
  releases: Array<() => void>; // reactive subscriptions, frame regs, event unbinds
  disposed: boolean;
}

export type SceneChild = Record<string, any> | null | undefined | false;
export type SceneChildren = SceneChild | SceneChild[];
export type SceneFunction = (l: Listener, root: RootState) => SceneChildren;

export interface ThreeOptions {
  scene: SceneChildren | SceneFunction;
  camera?: Record<string, any> | { instance: any };
  orthographic?: boolean;
  createRenderer?: (canvas: HTMLCanvasElement) => RendererLike;
  gl?: Record<string, any>; // WebGLRenderer constructor params when using default
  frameloop?: "always" | "demand" | "never"; // default "always"
  dpr?: number | [min: number, max: number];
  shadows?: boolean | "basic" | "percentage" | "soft" | "variance";
  flat?: boolean; // NoToneMapping
  linear?: boolean; // disable sRGB output
  raycaster?: Record<string, any>;
  events?: false; // false disables the pointer event system
  onCreated?: (root: RootState) => void;
  onPointerMissed?: (event: MouseEvent) => void;
}

// AssetResult lives in loader.ts (owned by that agent) — it is defined under
// the "Loader" section of SPEC.md, not "Shared contracts", so it is not
// re-declared here.

// Re-exported so downstream files can import shared reactivity types from
// this package's types module alongside the scene contracts above.
export type { Listener, ReadableState, State };
