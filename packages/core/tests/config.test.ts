// @vitest-environment jsdom
// getConfig(): additive read accessor for the global config (configure()),
// so higher tiers (e.g. an SSR layer) can honor settings like cspNonce.
import { afterEach, describe, expect, it } from "vitest";
import { configure, getConfig } from "../src/index.ts";

afterEach(() => {
  configure({ cspNonce: undefined });
});

describe("getConfig()", () => {
  it("returns the values set via configure()", () => {
    configure({ cspNonce: "nonce-123" });
    expect(getConfig().cspNonce).toBe("nonce-123");
  });

  it("returns a copy — mutating the result does not change global config", () => {
    configure({ cspNonce: "nonce-123" });
    const config = getConfig();
    (config as any).cspNonce = "hacked";
    expect(getConfig().cspNonce).toBe("nonce-123");
  });

  it("reflects later configure() calls (reads are not memoized)", () => {
    configure({ cspNonce: "one" });
    expect(getConfig().cspNonce).toBe("one");
    configure({ cspNonce: "two" });
    expect(getConfig().cspNonce).toBe("two");
  });
});
