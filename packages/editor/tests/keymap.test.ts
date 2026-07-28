import { describe, expect, it } from "vitest";

import { eventDescriptors, normalizeShortcut } from "../src/keymap.js";

function keyEvent(
  init: Partial<KeyboardEventInit> & { key: string },
): KeyboardEvent {
  return new KeyboardEvent("keydown", init);
}

describe("normalizeShortcut", () => {
  it("orders modifiers Shift-Meta-Ctrl-Alt-Key", () => {
    expect(normalizeShortcut("Mod-Alt-1")).toBe("Ctrl-Alt-1");
    expect(normalizeShortcut("Mod-Shift-s")).toBe("Shift-Ctrl-s");
    expect(normalizeShortcut("Alt-Shift-Ctrl-x")).toBe("Shift-Ctrl-Alt-x");
  });

  it("expands Mod to Ctrl off macOS", () => {
    expect(normalizeShortcut("Mod-b")).toBe("Ctrl-b");
    expect(normalizeShortcut("Mod-B")).toBe("Ctrl-B");
  });

  it("accepts modifier aliases", () => {
    expect(normalizeShortcut("Ctrl-b")).toBe("Ctrl-b");
    expect(normalizeShortcut("c-b")).toBe("Ctrl-b");
    expect(normalizeShortcut("Cmd-b")).toBe("Meta-b");
    expect(normalizeShortcut("Meta-b")).toBe("Meta-b");
  });

  it("maps Space to the literal space key", () => {
    expect(normalizeShortcut("Mod-Space")).toBe("Ctrl- ");
  });

  it("keeps a trailing dash as the key", () => {
    expect(normalizeShortcut("Mod--")).toBe("Ctrl--");
  });
});

describe("eventDescriptors", () => {
  it("describes a plain modifier combination", () => {
    const descriptors = eventDescriptors(
      keyEvent({ key: "b", ctrlKey: true, code: "KeyB" }),
    );
    expect(descriptors).toContain(normalizeShortcut("Mod-b"));
  });

  it("matches Mod-Shift-s when the browser reports an uppercase key", () => {
    const descriptors = eventDescriptors(
      keyEvent({ key: "S", ctrlKey: true, shiftKey: true, code: "KeyS" }),
    );
    expect(descriptors).toContain(normalizeShortcut("Mod-Shift-s"));
  });

  it("matches Mod-B via the no-shift fallback", () => {
    const descriptors = eventDescriptors(
      keyEvent({ key: "B", ctrlKey: true, shiftKey: true, code: "KeyB" }),
    );
    expect(descriptors).toContain(normalizeShortcut("Mod-B"));
  });

  it("matches digit shortcuts through the physical key", () => {
    const descriptors = eventDescriptors(
      keyEvent({ key: "1", ctrlKey: true, altKey: true, code: "Digit1" }),
    );
    expect(descriptors).toContain(normalizeShortcut("Mod-Alt-1"));
  });

  it("describes named keys unchanged", () => {
    expect(eventDescriptors(keyEvent({ key: "Enter" }))).toEqual(["Enter"]);
    expect(
      eventDescriptors(keyEvent({ key: "Tab", shiftKey: true })),
    ).toContain("Shift-Tab");
  });
});
