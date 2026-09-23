import { describe, expect, it } from "vitest";
import { createApiHandler, json, notFound, redirect } from "../src/index";

const handler = createApiHandler([
  {
    path: "/api/users",
    GET: () => json([{ id: 1 }]),
    POST: async (request) => json(await request.json(), { status: 201 }),
  },
  {
    path: "/api/users/[id]",
    GET: (_request, { params }) => json({ id: params.id }),
    DELETE: () => new Response(null, { status: 204 }),
  },
  {
    path: "/api/legacy",
    GET: () => redirect("/api/users"),
  },
  {
    path: "/api/secret",
    GET: () => notFound(),
  },
  {
    path: "/api/broken",
    GET: () => {
      throw new Error("boom");
    },
  },
]);

const request = (path: string, init?: RequestInit) =>
  handler(new Request(`http://localhost${path}`, init));

describe("createApiHandler", () => {
  it("routes GET requests", async () => {
    const response = await request("/api/users");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 1 }]);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("passes params from the path", async () => {
    const response = await request("/api/users/42");
    expect(await response.json()).toEqual({ id: "42" });
  });

  it("routes by method", async () => {
    const response = await request("/api/users", {
      method: "POST",
      body: JSON.stringify({ name: "An" }),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ name: "An" });
  });

  it("returns 404 for unknown paths", async () => {
    expect((await request("/api/missing")).status).toBe(404);
  });

  it("returns 405 with allow header for unsupported methods", async () => {
    const response = await request("/api/users", { method: "PATCH" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, POST");
  });

  it("serves HEAD from GET without a body", async () => {
    const response = await request("/api/users", { method: "HEAD" });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("answers OPTIONS automatically", async () => {
    const response = await request("/api/users/1", { method: "OPTIONS" });
    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("GET, DELETE");
  });

  it("turns redirect() into a 307 response", async () => {
    const response = await request("/api/legacy");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/api/users");
  });

  it("turns notFound() into a 404 response", async () => {
    expect((await request("/api/secret")).status).toBe(404);
  });

  it("turns thrown errors into 500 responses", async () => {
    expect((await request("/api/broken")).status).toBe(500);
  });

  it("returns 400 for malformed percent-encoded paths", async () => {
    const response = await handler(new Request("http://localhost/api/users/%"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Bad Request" });
  });

  it("strips CR/LF from the redirect location (RFC 9110 field values admit no CRLF)", async () => {
    const injecting = createApiHandler([
      {
        path: "/api/go",
        GET: (request) =>
          redirect(new URL(request.url).searchParams.get("to") as string),
      },
    ]);
    const response = await injecting(
      new Request(
        `http://localhost/api/go?to=${encodeURIComponent("/safe\r\nSet-Cookie: admin=1")}`,
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/safeSet-Cookie: admin=1");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  // RFC 9110 10.2.2: Location carries a URI-reference, which is ASCII. The
  // fetch spec types a header value as a ByteString, so undici throws a
  // TypeError for a character above U+00FF — out of the catch block that builds
  // this response, rejecting the handler's promise instead of answering.
  it("percent-encodes a non-ASCII redirect location (RFC 9110 10.2.2)", async () => {
    const localized = createApiHandler([
      {
        path: "/api/go",
        GET: () => redirect("/日本語?q=ä"),
      },
    ]);
    const response = await localized(new Request("http://localhost/api/go"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "/%E6%97%A5%E6%9C%AC%E8%AA%9E?q=%C3%A4",
    );
  });
});
