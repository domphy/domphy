// Async validation: onChangeAsync/onBlurAsync debounce timing, superseded
// runs cancelled via AbortController (FieldApi.ts ~1462), stale-instance
// guard (FieldApi.ts ~1518), validator exceptions normalized into errorMap
// (FieldApi.ts ~1501), asyncDebounceMs defaults, and the isValidating guard
// from TanStack/form#1130.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FieldApi } from "../src/index";
import { createHeadlessForm, mountField } from "./helpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("async validation debounce", () => {
  it("onChangeAsync waits onChangeAsyncDebounceMs before running", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    const onChangeAsync = vi.fn(async ({ value }: any) =>
      value.length < 3 ? "too short" : undefined,
    );
    const field = mountField(form, "name", {
      validators: { onChangeAsync, onChangeAsyncDebounceMs: 500 },
    });

    field.handleChange("ab");
    await vi.advanceTimersByTimeAsync(499);
    expect(onChangeAsync).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(onChangeAsync).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(0);
    expect(field.state.meta.errorMap.onChange).toBe("too short");
    expect(field.state.meta.isValidating).toBe(false);
  });

  it("uses the field-level asyncDebounceMs as the default debounce", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    const onChangeAsync = vi.fn(async () => undefined);
    const field = mountField(form, "name", {
      asyncDebounceMs: 300,
      validators: { onChangeAsync },
    });

    field.handleChange("a");
    await vi.advanceTimersByTimeAsync(299);
    expect(onChangeAsync).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onChangeAsync).toHaveBeenCalledTimes(1);
  });

  it("a per-cause debounce overrides asyncDebounceMs", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    const onChangeAsync = vi.fn(async () => undefined);
    const field = mountField(form, "name", {
      asyncDebounceMs: 300,
      validators: { onChangeAsync, onChangeAsyncDebounceMs: 100 },
    });

    field.handleChange("a");
    await vi.advanceTimersByTimeAsync(100);
    expect(onChangeAsync).toHaveBeenCalledTimes(1);
  });

  it("onBlurAsync runs on handleBlur after onBlurAsyncDebounceMs", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    const onBlurAsync = vi.fn(async ({ value }: any) =>
      value ? undefined : "required",
    );
    const field = mountField(form, "name", {
      validators: { onBlurAsync, onBlurAsyncDebounceMs: 200 },
    });

    field.handleChange("");
    field.handleBlur();
    await vi.advanceTimersByTimeAsync(199);
    expect(onBlurAsync).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onBlurAsync).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(field.state.meta.errorMap.onBlur).toBe("required");
  });

  it("coalesces rapid changes into a single validator run", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    const onChangeAsync = vi.fn(async () => undefined);
    const field = mountField(form, "name", {
      validators: { onChangeAsync, onChangeAsyncDebounceMs: 200 },
    });

    field.handleChange("a");
    await vi.advanceTimersByTimeAsync(100);
    field.handleChange("ab");
    await vi.advanceTimersByTimeAsync(100);
    field.handleChange("abc");
    await vi.advanceTimersByTimeAsync(199);
    expect(onChangeAsync).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onChangeAsync).toHaveBeenCalledTimes(1);
    // ...and the single run saw the latest value.
    expect(onChangeAsync.mock.calls[0]?.[0].value).toBe("abc");
  });
});

describe("superseded async runs", () => {
  it("aborts the previous run's signal and discards its result", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    const signals: AbortSignal[] = [];
    const deferreds: Array<{ resolve: (value: unknown) => void }> = [];
    const onChangeAsync = vi.fn(
      ({ signal }: any) =>
        new Promise((resolve) => {
          signals.push(signal);
          deferreds.push({ resolve });
        }),
    );
    const field = mountField(form, "name", {
      validators: { onChangeAsync },
    });

    field.handleChange("a");
    await vi.advanceTimersByTimeAsync(0);
    expect(onChangeAsync).toHaveBeenCalledTimes(1);
    expect(signals[0]?.aborted).toBe(false);

    field.handleChange("ab");
    await vi.advanceTimersByTimeAsync(0);
    expect(onChangeAsync).toHaveBeenCalledTimes(2);
    // The superseded run was cancelled via its AbortController.
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    // The stale run resolves late: its result must be discarded.
    deferreds[0]?.resolve("stale error");
    await vi.advanceTimersByTimeAsync(0);
    expect(field.state.meta.errorMap.onChange).toBeUndefined();

    deferreds[1]?.resolve("fresh error");
    await vi.advanceTimersByTimeAsync(0);
    expect(field.state.meta.errorMap.onChange).toBe("fresh error");
    expect(field.state.meta.isValidating).toBe(false);
  });

  it("a sync error short-circuits the async run unless asyncAlways is set", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    const onChangeAsync = vi.fn(async () => undefined);

    const strict = mountField(form, "name", {
      validators: {
        onChange: () => "sync error",
        onChangeAsync,
      },
    });
    strict.handleChange("x");
    await vi.advanceTimersByTimeAsync(100);
    expect(onChangeAsync).not.toHaveBeenCalled();

    const always = mountField(form, "other", {
      asyncAlways: true,
      validators: {
        onChange: () => "sync error",
        onChangeAsync,
      },
    });
    always.handleChange("x");
    await vi.advanceTimersByTimeAsync(100);
    expect(onChangeAsync).toHaveBeenCalledTimes(1);
  });

  it("with asyncAlways, the async result replaces the sync error once resolved", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    let resolveRun: ((value: unknown) => void) | undefined;
    const field = mountField(form, "name", {
      asyncAlways: true,
      validators: {
        onChange: () => "sync error",
        onChangeAsync: () =>
          new Promise((resolve) => {
            resolveRun = resolve;
          }),
      },
    });

    field.handleChange("x");
    // The sync error is visible immediately...
    expect(field.state.meta.errorMap.onChange).toBe("sync error");

    // ...stays visible while the async run is in flight...
    await vi.advanceTimersByTimeAsync(0);
    expect(field.state.meta.errorMap.onChange).toBe("sync error");

    // ...and the async result takes over the same errorMap slot afterwards.
    resolveRun?.("async error");
    await vi.advanceTimersByTimeAsync(0);
    expect(field.state.meta.errorMap.onChange).toBe("async error");
  });
});

describe("async validator exceptions", () => {
  it("normalizes a thrown error into the field errorMap", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    const boom = new Error("boom");
    const field = mountField(form, "name", {
      validators: {
        onChangeAsync: async () => {
          throw boom;
        },
      },
    });

    field.handleChange("x");
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);

    expect(field.state.meta.errorMap.onChange).toBe(boom);
    expect(field.state.meta.errors).toContain(boom);
    expect(field.state.meta.isValidating).toBe(false);
    expect(field.state.meta.isValid).toBe(false);
  });

  it("normalizes a rejected promise into the field errorMap", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    const field = mountField(form, "name", {
      validators: {
        onChangeAsync: async () => Promise.reject("string rejection"),
      },
    });

    field.handleChange("x");
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);

    expect(field.state.meta.errorMap.onChange).toBe("string rejection");
  });
});

describe("stale-instance guard", () => {
  it("discards a late result when a newer instance owns the field name", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    let resolveStale: ((value: unknown) => void) | undefined;
    const field1 = new FieldApi({
      form,
      name: "name",
      validators: {
        onChangeAsync: () =>
          new Promise((resolve) => {
            resolveStale = resolve;
          }),
      },
    } as any);
    field1.mount();

    field1.handleChange("x");
    await vi.advanceTimersByTimeAsync(0);

    // A newer instance mounts for the same name without unmounting the old
    // one (the guard exists for exactly this teardown race).
    const field2 = new FieldApi({ form, name: "name" } as any);
    field2.mount();

    resolveStale?.("stale error");
    await vi.advanceTimersByTimeAsync(0);

    // The stale instance must not write its result into the shared meta.
    expect(
      (form.getFieldMeta("name" as never) as any).errorMap.onChange,
    ).toBeUndefined();
  });
});

describe("isValidating flag (TanStack/form#1130)", () => {
  it("never flips isValidating for fields without async validators", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    const field = mountField(form, "name", {
      validators: { onChange: () => undefined },
    });

    let sawValidating = false;
    field.store.subscribe(() => {
      if (field.state.meta.isValidating) sawValidating = true;
    });

    field.handleChange("x");
    await vi.advanceTimersByTimeAsync(100);

    expect(sawValidating).toBe(false);
    expect(field.state.meta.isValidating).toBe(false);
  });

  it("flips isValidating true while an async validator is in flight", async () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    let resolveRun: ((value: unknown) => void) | undefined;
    const field = mountField(form, "name", {
      validators: {
        onChangeAsync: () =>
          new Promise((resolve) => {
            resolveRun = resolve;
          }),
      },
    });

    field.handleChange("x");
    await vi.advanceTimersByTimeAsync(0);
    expect(field.state.meta.isValidating).toBe(true);

    resolveRun?.(undefined);
    await vi.advanceTimersByTimeAsync(0);
    expect(field.state.meta.isValidating).toBe(false);
  });
});
