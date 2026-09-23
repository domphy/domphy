import type { Listener, ReadableState, State } from "@domphy/core";
import type { WebGLRendererParameters } from "three";
import type { EventPrefix, ThreeEvent } from "./events.js";

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

// A fixed ratio, or a [min, max] clamp around the real devicePixelRatio.
export type Dpr = number | [min: number, max: number];

// The visible slice of the world at a given distance from the camera — what
// r3f exposes as `state.viewport`. `width`/`height` are WORLD units (so a
// plane scaled to them exactly fills the frame), `factor` is CSS pixels per
// world unit, and `distance` is how far the camera is from the measured
// target.
export interface ViewportState {
  width: number;
  height: number;
  aspect: number;
  distance: number;
  factor: number;
  dpr: number;
}

export interface RootState {
  gl: RendererLike;
  scene: any; // THREE.Scene
  camera: any; // THREE.Camera — current active camera
  canvas: HTMLCanvasElement;
  raycaster: any; // THREE.Raycaster
  pointer: any; // THREE.Vector2 — NDC coords, updated by events
  clock: any; // FrameClock — THREE.Clock's API (getDelta/getElapsedTime/…)
  frameloop: "always" | "demand" | "never";
  size: State<SizeState>; // reactive — read with size.get(listener)
  // World-unit size of the visible frame. Reads `size` through `listener`, so
  // `(l) => root.viewport(l).width` re-runs on every resize. `camera` defaults
  // to the root camera and `target` to the world origin.
  viewport(
    listener?: Listener | null,
    camera?: any,
    target?: any,
  ): ViewportState;
  invalidate(frames?: number): void;
  advance(timestamp: number, runGlobalCallbacks?: boolean): void;
  frame(callback: FrameCallback, priority?: number): () => void;
  setFrameloop(mode: "always" | "demand" | "never"): void;
  onPointerMissed?: (event: MouseEvent) => void;
  internal: RootInternal;
}

// The object onCreated(root) receives: RootState plus setSize (r3f's
// store.ts RootState.setSize shortcut). Kept off the shared RootState
// contract so SceneNode.root / FrameCallback stay the narrower shape.
export type CreatedRootState = RootState & {
  setSize(width: number, height: number, dpr?: Dpr): void;
};

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
  props: SceneProps; // last raw (unresolved) props for diffing
  attach: string | null; // resolved attach target ("geometry", "material-0", ...)
  previousAttach: any; // value restored on detach
  isPrimitive: boolean;
  autoDispose: boolean; // false when dispose: null or primitive
  releases: Array<() => void>; // reactive subscriptions, frame regs, event unbinds
  disposed: boolean;
}

// ---- Scene description -----------------------------------------------------
// The types below exist for CONTEXTUAL TYPING, not for validation: the scene
// grammar is open (any registered tag, any three.js prop, any pierced path),
// so nothing here rejects a key. What they buy is that every callback written
// inline in a scene gets its parameter types without a single annotation in
// user code — the r3f equivalent of `ThreeElements`/`EventHandlers`. That is
// why `SceneValue` is a UNION with exactly one call signature rather than
// `any`: TS picks the function constituent to type an arrow literal and the
// `SceneChildren` constituent to type a nested tag value, while `{}` keeps
// every other three.js value (a Color, a Texture, a number array) assignable.

// Function-prop rule 7: a reactive value. `color: (l) => themeColor(l, "text")`.
export type ReactiveProp<T = any> = (listener: Listener, root: RootState) => T;

// Function-prop rule 5/6: an instance event bound through
// `EventDispatcher.addEventListener` — `onChange: (event, root, self) => …`.
// The trailing rest param is load-bearing, not decorative: this same type
// also contextually types the general `on${string}` index signature below,
// which an extend()-ed class's OWN on-key callback (rule 4 — assigned
// straight onto the instance when `key in instance`, arbitrary arity per
// that class's own signature) falls through to whenever it isn't one of the
// 5 well-known three.js callbacks declared explicitly. Without the rest
// param, TS's contextual typing of a >3-arg literal against a fixed 3-arg
// signature leaves every extra param implicitly `any` (TS7006 under
// noImplicitAny) — and a union with a separate variadic signature doesn't
// help either, since TS can't contextually type a function literal against
// an ambiguous union of call signatures (it falls back to implicit `any` on
// ALL params, defeating the RootState typing on `root` this type exists for).
export type InstanceEventHandler = (
  event: any,
  root: RootState,
  self: any,
  ...rest: any[]
) => void;

// Everything a prop may hold that is NOT a callback. `{}` is the catch-all
// for arbitrary three.js values; it carries no call signature, so it never
// competes with the handler constituents for contextual typing.
type SceneStaticValue = SceneChildren | {} | null | undefined;

export type SceneValue = ReactiveProp | SceneStaticValue;

// One node of the scene description: `{ <tag>: children, ...props }`.
export interface SceneProps {
  // Rule 1 — pointer events, dispatched through the raycaster.
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onContextMenu?: (event: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
  onWheel?: (event: ThreeEvent<WheelEvent>) => void;
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerEnter?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerLeave?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerCancel?: (event: ThreeEvent<PointerEvent>) => void;
  onLostPointerCapture?: (event: ThreeEvent<PointerEvent>) => void;
  // Fired with the raw DOM event (no hit to report) — r3f parity.
  onPointerMissed?: (event: MouseEvent) => void;

  // Rule 2 — per-frame callback, invoked as (root, delta, instance).
  onFrame?: (root: RootState, delta: number, self: any) => void;
  onFramePriority?: number;

  // Rule 3 — invoked with the instance after every props application.
  onUpdate?: (self: any) => void;

  // Rule 4 — three's own assignable callbacks, set straight onto the
  // instance. Their signatures differ per class and per three.js version, so
  // they take an explicit `any` rest rather than this package's handler shape.
  onBeforeRender?: (...args: any[]) => void;
  onAfterRender?: (...args: any[]) => void;
  onBeforeShadow?: (...args: any[]) => void;
  onAfterShadow?: (...args: any[]) => void;
  onBeforeCompile?: (...args: any[]) => void;

  // Rule 6 — event names bound verbatim.
  on?: Record<string, InstanceEventHandler>;

  // Reconciler bookkeeping (never assigned onto the instance).
  args?: any[] | ReactiveProp<any[]>;
  // A dashed path, or a function whose return value (when it returns one)
  // becomes the detach cleanup `(parentInstance, childInstance) => void`.
  attach?: string | ((parent: any, self: any) => any) | null;
  dispose?: null;
  object?: any;
  _key?: string | number;
  _doctorDisable?: boolean | string | string[];

  // Rules 5/6 — any other `on[A-Z]…` key binds through addEventListener.
  // Template-literal index signature keys need TS >= 4.4 — gated in
  // package.json's peerDependencies (optional peer, so a JS-only consumer
  // with no TypeScript installed at all is unaffected).
  [key: `on${string}`]: InstanceEventHandler | SceneStaticValue;
  // The tag key and every other prop (static, pierced, or reactive).
  [key: string]: SceneValue;
}

export type SceneChild = SceneProps | null | undefined | false;
export type SceneChildren = SceneChild | SceneChild[];
export type SceneFunction = (l: Listener, root: RootState) => SceneChildren;

export interface ThreeOptions {
  scene: SceneChildren | SceneFunction;
  // A bag of camera props applied through applyProps (same rules/typing as
  // any scene node's own props — static, pierced, reactive, function-prop
  // rules 1-7 all apply), OR `{ instance }` to adopt a caller-owned camera
  // verbatim (patch.ts skips applyProps entirely for that shape).
  camera?: SceneProps | { instance: any };
  orthographic?: boolean;
  createRenderer?: (canvas: HTMLCanvasElement) => RendererLike;
  // WebGLRenderer constructor params merged over the defaults
  // `{ powerPreference: "high-performance", antialias: true, alpha: true }`.
  // Only read when `createRenderer` is absent — a custom renderer factory
  // owns its own construction and never sees this bag.
  gl?: WebGLRendererParameters;
  frameloop?: "always" | "demand" | "never"; // default "always"
  dpr?: Dpr; // default [1, 2] — devicePixelRatio, capped at 2
  shadows?: boolean | "basic" | "percentage" | "soft" | "variance";
  flat?: boolean; // NoToneMapping
  linear?: boolean; // disable sRGB output
  // A bag of raycaster props applied through applyProps, same as `camera`
  // above; `params` is merged onto the existing per-object-type thresholds
  // rather than replacing them wholesale (patch.ts).
  raycaster?: SceneProps;
  // Text placed inside the <canvas> as its fallback content — the accessible
  // name assistive technology reads for the scene, the way `alt` names an
  // image. A 3D canvas has no other accessible representation, so without it
  // the scene is an unlabelled graphic (r3f's `fallback` prop).
  fallback?: string;
  events?: false; // false disables the pointer event system
  // DOM node to bind pointer listeners to instead of the canvas — for an
  // HTML overlay positioned on top of the canvas that would otherwise
  // swallow the events three needs to raycast (r3f's Canvas `eventSource`).
  eventSource?: HTMLElement | Document;
  // Which coordinate pair click-distance measurement reads off the native
  // event; only matters when `eventSource` isn't the canvas itself, since
  // "offset" (the default) is relative to event.target. r3f's `eventPrefix`.
  eventPrefix?: EventPrefix;
  onCreated?: (root: CreatedRootState) => void;
  onPointerMissed?: (event: MouseEvent) => void;
}

// AssetResult lives in loader.ts (owned by that agent) — it is defined under
// the "Loader" section of SPEC.md, not "Shared contracts", so it is not
// re-declared here.

// Re-exported so downstream files can import shared reactivity types from
// this package's types module alongside the scene contracts above.
export type { Listener, ReadableState, State };
