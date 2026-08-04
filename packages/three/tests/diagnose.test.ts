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

  it("does NOT flag rectAreaLight — it never switched to physical units in r155", () => {
    // three's own examples use rectAreaLight intensity ≤ 5, so the (0, 5]
    // legacy threshold would be a false positive there.
    expect(rules({ scene: [{ rectAreaLight: null, intensity: 3 }] })).toEqual(
      [],
    );
  });

  it("message matches the actual (0, 5] flag threshold, not a 0-1 range", () => {
    const issues = diagnose({
      scene: [{ pointLight: null, intensity: 1.2 }],
    });
    expect(issues[0].message).not.toContain("0-1 range");
    expect(issues[0].message).toContain("legacy pre-r155");
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

  it("does NOT warn on explicitly opaque additive points (opaque pass forces NoBlending)", () => {
    expect(
      rules({
        scene: [
          {
            points: [
              {
                pointsMaterial: null,
                blending: AdditiveBlending,
                size: 8,
                opacity: 1,
                transparent: false,
              },
            ],
          },
        ],
      }),
    ).toEqual([]);
  });

  it("still warns when `transparent` is absent (runtime value may be set elsewhere)", () => {
    const found = rules({
      scene: [
        {
          points: [
            {
              pointsMaterial: null,
              blending: AdditiveBlending,
              size: 6.5,
              opacity: 0.95,
            },
          ],
        },
      ],
    });
    expect(found).toContain("additive-blowout");
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

  it("accepts an off-axis camera aimed by an explicit rotation", () => {
    expect(
      rules({
        camera: { position: [3, 4, 5], rotation: [-0.6, 0.5, 0] },
        scene: [],
      }),
    ).toEqual([]);
  });

  it("walks self-referencing (cyclic) scene descriptions without overflowing the stack", () => {
    const cyclic: Record<string, unknown> = { mesh: null };
    cyclic.mesh = [cyclic];
    expect(() => diagnose({ scene: [cyclic] as never })).not.toThrow();
    // `mesh` is a known tag, so the single visit reports nothing.
    expect(diagnose({ scene: [cyclic] as never })).toEqual([]);
  });
});

describe("tag-not-first", () => {
  it("errors on a props-first description instead of passing it as well-formed", () => {
    // getSceneTag (reconciler) takes the FIRST own key verbatim, so this
    // throws at runtime resolving "args" as a THREE class — while the
    // tag-finding nodeTag would have checked it as "mesh" and passed it.
    const issues = diagnose({
      scene: [{ args: [1, 2, 3], mesh: [{ boxGeometry: null }] }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe("tag-not-first");
    expect(issues[0].severity).toBe("error");
    expect(issues[0].path).toBe("scene > mesh");
    expect(issues[0].message).toContain('"args"');
    expect(issues[0].hint).toContain("{ mesh:");
  });

  it("errors on a description with no tag key at all", () => {
    const issues = diagnose({
      scene: [{ args: [1, 2, 3], _key: "k" }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe("tag-not-first");
    expect(issues[0].severity).toBe("error");
  });

  it("reports a props-first NESTED child with its full path", () => {
    const issues = diagnose({
      scene: [{ mesh: [{ attach: "material", meshBasicMaterial: null }] }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe("tag-not-first");
    expect(issues[0].path).toBe("scene > mesh > meshBasicMaterial");
  });

  it("does not run tag-based rules or walk children on a malformed node", () => {
    // The bad node leads with a prop key AND nests an unknown tag — only the
    // tag-not-first error may fire (the runtime never creates this node).
    const issues = diagnose({
      scene: [{ args: [], badTag: [{ boxGeometyr: null }] }],
    });
    expect(issues.map((issue) => issue.rule)).toEqual(["tag-not-first"]);
  });

  it("is suppressible per node via _doctorDisable", () => {
    expect(
      rules({
        scene: [
          { args: [1, 2, 3], mesh: null, _doctorDisable: "tag-not-first" },
        ],
      }),
    ).toEqual([]);
  });

  it("makes validate() report ok=false", () => {
    const report = validate({
      scene: [{ args: [1, 2, 3], mesh: null }],
    });
    expect(report.ok).toBe(false);
    expect(report.summary.error).toBe(1);
  });

  it("stays silent on well-formed tag-first descriptions", () => {
    expect(
      rules({
        scene: [
          { mesh: [{ boxGeometry: null }], position: [1, 2, 3], _key: "m" },
          { pointLight: null, intensity: 60, args: [0xff0000] },
        ],
      }),
    ).toEqual([]);
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
