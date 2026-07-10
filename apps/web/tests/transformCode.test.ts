import { describe, expect, it } from "vitest";
import { transformCode } from "../docs/editor/transformCode";

describe("transformCode", () => {
  it("rewrites namespace imports to __modules__ lookups", () => {
    const output = transformCode(
      `import * as THREE from "three";\nexport default THREE;\n`,
    );
    expect(output).toContain("const THREE = __modules__['three']");
    expect(output).not.toContain("import");
  });

  it("rewrites named and default imports alongside namespace imports", () => {
    const output = transformCode(
      `import * as domphyThree from "@domphy/three";\nimport { toState } from "@domphy/core";\nimport page from "page";\nexport default { domphyThree, toState, page };\n`,
    );
    expect(output).toContain("const domphyThree = __modules__['@domphy/three']");
    expect(output).toContain("const { toState } = __modules__['@domphy/core']");
    expect(output).toContain(
      "const page = __modules__['page'].default ?? __modules__['page']",
    );
  });
});
