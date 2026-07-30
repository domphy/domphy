// Pins the createForm field(name, options) cache contract: the cache is keyed
// by field name only, so a repeated call with DIFFERENT options returns the
// cached handle and silently drops the new options (createForm.ts). That
// behavior is intentional (re-render safety) but must be visible: a dev-time
// console.warn fires when the options change.

import { afterEach, describe, expect, it, vi } from "vitest";
import { createForm } from "../src/domphy/index";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createForm field cache with differing options", () => {
  it("keeps the first call's options and drops the changed ones", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
    });

    const firstValidator = vi.fn(() => "first error" as const);
    const secondValidator = vi.fn(() => "second error" as const);

    const first = form.field<string>("name", {
      validators: { onChange: firstValidator },
    });
    const second = form.field<string>("name", {
      validators: { onChange: secondValidator },
    });

    // Same cached handle, and the first call's validator is the live one.
    expect(second).toBe(first);
    second.handleChange("x");
    expect(firstValidator).toHaveBeenCalled();
    expect(secondValidator).not.toHaveBeenCalled();
    expect(second.errors()).toContain("first error");
    form.destroy();
  });

  it("warns in dev when a cached field is requested with different options", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
    });

    form.field<string>("name", { validators: { onChange: () => undefined } });
    form.field<string>("name", { validators: { onBlur: () => undefined } });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('field("name")');
    form.destroy();
  });

  it("does not warn when the same options are passed again", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
    });

    const options = { validators: { onChange: () => undefined } };
    form.field<string>("name", options);
    form.field<string>("name", options);
    form.field<string>("name"); // no options either time afterwards
    form.field<string>("name");

    expect(warn).not.toHaveBeenCalled();
    form.destroy();
  });

  it("does not warn for equivalent options by reference-equal values", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
    });

    const onChange = () => undefined;
    form.field<string>("name", { validators: { onChange } });
    form.field<string>("name", { validators: { onChange } });

    expect(warn).not.toHaveBeenCalled();
    form.destroy();
  });

  it("warns when keys are added even if shared values are identical", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
    });

    const onChange = () => undefined;
    form.field<string>("name", { validators: { onChange } });
    form.field<string>("name", {
      validators: { onChange },
      asyncDebounceMs: 100,
    });

    expect(warn).toHaveBeenCalledTimes(1);
    form.destroy();
  });

  it("tracks options per field name independently", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const form = createForm<{ a: string; b: string }>({
      defaultValues: { a: "", b: "" },
    });

    form.field<string>("a", { validators: { onChange: () => undefined } });
    // Different field, different options: no warning.
    form.field<string>("b", { validators: { onBlur: () => undefined } });

    expect(warn).not.toHaveBeenCalled();
    form.destroy();
  });
});
