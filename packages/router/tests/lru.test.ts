import { describe, expect, it } from "vitest";
import { createLRUCache } from "../src/lru-cache";

describe("LRU Cache", () => {
  it("evicts oldest set", () => {
    const cache = createLRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4); // 'a' should be evicted
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
  });
  it("evicts oldest used", () => {
    const cache = createLRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.get("a"); // 'a' is now the most recently used
    cache.set("d", 4); // 'b' should be evicted
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
  });
  it("updating an existing key at capacity does not evict another entry", () => {
    const cache = createLRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("b", 20); // update existing key — nothing should be evicted
    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(20);
  });
  it("updating an existing key marks it as most recently used", () => {
    const cache = createLRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 10); // 'a' is now the most recently used
    cache.set("c", 3); // 'b' should be evicted
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(10);
    expect(cache.get("c")).toBe(3);
  });
});
