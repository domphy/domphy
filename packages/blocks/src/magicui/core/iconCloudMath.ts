// Pure geometry helpers behind magicui's Icon Cloud (../iconCloud.ts) —
// rotation and easing math with no DOM/canvas dependency, split out so
// `iconCloud.ts` exports exactly one thing: the `iconCloud()` block factory.
// Kept in their own module (not "beside" the factory) so a tool that treats
// every exported function in a block's file as a callable-with-no-args
// factory (e.g. a raw doctor CLI scan) does not mistake these arg-taking
// math helpers for one and report a false "factory threw".

export interface SpherePoint {
  x: number;
  y: number;
  z: number;
}

export function rotatePoint(
  point: SpherePoint,
  yaw: number,
  pitch: number,
): SpherePoint {
  // Matches upstream's projection exactly: yaw (spin about the vertical axis)
  // is applied first and alone determines depth (z), then pitch only slides the
  // point vertically (y) reusing that pre-pitch depth — a deliberately partial,
  // non-orthonormal rotation. Consequences that make it faithful to upstream:
  // vertical drag moves icons up/down WITHOUT changing their depth/scale, and
  // the yaw handedness (sign of the sin terms) matches, so horizontal drag
  // spins the sphere the same direction as the reference.
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const rotatedX = point.x * cosYaw - point.z * sinYaw;
  const rotatedZ = point.x * sinYaw + point.z * cosYaw;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const rotatedY = point.y * cosPitch + rotatedZ * sinPitch;
  return { x: rotatedX, y: rotatedY, z: rotatedZ };
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** The absolute yaw/pitch that, applied via `rotatePoint`, bring `point` to the
 * screen center (projected to the canvas center, on the viewer-facing side).
 * Independent of the current rotation — the tween interpolates from wherever the
 * sphere currently sits to these target angles. Uses upstream's exact target
 * formula (yaw = atan2(x, z), pitch = -atan2(y, r_xz)); under the partial
 * rotation the focused point lands at x=0, y=0 with depth r_xz — upstream does
 * not renormalize it to the front pole, so neither do we. */
export function focusRotationForPoint(point: SpherePoint): {
  yaw: number;
  pitch: number;
} {
  const radiusInXZ = Math.sqrt(point.x * point.x + point.z * point.z);
  return {
    yaw: Math.atan2(point.x, point.z),
    pitch: -Math.atan2(point.y, radiusInXZ),
  };
}
