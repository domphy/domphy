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

  it("rejects non-constructor THREE namespace entries (constants, enums, strings)", () => {
    // PascalCase tag grammar collides with namespace constants — these must
    // fail like unknown tags (friendly error) instead of throwing
    // `TagClass is not a constructor` at runtime.
    expect(resolve("additiveBlending")).toBeNull(); // THREE.AdditiveBlending === 2
    expect(resolve("noBlending")).toBeNull(); // THREE.NoBlending === 0
    expect(resolve("mouse")).toBeNull(); // THREE.MOUSE is a plain object
  });

  it("trusts extend() registry entries as-is (no constructor check)", () => {
    // The constructor check applies only to the THREE-namespace fallback —
    // registry entries are explicitly opted in by the user.
    const notAConstructor = {} as unknown as new () => object;
    extend({ Weird: notAConstructor });
    expect(resolve("weird")).toBe(notAConstructor);
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
