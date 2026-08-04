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
    expect(output).toContain(
      "const domphyThree = __modules__['@domphy/three']",
    );
    expect(output).toContain("const { toState } = __modules__['@domphy/core']");
    expect(output).toContain(
      "const page = __modules__['page'].default ?? __modules__['page']",
    );
  });

  it("rewrites `as` aliases in named imports to destructuring rename", () => {
    const output = transformCode(
      `import { button, table as tableUI } from "@domphy/ui";\nexport default { button, tableUI };\n`,
    );
    expect(output).toContain(
      "const { button, table: tableUI } = __modules__['@domphy/ui']",
    );
    // `as` is module-only syntax — it must not leak into the emitted code.
    expect(output).not.toContain(" as ");
    expect(() => new Function("__modules__", output)).not.toThrow();
  });

  it("rewrites mixed default + named imports", () => {
    const output = transformCode(
      `import page, { type Context as PageContext } from "page";\nexport default page;\n`,
    );
    expect(output).toContain(
      "const page = __modules__['page'].default ?? __modules__['page']",
    );
    expect(output).not.toContain("import");
    expect(() => new Function("__modules__", output)).not.toThrow();
  });

  it("drops an emptied named-import clause left by type stripping", () => {
    const output = transformCode(
      `import { type DomphyElement, toState } from "@domphy/core";\nexport default toState;\n`,
    );
    expect(output).toContain("const { toState } = __modules__['@domphy/core']");
    expect(output).not.toContain("import");
    expect(() => new Function("__modules__", output)).not.toThrow();
  });
});
