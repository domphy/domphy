// @vitest-environment jsdom
import { ElementNode, toState } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { Container } from "../docs/editor/Container.ts";
import { Preview } from "../docs/editor/Preview.ts";

function mountPreview(source: string) {
  const code = toState(source);
  const isDark = toState(false);
  const hasGrid = toState(false);
  const error = toState("");
  const shadowHost = document.createElement("div");
  const previewContainer = document.createElement("div");
  const shadow = shadowHost.attachShadow({ mode: "open" });
  shadow.append(previewContainer);
  const host = document.createElement("div");
  document.body.append(host);
  new ElementNode(
    Preview(code, isDark, hasGrid, error, shadowHost, previewContainer),
  ).render(host);
  return { code, error, host, shadowHost, previewContainer };
}

const MARKER = "data-preview-ran";
const userSource = `document.documentElement.setAttribute("${MARKER}", "1");
export default { div: "ok" };
`;

describe("Preview sandbox", () => {
  it("runs playground code in a sandboxed iframe document, not the parent", () => {
    document.documentElement.removeAttribute(MARKER);
    document.body.innerHTML = "";
    const { host } = mountPreview(userSource);

    expect(document.documentElement.getAttribute(MARKER)).toBeNull();
    const iframe = host.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("sandbox") ?? "").toContain("allow-scripts");
    expect(iframe?.contentDocument?.documentElement.getAttribute(MARKER)).toBe(
      "1",
    );
  });
});

describe("Container does not execute user code in the parent document", () => {
  it("constructs the playground without setting parent-document markers", () => {
    document.documentElement.removeAttribute(MARKER);
    document.body.innerHTML = "";
    const shadowHost = document.createElement("div");
    const previewContainer = document.createElement("div");
    const shadow = shadowHost.attachShadow({ mode: "open" });
    shadow.append(previewContainer);
    const host = document.createElement("div");
    document.body.append(host);
    new ElementNode(Container(userSource, shadowHost, previewContainer)).render(
      host,
    );

    expect(document.documentElement.getAttribute(MARKER)).toBeNull();
  });
});
