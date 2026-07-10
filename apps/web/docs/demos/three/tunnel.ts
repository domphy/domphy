import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";
import { BackSide, CatmullRomCurve3, Vector3 } from "three";

// Closed flight path: radius and height both wobble at different frequencies
// so the loop reads as an organic warped tube rather than a flat ring.
const PATH_POINTS = 10;
const pathPoints: Vector3[] = [];
for (let index = 0; index < PATH_POINTS; index++) {
  const angle = (index / PATH_POINTS) * Math.PI * 2;
  const radius = 14 + Math.sin(angle * 3) * 4;
  const height = Math.sin(angle * 2) * 5 + Math.cos(angle * 5) * 2;
  pathPoints.push(
    new Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius),
  );
}
const flightPath = new CatmullRomCurve3(pathPoints, true, "catmullrom", 0.5);

const TUBE_RADIUS = 2.2;
const TUBULAR_SEGMENTS = 300;
const RADIAL_SEGMENTS = 12;
const BACKDROP_COLOR = "#05030c";

// How far ahead along the curve the camera aims, in loop-fraction units —
// small enough that direction changes stay smooth through tight curve bends.
const LOOK_AHEAD = 0.02;

// Flight speed, in loop-fractions/second, driven by onWheel — a plain
// closure variable (not a State) since only this demo's own onWheel/onFrame
// closures ever read or write it.
const SPEED_MIN = 0.015;
const SPEED_MAX = 0.35;
let speed = 0.06;
let flightPosition = 0;

const startPoint = flightPath.getPointAt(0);

// 5 colored point lights seated on the path itself, so the tube walls light
// up in alternating violet/cyan/magenta bands as the camera flies past them.
const LIGHT_COLORS = ["#8b5cf6", "#22d3ee", "#ec4899", "#8b5cf6", "#22d3ee"];
const tunnelLights = LIGHT_COLORS.map((color, index) => {
  const point = flightPath.getPointAt(index / LIGHT_COLORS.length);
  return {
    pointLight: null,
    position: [point.x, point.y, point.z],
    intensity: 70,
    distance: 10,
    decay: 2,
    color,
  };
});

const App: DomphyElement<"div"> = {
  div: null,
  style: {
    width: "100%",
    height: "440px",
    borderRadius: "12px",
    overflow: "hidden",
  },
  $: [
    three({
      camera: {
        position: [startPoint.x, startPoint.y, startPoint.z],
        fov: 80,
        near: 0.05,
        far: 60,
      },
      onCreated: (root) => {
        root.camera.lookAt(flightPath.getPointAt(LOOK_AHEAD));
      },
      scene: [
        { color: null, attach: "background", args: [BACKDROP_COLOR] },
        // Fog matches the backdrop so the tunnel dissolves into it a short
        // way ahead instead of showing a hard cutoff down the corridor.
        { fog: null, args: [BACKDROP_COLOR, 8, 30] },
        { ambientLight: null, intensity: 0.6, color: "#4b3b73" },
        ...tunnelLights,
        {
          mesh: [
            {
              tubeGeometry: null,
              args: [
                flightPath,
                TUBULAR_SEGMENTS,
                TUBE_RADIUS,
                RADIAL_SEGMENTS,
                true,
              ],
            },
            {
              // BackSide renders the *inside* of the tube — the camera
              // travels through the geometry's interior, not around it.
              meshStandardMaterial: null,
              color: "#2a1f45",
              roughness: 0.55,
              metalness: 0.25,
              side: BackSide,
            },
          ],
          // Wheel target: the tube fills the whole view (camera is always
          // inside it), so it's the natural raycast surface for onWheel.
          onWheel: (event) => {
            event.nativeEvent.preventDefault();
            speed = Math.min(
              SPEED_MAX,
              Math.max(SPEED_MIN, speed + event.deltaY * 0.00025),
            );
          },
          // Camera path animation: advance a loop-fraction position each
          // frame, place the camera there, and look a bit further ahead
          // along the curve so it always faces the direction of travel.
          onFrame: (root, delta) => {
            flightPosition = (flightPosition + delta * speed) % 1;
            const position = flightPath.getPointAt(flightPosition);
            const lookTarget = flightPath.getPointAt(
              (flightPosition + LOOK_AHEAD) % 1,
            );
            root.camera.position.copy(position);
            root.camera.lookAt(lookTarget);
          },
        },
        {
          // Wireframe overlay on the same tube geometry gives the corridor
          // a scrolling grid pattern — the classic cue that makes flight
          // speed and curvature legible instead of a flat lit surface.
          mesh: [
            {
              tubeGeometry: null,
              args: [
                flightPath,
                TUBULAR_SEGMENTS,
                TUBE_RADIUS,
                RADIAL_SEGMENTS,
                true,
              ],
            },
            {
              meshBasicMaterial: null,
              color: "#ffffff",
              wireframe: true,
              transparent: true,
              opacity: 0.12,
              side: BackSide,
            },
          ],
        },
      ],
    }),
  ],
};

export default App;
