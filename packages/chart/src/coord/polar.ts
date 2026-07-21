import type { AnyScale } from "../scale/index.js";
import { createLinearScale, createOrdinalScale } from "../scale/index.js";
import type {
  AngleAxisOption,
  PolarOption,
  RadiusAxisOption,
} from "../types.js";

export interface PolarCoord {
  center: [number, number];
  outerRadius: number;
  innerRadius: number;
  angleScale: AnyScale;
  radiusScale: AnyScale;
}

function resolveLength(
  value: string | number | undefined,
  containerSize: number,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  if (typeof value === "number") return value;
  if (value.endsWith("%")) return (parseFloat(value) / 100) * containerSize;
  return parseFloat(value);
}

function resolveCenter(
  center: [string | number, string | number] | undefined,
  width: number,
  height: number,
): [number, number] {
  if (!center) return [width / 2, height / 2];
  return [
    resolveLength(center[0], width, width / 2),
    resolveLength(center[1], height, height / 2),
  ];
}

function resolveRadius(
  radius: string | number | [string | number, string | number] | undefined,
  size: number,
  defaultInner: number,
  defaultOuter: number,
): [number, number] {
  if (radius === undefined) return [defaultInner, defaultOuter];
  if (!Array.isArray(radius))
    return [0, resolveLength(radius, size, defaultOuter)];
  return [
    resolveLength(radius[0], size, defaultInner),
    resolveLength(radius[1], size, defaultOuter),
  ];
}

export function resolvePolar(
  polar: PolarOption,
  angleAxis: AngleAxisOption,
  radiusAxis: RadiusAxisOption,
  series: any[],
  width: number,
  height: number,
): PolarCoord {
  const center = resolveCenter(polar.center, width, height);
  const minSize = Math.min(width, height);
  const [inner, outer] = resolveRadius(polar.radius, minSize, 0, minSize * 0.4);

  // Build angle scale
  let angleScale: AnyScale;
  if (angleAxis.type === "category") {
    const categories = (angleAxis.data ?? []) as string[];
    angleScale = createOrdinalScale(categories, [
      angleAxis.startAngle ?? 90,
      (angleAxis.startAngle ?? 90) +
        (angleAxis.clockwise === false ? -360 : 360),
    ]);
  } else {
    const angleMin = angleAxis.min !== undefined ? Number(angleAxis.min) : 0;
    const angleMax = angleAxis.max !== undefined ? Number(angleAxis.max) : 360;
    const startAngle = angleAxis.startAngle ?? 90;
    const direction = angleAxis.clockwise === false ? -1 : 1;
    angleScale = createLinearScale(
      [angleMin, angleMax],
      [startAngle, startAngle + direction * 360],
    );
  }

  // Build radius scale
  let radiusScale: AnyScale;
  if (radiusAxis.type === "category") {
    const categories = (radiusAxis.data ?? []) as string[];
    radiusScale = createOrdinalScale(categories, [inner, outer]);
  } else {
    // Compute extent from series data
    let min = 0;
    let max = 1;
    for (const s of series) {
      for (const item of s.data ?? []) {
        const value = Array.isArray(item)
          ? item[1]
          : typeof item === "number"
            ? item
            : item?.value;
        if (typeof value === "number") {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    }
    radiusScale = createLinearScale(
      [
        radiusAxis.min !== undefined ? Number(radiusAxis.min) : min,
        radiusAxis.max !== undefined ? Number(radiusAxis.max) : max,
      ],
      [inner, outer],
    );
  }

  return {
    center,
    outerRadius: outer,
    innerRadius: inner,
    angleScale,
    radiusScale,
  };
}
