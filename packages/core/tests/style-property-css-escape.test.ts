// @vitest-environment jsdom
// H03: StyleProperty.cssText interpolates values into a <style> block.
// `}` closes the rule, `;` starts another declaration, and `</style>`
// breaks out of the element — same threat model as theme assertCssSafe.
import { describe, expect, it } from "vitest";
import { ElementNode } from "../src/index.ts";
import type { DomphyElement } from "../src/index.ts";

describe("StyleProperty.cssText: CSS value escaping", () => {
  it("does not let `;` / `}` / `</style>` break out of the generated rule", () => {
    const css = new ElementNode({
      div: "x",
      style: {
        color: "red; } </style><script>alert(1)</script>",
      },
    } as DomphyElement).generateCSS();

    expect(css.toLowerCase()).not.toContain("</style");
    expect(css).not.toMatch(/color:\s*red;/);
    // The declaration must stay a single property inside the rule.
    const ruleBody = css.slice(css.indexOf("{"), css.indexOf("}") + 1);
    expect(ruleBody).toContain("color:");
    expect(ruleBody.match(/;/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });

  it("does not inject an extra declaration via `;` in the value", () => {
    const css = new ElementNode({
      div: "x",
      style: { color: "red; background: url(evil)" },
    } as DomphyElement).generateCSS();

    expect(css).not.toMatch(/color:\s*red;\s*background/);
  });

  it("leaves a safe value unchanged", () => {
    const css = new ElementNode({
      div: "x",
      style: { color: "red", opacity: 0.5 },
    } as DomphyElement).generateCSS();

    expect(css).toContain("color: red");
    expect(css).toContain("opacity: 0.5");
  });
});
