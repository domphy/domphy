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

  it("trims whitespace from cookie values", () => {
    const headers = new Headers({ cookie: "a=1 ; b=2" });
    const map = cookies(headers);
    expect(map.get("a")).toBe("1");
    expect(map.get("b")).toBe("2");
  });

  // RFC 6265 4.1.1: cookie-value may be DQUOTE-wrapped; the quotes delimit the
  // value and are not part of it (the `cookie` package strips them likewise).
  it("unwraps a DQUOTE-wrapped cookie-value (RFC 6265 4.1.1)", () => {
    const headers = new Headers({ cookie: 'a="hello world"; b="; c=""' });
    const map = cookies(headers);
    expect(map.get("a")).toBe("hello world");
    // A single quote is data, not a wrapper.
    expect(map.get("b")).toBe('"');
    expect(map.get("c")).toBe("");
  });

  it("falls back to the raw value for malformed percent-encoding", () => {
    const headers = new Headers({ cookie: "session=100%; ok=fine" });
    const map = cookies(headers);
    expect(map.get("session")).toBe("100%");
    expect(map.get("ok")).toBe("fine");
  });
});
