// Adapter-level async/schema/submission coverage for createForm
// (src/domphy/createForm.ts): async validator races + AbortController
// behavior through the adapter, Standard Schema validators through the
// adapter, and re-submission error clearing.
//
// Two describes previously pinned CHARACTERIZED 1.33.0 behavior (see wave-1
// notes in .stable-audit/29-deferral-wave1-query-form.md); both were flipped
// by the wave-3 rebase to 1.33.3:
//  - "stale onBlur error blocks re-submission": fixed upstream in 1.33.1+
//    (re-submission re-runs validateAllFields); now asserts the cleared
//    behavior against the 1.33.3-based port.
//  - "a cancelled form-level async run can still write its late result":
//    FormApi.validateAsync aborted the superseded controller but had no
//    post-resolution `signal.aborted` guard (FieldApi has one at
//    FieldApi.ts:1504). Still unfixed upstream in 1.33.3 — closed by
//    SOURCES.md deviation #4; the test is now its regression test.

import { describe, expect, it, vi } from "vitest";
import { createForm } from "../src/domphy/index";
import type { StandardSchemaV1 } from "../src/index";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A minimal hand-rolled Standard Schema string validator. */
function minStringSchema(min: number, message: string): StandardSchemaV1 {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value) =>
        typeof value === "string" && value.length >= min
          ? { value }
          : { issues: [{ message }] },
    },
  };
}

describe("adapter: field async validator races", () => {
  it("aborts the superseded run and lands only the fresh result in errors()", async () => {
    const form = createForm<{ name: string }>({ defaultValues: { name: "" } });
    const signals: AbortSignal[] = [];
    const deferreds: Array<(value: unknown) => void> = [];
    const name = form.field<string>("name", {
      validators: {
        onChangeAsync: ({ signal }: any) =>
          new Promise((resolve) => {
            signals.push(signal);
            deferreds.push(resolve);
          }),
        onChangeAsyncDebounceMs: 0,
      },
    });

    name.handleChange("a");
    await flush();
    await flush();
    expect(signals).toHaveLength(1);

    name.handleChange("ab");
    await flush();
    await flush();
    expect(signals).toHaveLength(2);
    // The superseded run was cancelled via its AbortController.
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    // The stale run resolves late: its result must be discarded (field-level
    // post-resolution guard, FieldApi.ts:1504).
    deferreds[0]?.("stale error");
    await flush();
    expect(name.errors()).toEqual([]);

    deferreds[1]?.("fresh error");
    await flush();
    expect(name.errors()).toEqual(["fresh error"]);
    expect(name.meta().isValidating).toBe(false);
    form.destroy();
  });

  it("a concurrent validate() call aborts the in-flight debounced run", async () => {
    const form = createForm<{ name: string }>({ defaultValues: { name: "" } });
    const signals: AbortSignal[] = [];
    const onChangeAsync = vi.fn(({ signal }: any) => {
      signals.push(signal);
      return Promise.resolve(undefined);
    });
    const name = form.field<string>("name", {
      validators: { onChangeAsync, onChangeAsyncDebounceMs: 0 },
    });

    name.handleChange("a");
    // Before the debounce fires, an explicit validate() supersedes the run.
    await name.validate("change");
    await flush();

    // Only the explicit validate()'s run executed the validator; the
    // debounced run was aborted before it started.
    expect(onChangeAsync).toHaveBeenCalledTimes(1);
    expect(signals[0]?.aborted).toBe(false);
    form.destroy();
  });
});

describe("adapter: form-level async cancellation", () => {
  function createAsyncForm() {
    const signals: AbortSignal[] = [];
    const deferreds: Array<(value: unknown) => void> = [];
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      validators: {
        onChangeAsync: ({ signal }: any) =>
          new Promise((resolve) => {
            signals.push(signal);
            deferreds.push(resolve);
          }),
        onChangeAsyncDebounceMs: 0,
      },
    });
    const name = form.field<string>("name");
    return { form, name, signals, deferreds };
  }

  it("aborts the superseded run; the last-resolving run owns the form errorMap", async () => {
    const { form, name, signals, deferreds } = createAsyncForm();

    name.handleChange("a");
    await flush();
    await flush();
    name.handleChange("ab");
    await flush();
    await flush();

    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    deferreds[0]?.("stale error");
    await flush();
    deferreds[1]?.(undefined);
    await flush();

    // In-order completion: the fresh run resolves last and clears the error.
    expect(form.state().errorMap.onChange).toBeUndefined();
    form.destroy();
  });

  it("deviation #4 regression: a cancelled form-level run resolving last cannot write its stale result", async () => {
    const { form, name, signals, deferreds } = createAsyncForm();

    name.handleChange("a");
    await flush();
    await flush();
    name.handleChange("ab");
    await flush();
    await flush();
    expect(signals[0]?.aborted).toBe(true);

    // Out-of-order completion: the fresh (valid) run resolves first...
    deferreds[1]?.(undefined);
    await flush();
    expect(form.state().errorMap.onChange).toBeUndefined();

    // ...then the cancelled stale run resolves last. Upstream (1.33.0 AND
    // 1.33.3) has no post-resolution aborted guard in FormApi.validateAsync
    // (unlike FieldApi.ts:1504), so the stale error would stick even though
    // the run was aborted and the current value is valid. SOURCES.md
    // deviation #4 adds the guard; the stale result is discarded.
    deferreds[0]?.("stale error");
    await flush();
    expect(form.state().errorMap.onChange).toBeUndefined();
    form.destroy();
  });
});

describe("adapter: standard schema validators", () => {
  it("a field-level schema surfaces issues via errors() and clears on valid", async () => {
    const form = createForm<{ name: string }>({ defaultValues: { name: "" } });
    const name = form.field<string>("name", {
      validators: { onChange: minStringSchema(3, "too short") },
    });

    name.handleChange("ab");
    await flush();
    expect(name.errors()).toEqual([{ message: "too short" }]);

    name.handleChange("abcd");
    await flush();
    expect(name.errors()).toEqual([]);
    form.destroy();
  });

  it("an async field-level schema validates through onChangeAsync", async () => {
    const asyncSchema: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async (value) =>
          value === "ok" ? { value } : { issues: [{ message: "not ok" }] },
      },
    };
    const form = createForm<{ name: string }>({ defaultValues: { name: "" } });
    const name = form.field<string>("name", {
      validators: { onChangeAsync: asyncSchema, onChangeAsyncDebounceMs: 0 },
    });

    name.handleChange("nope");
    await flush();
    await flush();
    expect(name.errors()).toEqual([{ message: "not ok" }]);

    name.handleChange("ok");
    await flush();
    await flush();
    expect(name.errors()).toEqual([]);
    form.destroy();
  });

  it("a form-level schema fans field-path issues out to the field's errors()", async () => {
    const schema: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value: any) =>
          value.name
            ? { value }
            : { issues: [{ message: "name required", path: ["name"] }] },
      },
    };
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      validators: { onChange: schema },
    });
    const name = form.field<string>("name");

    name.handleChange("");
    await flush();
    expect(name.errors()).toEqual([
      { message: "name required", path: ["name"] },
    ]);

    name.handleChange("Ada");
    await flush();
    expect(name.errors()).toEqual([]);
    form.destroy();
  });
});

describe("adapter: re-submission error clearing", () => {
  it("a fixed onChange error clears on re-submit and the submission goes through", async () => {
    const submitted: Array<{ name: string }> = [];
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      onSubmit: async ({ value }) => {
        submitted.push(value);
      },
    });
    const name = form.field<string>("name", {
      validators: {
        onChange: ({ value }: any) =>
          value.length < 3 ? "too short" : undefined,
      },
    });

    name.handleChange("ab");
    await flush();
    await form.handleSubmit();
    await flush();
    expect(submitted).toHaveLength(0);
    expect(name.errors()).toContain("too short");
    expect(form.isSubmitted()).toBe(false);

    name.handleChange("abcd");
    await flush();
    await form.handleSubmit();
    await flush();
    expect(submitted).toEqual([{ name: "abcd" }]);
    expect(name.errors()).toEqual([]);
    expect(form.isSubmitted()).toBe(true);
    expect(form.state().isSubmitSuccessful).toBe(true);
    form.destroy();
  });

  it("a fixed onSubmit validator error clears on re-submit", async () => {
    const submitted: Array<{ name: string }> = [];
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      validators: {
        onSubmit: ({ value }: any) =>
          value.name ? undefined : "name required",
      },
      onSubmit: async ({ value }) => {
        submitted.push(value);
      },
    });
    form.field<string>("name");

    await form.handleSubmit();
    await flush();
    expect(submitted).toHaveLength(0);
    expect(form.state().errorMap.onSubmit).toBe("name required");

    form.setFieldValue("name", "Ada");
    await flush();
    await form.handleSubmit();
    await flush();
    expect(submitted).toEqual([{ name: "Ada" }]);
    expect(form.state().errorMap.onSubmit).toBeUndefined();
    form.destroy();
  });

  it("a stale onBlur error no longer blocks re-submission (upstream 1.33.1+ fix)", async () => {
    const submitted: Array<{ name: string }> = [];
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      onSubmit: async ({ value }) => {
        submitted.push(value);
      },
    });
    const name = form.field<string>("name", {
      validators: {
        onBlur: ({ value }: any) =>
          value.length < 3 ? "too short" : undefined,
      },
    });

    name.handleChange("ab");
    name.handleBlur();
    await flush();
    expect(name.errors()).toContain("too short");

    // First submission: blocked by the stale onBlur error (early return,
    // submissionAttempts becomes 1).
    await form.handleSubmit();
    await flush();
    expect(submitted).toHaveLength(0);

    // Fix the value. There is no onChange validator, so the onBlur error is
    // not re-evaluated on change...
    name.handleChange("abcd");
    await flush();
    expect(name.errors()).toContain("too short");

    // ...but from 1.33.1 on, re-submission (submissionAttempts > 1) skips the
    // early canSubmit return so validateAllFields('submit') re-runs the
    // change/blur/submit validators and clears stale non-submit errors.
    // Flipped from the pinned 1.33.0 behavior at the wave-3 rebase
    // (16-form.md finding #2).
    await form.handleSubmit();
    await flush();
    expect(submitted).toEqual([{ name: "abcd" }]);
    expect(form.isSubmitted()).toBe(true);
    form.destroy();
  });

  it("a rejected onSubmit handler resets isSubmitting and flags the failure", async () => {
    const boom = new Error("server down");
    const form = createForm<{ name: string }>({
      defaultValues: { name: "Ada" },
      onSubmit: async () => {
        throw boom;
      },
    });
    form.field<string>("name");

    await expect(form.handleSubmit()).rejects.toBe(boom);
    await flush();
    expect(form.isSubmitting()).toBe(false);
    expect(form.state().isSubmitSuccessful).toBe(false);
    // A failed handler does not block a retry.
    form.state().submissionAttempts;
    expect(form.state().submissionAttempts).toBe(1);
    form.destroy();
  });

  it("a second overlapping handleSubmit does not run onSubmit", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const onSubmit = vi.fn(async () => {
      await gate;
    });
    const form = createForm<{ name: string }>({
      defaultValues: { name: "Ada" },
      onSubmit,
    });
    form.field<string>("name");

    const first = form.handleSubmit();
    expect(form.isSubmitting()).toBe(true);

    const second = form.handleSubmit();
    release();
    await Promise.all([first, second]);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(form.state().submissionAttempts).toBe(1);
    expect(form.isSubmitted()).toBe(true);
    form.destroy();
  });
});
