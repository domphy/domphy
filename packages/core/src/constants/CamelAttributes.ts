// SVG attribute names that are genuinely camelCase in the SVG spec and must be
// emitted VERBATIM. Every other key goes through `camelToKebab()`, which is what
// turns `alignmentBaseline` into the real `alignment-baseline`. A spec-camelCase
// name missing from this list is silently kebab-cased and SVG then ignores it —
// `attributeName` became `attribute-name`, so every SMIL animation Domphy
// rendered was inert (observed in Chromium: `gradientTransform.animVal
// .numberOfItems` stayed 0 and a 700ms screenshot diff showed 0 changed pixels).
//
// Conversely, a kebab-case presentation attribute must NOT be listed here:
// `marker-start`/`marker-mid`/`marker-end` and `color-interpolation-filters`
// used to be, so their camelCase forms — the ones `HtmlAttributeMap` offers
// authors — were emitted unchanged and were equally inert.
export const CamelAttributes: string[] = [
  // Structure / viewport
  "viewBox",
  "preserveAspectRatio",
  "baseProfile",
  "zoomAndPan",
  // Conditional processing
  "requiredExtensions",
  "requiredFeatures",
  "systemLanguage",
  // Paint servers
  "gradientTransform",
  "gradientUnits",
  "spreadMethod",
  "patternContentUnits",
  "patternTransform",
  "patternUnits",
  // Markers / clip / mask
  "markerHeight",
  "markerWidth",
  "markerUnits",
  "refX",
  "refY",
  "clipPathUnits",
  "maskContentUnits",
  "maskUnits",
  // Text
  "startOffset",
  "textLength",
  "lengthAdjust",
  "pathLength",
  // SMIL animation
  "attributeName",
  "attributeType",
  "repeatCount",
  "repeatDur",
  "calcMode",
  "keyTimes",
  "keySplines",
  "keyPoints",
  // Filters
  "filterUnits",
  "primitiveUnits",
  "kernelUnitLength",
  "kernelMatrix",
  "preserveAlpha",
  "baseFrequency",
  "numOctaves",
  "stitchTiles",
  "xChannelSelector",
  "yChannelSelector",
  "stdDeviation",
  "tableValues",
  "targetX",
  "targetY",
  "edgeMode",
  "surfaceScale",
  "diffuseConstant",
  "specularConstant",
  "specularExponent",
  "limitingConeAngle",
  "pointsAtX",
  "pointsAtY",
  "pointsAtZ",
] as const;
