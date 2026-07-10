import * as THREE from "three";
import { beforeEach, describe, expect, it } from "vitest";
import { clearRegistry, extend, resolve } from "../src/catalog.js";

describe("catalog", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("resolves built-in THREE tags by PascalCase reflection", () => {
    expect(resolve("mesh")).toBe(THREE.Mesh);
    expect(resolve("boxGeometry")).toBe(THREE.BoxGeometry);
  });

  it("returns null for an unknown tag", () => {
    expect(resolve("notARealThreeClass")).toBeNull();
  });

  it("extend() registration wins over the THREE namespace", () => {
    class CustomMesh {}
    extend({ Mesh: CustomMesh });
    expect(resolve("mesh")).toBe(CustomMesh);
    expect(resolve("mesh")).not.toBe(THREE.Mesh);
  });

  it("clearRegistry() removes registered constructors", () => {
    class CustomMesh {}
    extend({ Mesh: CustomMesh });
    clearRegistry();
    expect(resolve("mesh")).toBe(THREE.Mesh);
  });
});
