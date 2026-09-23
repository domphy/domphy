// Fixture for tests/types.test.ts — compiled by tsc under `strict`.
//
// Truth source: react-three-fiber's typing contract (ThreeElements /
// EventHandlers / useFrame's RootState) — every callback written inline in a
// scene description is contextually typed, so scene code needs ZERO parameter
// annotations and a wrong member access is a compile error.
//
// Each `@ts-expect-error` below marks a line that MUST fail to compile. If the
// scene types ever degrade back to `any`, those lines start compiling and tsc
// reports TS2578 ("unused @ts-expect-error") — so `tsc` exiting non-zero
// catches the regression in BOTH directions.
import { three } from "../../src/index.js";

three({
  scene: [
    {
      mesh: [
        { boxGeometry: null, args: [1, 1, 1] },
        {
          meshStandardMaterial: null,
          // Rule 7 reactive prop, nested inside a tag value: `l` is a Listener.
          color: (l) => {
            // @ts-expect-error Listener is not a number
            l.toFixed(2);
            return "#ffffff";
          },
        },
      ],
      position: [0, 0, 0],
      onClick: (event) => {
        event.point.x.toFixed(2);
        event.stopPropagation();
        event.nativeEvent.altKey;
        // @ts-expect-error not a member of ThreeEvent<MouseEvent>
        event.notAProp;
      },
      onWheel: (event) => {
        // Native event value props are merged onto the ThreeEvent at runtime.
        event.deltaY.toFixed(2);
        // @ts-expect-error not a member of WheelEvent
        event.deltaNope;
      },
      onPointerMissed: (event) => {
        event.clientX.toFixed(2);
      },
      // Rule 2 — (root, delta, instance), r3f's useFrame equivalent.
      onFrame: (root, delta, self) => {
        root.invalidate();
        delta.toFixed(2);
        self.rotation.y += delta;
        // @ts-expect-error not a member of RootState
        root.nope();
      },
      onUpdate: (self) => self.updateMatrixWorld(),
      // Rule 4 — three's own assignable callbacks keep their full arity.
      onBeforeRender: (renderer, scene, camera, geometry, material, group) => {
        void [renderer, scene, camera, geometry, material, group];
      },
      // Rule 5 — an `on[A-Z]` key with no matching instance property binds
      // through addEventListener as (event, root, instance).
      onChange: (_event, root, _self) => {
        root.invalidate();
        // @ts-expect-error not a member of RootState
        root.nope2();
      },
    },
  ],
  // Rule: args may be a function resolved against the live root.
  camera: { position: [0, 0, 5] },
  onCreated: (root) => {
    root.setSize(10, 10);
    // @ts-expect-error not a member of CreatedRootState
    root.nope3();
  },
});

three({
  scene: (l, root) => {
    root.invalidate();
    return [
      {
        orbitControls: null,
        args: (_listener, innerRoot) => [innerRoot.camera, innerRoot.canvas],
        // @ts-expect-error Listener is not a number
        rotation: [l.toFixed(2), 0, 0],
      },
    ];
  },
});
