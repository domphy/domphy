import { describe, expect, it } from "vitest";
import { cookies } from "../src/cookies.js";

describe("cookies()", () => {
  it("parses a single cookie", () => {
    const headers = new Headers({ cookie: "token=abc123" });
    const map = cookies(headers);
    expect(map.get("token")).toBe("abc123");
  });

  it("parses multiple cookies", () => {
    const headers = new Headers({ cookie: "a=1; b=2; c=3" });
    const map = cookies(headers);
    expect(map.get("a")).toBe("1");
    expect(map.get("b")).toBe("2");
    expect(map.get("c")).toBe("3");
  });

  it("decodes percent-encoded cookie values", () => {
    const headers = new Headers({ cookie: "name=hello%20world" });
    const map = cookies(headers);
    expect(map.get("name")).toBe("hello world");
  });

  it("returns an empty map when Cookie header is absent", () => {
    const map = cookies(new Headers());
    expect(map.size).toBe(0);
  });

  it("returns an empty map when no headers are passed (non-browser env)", () => {
    const map = cookies(undefined);
    expect(map.size).toBe(0);
  });

  it("ignores entries without an equals sign", () => {
    const headers = new Headers({ cookie: "bad; good=ok" });
    const map = cookies(headers);
    expect(map.has("bad")).toBe(false);
    expect(map.get("good")).toBe("ok");
  });

  it("trims whitespace from cookie name (common after ; separator)", () => {
    const headers = new Headers({ cookie: " key=value" });
    const map = cookies(headers);
    expect(map.get("key")).toBe("value");
  });
});
