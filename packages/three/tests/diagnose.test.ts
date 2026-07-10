// @vitest-environment jsdom
import { AdditiveBlending } from "three";
import { describe, expect, it } from "vitest";
import { extend } from "../src/catalog.js";
import { diagnose, validate } from "../src/diagnose.js";
import type { ThreeOptions } from "../src/types.js";

// Fixtures mirror the REAL pre-fix bugs from the domphy.com example gallery —
// each rule exists because one of these shipped broken and failed silently.

function rules(options: ThreeOptions): string[] {
  return diagnose(options).map((issue) => issue.rule);
}

describe("unknown-tag", () => {
  it("errors on a tag that resolves to nothing", () => {
    const issues = diagnose({
      scene: [{ mesh: [{ boxGeometyr: null }] }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe("unknown-tag");
    expect(issues[0].severity).toBe("error");
    expect(issues[0].path).toBe("scene > mesh > boxGeometyr");
  });

  it("accepts THREE namespace tags, extend() tags, and primitive", () => {
    class OrbitControlsLike {}
    extend({ OrbitControlsLike });
    expect(
      rules({
        scene: [
          { mesh: [{ boxGeometry: null }, { meshStandardMaterial: null }] },
          { orbitControlsLike: null },
          { primitive: [], object: {} },
        ],
      }),
    ).toEqual([]);
  });
});

describe("legacy-light-intensity", () => {
  it("warns on 0-1-era point/spot intensities (the dark wave-field bug)", () => {
    const found = rules({
      scene: [
        { pointLight: null, intensity: 0.8 },
        { spotLight: null, intensity: 1.2 },
      ],
    });
    expect(found).toEqual(["legacy-light-intensity", "legacy-light-intensity"]);
  });

  it("accepts physical intensities and non-punctual lights", () => {
    expect(
      rules({
        scene: [
          { pointLight: null, intensity: 60 },
          { ambientLight: null, intensity: 0.6 },
          { directionalLight: null, intensity: 2.5 },
        ],
      }),
    ).toEqual([]);
  });
});

describe("additive-blowout", () => {
  it("warns on big bright additive points (the dissolve blowout)", () => {
    const found = rules({
      scene: [
        {
          points: [
            { bufferGeometry: null },
            {
              pointsMaterial: null,
              blending: AdditiveBlending,
              size: 6.5,
              opacity: 0.95,
              transparent: true,
            },
          ],
        },
      ],
    });
    expect(found).toContain("additive-blowout");
  });

  it("accepts tamed additive points and normal blending", () => {
    expect(
      rules({
        scene: [
          {
            points: [
              { bufferGeometry: null },
              {
                pointsMaterial: null,
                blending: AdditiveBlending,
                size: 2,
                opacity: 0.9,
              },
            ],
          },
          { points: [{ pointsMaterial: null, size: 8, opacity: 1 }] },
        ],
      }),
    ).toEqual([]);
  });
});

describe("camera-missing-lookat", () => {
  it("warns on an off-axis camera with no onCreated (the spinning-cube bug)", () => {
    const issues = diagnose({
      camera: { position: [3.4, 1.8, 3.6] },
      scene: [],
    });
    expect(issues.map((issue) => issue.rule)).toEqual([
      "camera-missing-lookat",
    ]);
    expect(issues[0].path).toBe("camera");
  });

  it("accepts on-axis cameras, onCreated, and adopted instances", () => {
    expect(rules({ camera: { position: [0, 0, 5] }, scene: [] })).toEqual([]);
    expect(
      rules({
        camera: { position: [3, 4, 5] },
        onCreated: () => {},
        scene: [],
      }),
    ).toEqual([]);
    expect(rules({ camera: { instance: {} }, scene: [] })).toEqual([]);
  });
});

describe("shared machinery", () => {
  it("resolves a reactive scene function with a no-op listener", () => {
    expect(
      rules({
        scene: () => [{ pointLight: null, intensity: 0.5 }],
      }),
    ).toEqual(["legacy-light-intensity"]);
  });

  it("_doctorDisable suppresses per node, matching doctor's convention", () => {
    expect(
      rules({
        scene: [
          {
            pointLight: null,
            intensity: 0.5,
            _doctorDisable: "legacy-light-intensity",
          },
          { badTag: null, _doctorDisable: true },
        ],
      }),
    ).toEqual([]);
  });

  it("only/exclude filter rule ids", () => {
    const options: ThreeOptions = {
      camera: { position: [3, 3, 3] },
      scene: [{ pointLight: null, intensity: 0.5 }],
    };
    expect(diagnose(options, { only: ["camera-missing-lookat"] })).toHaveLength(
      1,
    );
    expect(
      diagnose(options, { exclude: ["camera-missing-lookat"] }),
    ).toHaveLength(1);
  });

  it("validate reports ok=false only for error severity", () => {
    const warningsOnly = validate({
      scene: [{ pointLight: null, intensity: 0.5 }],
    });
    expect(warningsOnly.ok).toBe(true);
    expect(warningsOnly.summary.warning).toBe(1);

    const withError = validate({ scene: [{ boxGeometyr: null }] });
    expect(withError.ok).toBe(false);
    expect(withError.summary.error).toBe(1);
  });
});
