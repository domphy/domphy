import { describe, expect, it } from "vitest";
import { parseFenceInfo, renderFence } from "../src/highlight.ts";

const highlight = (code: string): string => code;

describe("renderFence", () => {
  it("escapes lang before interpolating it into the class attribute", () => {
    const html = renderFence("const x = 1", `js" onfocus="alert(1)`, highlight);
    expect(html).not.toContain("onfocus");
    expect(html).not.toMatch(/class="[^"]*language-js"/);
    expect(html).toContain("language-js&quot;");
  });

  it("escapes a lang that would break out of the class attribute via markup", () => {
    const html = renderFence(
      "x",
      "css><img src=x onerror=alert(1)>",
      highlight,
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
    expect(html).toContain("language-css&gt;");
  });

  it("still emits a language-* class for a normal fence lang", () => {
    const html = renderFence("x = 1", "python", highlight);
    expect(html).toContain('class="code-block language-python"');
    expect(parseFenceInfo("python").lang).toBe("python");
  });
});
