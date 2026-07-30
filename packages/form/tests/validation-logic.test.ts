// Validation infrastructure: defaultValidationLogic event fan-out,
// revalidateLogic gating (unit + integration), onChangeListenTo linked-field
// validation, standardSchemaValidator (hand-rolled Standard Schema objects —
// no dependency), mergeForm, and the transform helper.

import { describe, expect, it, vi } from "vitest";
import {
  defaultValidationLogic,
  mergeAndUpdate,
  mergeForm,
  mutateMergeDeep,
  revalidateLogic,
  type StandardSchemaV1,
  standardSchemaValidators,
  type ValidationLogicValidatorsFn,
} from "../src/index";
import { createHeadlessForm, flush, mountField } from "./helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectValidators() {
  const runs: ValidationLogicValidatorsFn[][] = [];
  return {
    runs,
    runValidation: (props: {
      validators: Array<ValidationLogicValidatorsFn | undefined>;
    }) => {
      runs.push(
        props.validators.filter(Boolean) as ValidationLogicValidatorsFn[],
      );
    },
  };
}

const noopForm = (submissionAttempts = 0) =>
  ({ state: { submissionAttempts } }) as any;

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

// ---------------------------------------------------------------------------
// defaultValidationLogic
// ---------------------------------------------------------------------------

describe("defaultValidationLogic", () => {
  const validators = {
    onMount: () => "mount",
    onChange: () => "change",
    onBlur: () => "blur",
    onSubmit: () => "submit",
    onChangeAsync: async () => "changeAsync",
    onBlurAsync: async () => "blurAsync",
    onSubmitAsync: async () => "submitAsync",
  } as any;

  it("runs no validators when none are provided", () => {
    const { runs, runValidation } = collectValidators();
    defaultValidationLogic({
      form: noopForm(),
      validators: undefined,
      event: { type: "change", async: false },
      runValidation,
    } as any);
    expect(runs).toEqual([[]]);
  });

  it("mount event runs only the onMount validator", () => {
    const { runs, runValidation } = collectValidators();
    defaultValidationLogic({
      form: noopForm(),
      validators,
      event: { type: "mount", async: false },
      runValidation,
    } as any);
    expect(runs[0]?.map((v) => v.cause)).toEqual(["mount"]);
    expect(runs[0]?.[0]?.fn).toBe(validators.onMount);
  });

  it("change event runs onChange plus the onServer clearer", () => {
    const { runs, runValidation } = collectValidators();
    defaultValidationLogic({
      form: noopForm(),
      validators,
      event: { type: "change", async: false },
      runValidation,
    } as any);
    expect(runs[0]?.map((v) => v.cause)).toEqual(["change", "server"]);
  });

  it("blur event runs onBlur plus the onServer clearer", () => {
    const { runs, runValidation } = collectValidators();
    defaultValidationLogic({
      form: noopForm(),
      validators,
      event: { type: "blur", async: false },
      runValidation,
    } as any);
    expect(runs[0]?.map((v) => v.cause)).toEqual(["blur", "server"]);
  });

  it("submit event runs change, blur, submit and server validators", () => {
    const { runs, runValidation } = collectValidators();
    defaultValidationLogic({
      form: noopForm(),
      validators,
      event: { type: "submit", async: false },
      runValidation,
    } as any);
    expect(runs[0]?.map((v) => v.cause)).toEqual([
      "change",
      "blur",
      "submit",
      "server",
    ]);
  });

  it("async events select the async validator variants", () => {
    const { runs, runValidation } = collectValidators();
    defaultValidationLogic({
      form: noopForm(),
      validators,
      event: { type: "change", async: true },
      runValidation,
    } as any);
    expect(runs[0]?.[0]?.fn).toBe(validators.onChangeAsync);

    const { runs: submitRuns, runValidation: runSubmit } = collectValidators();
    defaultValidationLogic({
      form: noopForm(),
      validators,
      event: { type: "submit", async: true },
      runValidation: runSubmit,
    } as any);
    expect(submitRuns[0]?.map((v) => v.fn)).toEqual([
      validators.onChangeAsync,
      validators.onBlurAsync,
      validators.onSubmitAsync,
    ]);
  });

  it("server event runs nothing (only clears)", () => {
    const { runs, runValidation } = collectValidators();
    defaultValidationLogic({
      form: noopForm(),
      validators,
      event: { type: "server", async: false },
      runValidation,
    } as any);
    expect(runs).toEqual([[]]);
  });

  it("throws on an unknown event type", () => {
    expect(() =>
      defaultValidationLogic({
        form: noopForm(),
        validators,
        event: { type: "bogus", async: false },
        runValidation: () => {},
      } as any),
    ).toThrow("Unknown validation event type: bogus");
  });
});

// ---------------------------------------------------------------------------
// revalidateLogic
// ---------------------------------------------------------------------------

describe("revalidateLogic", () => {
  const dynamicValidators = { onDynamic: () => "dynamic error" } as any;

  it("does not run onDynamic before submission (default mode: submit)", () => {
    const { runs, runValidation } = collectValidators();
    revalidateLogic()({
      form: noopForm(0),
      validators: dynamicValidators,
      event: { type: "change", async: false },
      runValidation,
    } as any);
    expect(runs[0]?.some((v) => v.cause === "dynamic")).toBe(false);
  });

  it("runs onDynamic on change after the form has been submitted", () => {
    const { runs, runValidation } = collectValidators();
    revalidateLogic()({
      form: noopForm(1),
      validators: dynamicValidators,
      event: { type: "change", async: false },
      runValidation,
    } as any);
    const dynamic = runs[0]?.find((v) => v.cause === "dynamic");
    expect(dynamic?.fn).toBe(dynamicValidators.onDynamic);
  });

  it("always runs onDynamic on submit events", () => {
    const { runs, runValidation } = collectValidators();
    revalidateLogic()({
      form: noopForm(0),
      validators: dynamicValidators,
      event: { type: "submit", async: false },
      runValidation,
    } as any);
    expect(runs[0]?.some((v) => v.cause === "dynamic")).toBe(true);
  });

  it("respects custom mode/modeAfterSubmission", () => {
    // mode: 'change' — dynamic runs on change even before submission.
    const { runs, runValidation } = collectValidators();
    revalidateLogic({ mode: "change", modeAfterSubmission: "blur" })({
      form: noopForm(0),
      validators: dynamicValidators,
      event: { type: "change", async: false },
      runValidation,
    } as any);
    expect(runs[0]?.some((v) => v.cause === "dynamic")).toBe(true);

    // modeAfterSubmission: 'blur' — after submission, change no longer runs it.
    const { runs: after, runValidation: runAfter } = collectValidators();
    revalidateLogic({ mode: "change", modeAfterSubmission: "blur" })({
      form: noopForm(2),
      validators: dynamicValidators,
      event: { type: "change", async: false },
      runValidation: runAfter,
    } as any);
    expect(after[0]?.some((v) => v.cause === "dynamic")).toBe(false);
  });

  it("gates on the group's submissionAttempts when a group context is passed", () => {
    const group = (attempts: number) =>
      ({ state: { meta: { submissionAttempts: attempts } } }) as any;

    // Form submitted, group not: pre-submission mode applies to the group.
    const { runs, runValidation } = collectValidators();
    revalidateLogic()({
      form: noopForm(3),
      group: group(0),
      validators: dynamicValidators,
      event: { type: "change", async: false },
      runValidation,
    } as any);
    expect(runs[0]?.some((v) => v.cause === "dynamic")).toBe(false);

    // Group submitted: post-submission mode applies.
    const { runs: after, runValidation: runAfter } = collectValidators();
    revalidateLogic()({
      form: noopForm(0),
      group: group(1),
      validators: dynamicValidators,
      event: { type: "change", async: false },
      runValidation: runAfter,
    } as any);
    expect(after[0]?.some((v) => v.cause === "dynamic")).toBe(true);
  });

  it("integration: field onDynamic stays quiet until the form is submitted", async () => {
    const onSubmit = vi.fn();
    const form = createHeadlessForm({
      defaultValues: { name: "" },
      validationLogic: revalidateLogic(),
      onSubmit,
    });
    const field = mountField(form, "name", {
      validators: {
        onDynamic: ({ value }: any) => (value ? undefined : "required"),
      },
    });

    // Pre-submission changes never surface the dynamic error.
    field.handleChange("");
    expect(field.state.meta.errorMap.onDynamic).toBeUndefined();

    // Submitting runs onDynamic and blocks the invalid submit.
    await form.handleSubmit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(field.state.meta.errorMap.onDynamic).toBe("required");

    // Post-submission changes re-run onDynamic and clear the error.
    field.handleChange("Ada");
    expect(field.state.meta.errorMap.onDynamic).toBeUndefined();

    await form.handleSubmit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// onChangeListenTo linked-field validation
// ---------------------------------------------------------------------------

describe("linked-field validation (listenTo)", () => {
  it("onChangeListenTo revalidates the linked field when the source changes", () => {
    const form = createHeadlessForm({
      defaultValues: { password: "secret", confirm: "secret" },
    });
    const password = mountField(form, "password");
    const confirm = mountField(form, "confirm", {
      validators: {
        onChangeListenTo: ["password"],
        onChange: ({ value, fieldApi }: any) =>
          value === fieldApi.form.getFieldValue("password")
            ? undefined
            : "passwords do not match",
      },
    });

    password.handleChange("different");
    expect(confirm.state.meta.errorMap.onChange).toBe("passwords do not match");

    password.handleChange("secret");
    expect(confirm.state.meta.errorMap.onChange).toBeUndefined();
  });

  it("onBlurListenTo revalidates the linked field on blur cause", () => {
    const form = createHeadlessForm({
      defaultValues: { a: "x", b: "x" },
    });
    const a = mountField(form, "a");
    const b = mountField(form, "b", {
      validators: {
        onBlurListenTo: ["a"],
        onBlur: ({ value, fieldApi }: any) =>
          value === fieldApi.form.getFieldValue("a") ? undefined : "mismatch",
      },
    });

    // Change alone does not trigger the blur-cause linked validation.
    a.handleChange("y");
    expect(b.state.meta.errorMap.onBlur).toBeUndefined();

    a.handleBlur();
    expect(b.state.meta.errorMap.onBlur).toBe("mismatch");
  });
});

// ---------------------------------------------------------------------------
// standardSchemaValidator
// ---------------------------------------------------------------------------

describe("standardSchemaValidators", () => {
  it("returns undefined for valid values", () => {
    const result = standardSchemaValidators.validate(
      { value: "abcd", validationSource: "field" },
      minStringSchema(3, "too short"),
    );
    expect(result).toBeUndefined();
  });

  it("returns the issue list for field-source failures", () => {
    const result = standardSchemaValidators.validate(
      { value: "ab", validationSource: "field" },
      minStringSchema(3, "too short"),
    );
    expect(result).toEqual([{ message: "too short" }]);
  });

  it("maps issue paths to form/field error records for form-source failures", () => {
    const schema: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [
            { message: "name required", path: ["name"] },
            { message: "city required", path: ["address", "city"] },
            { message: "tag required", path: ["tags", 1] },
          ],
        }),
      },
    };
    const value = { name: "", address: { city: "" }, tags: ["a", ""] };
    const result = standardSchemaValidators.validate(
      { value, validationSource: "form" },
      schema,
    ) as any;

    expect(Object.keys(result.form)).toEqual(
      expect.arrayContaining(["name", "address.city", "tags[1]"]),
    );
    expect(result.fields.name).toEqual([
      { message: "name required", path: ["name"] },
    ]);
    expect(result.fields["address.city"][0].message).toBe("city required");
    expect(result.fields["tags[1]"][0].message).toBe("tag required");
  });

  it("throws when an async schema is used in the sync validator", () => {
    const asyncSchema: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async () => ({ value: null }),
      },
    };
    expect(() =>
      standardSchemaValidators.validate(
        { value: "x", validationSource: "field" },
        asyncSchema,
      ),
    ).toThrow("async function passed to sync validator");
  });

  it("validateAsync supports promise-returning schemas", async () => {
    const asyncSchema: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async (value) =>
          value === "ok" ? { value } : { issues: [{ message: "not ok" }] },
      },
    };
    await expect(
      standardSchemaValidators.validateAsync(
        { value: "nope", validationSource: "field" },
        asyncSchema,
      ),
    ).resolves.toEqual([{ message: "not ok" }]);
    await expect(
      standardSchemaValidators.validateAsync(
        { value: "ok", validationSource: "field" },
        asyncSchema,
      ),
    ).resolves.toBeUndefined();
  });

  it("integration: a standard schema as a field validator surfaces issues as errors", () => {
    const form = createHeadlessForm({ defaultValues: { name: "" } });
    const field = mountField(form, "name", {
      validators: { onChange: minStringSchema(3, "too short") },
    });

    field.handleChange("ab");
    expect(field.state.meta.errorMap.onChange).toEqual([
      { message: "too short" },
    ]);

    field.handleChange("abcd");
    expect(field.state.meta.errorMap.onChange).toBeUndefined();
  });

  it("integration: a standard schema as a form validator fans errors out to fields", async () => {
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
    const form = createHeadlessForm({
      defaultValues: { name: "" },
      validators: { onChange: schema },
    });
    const field = mountField(form, "name");

    field.handleChange("");
    await flush();
    expect(field.state.meta.errorMap.onChange).toEqual([
      { message: "name required", path: ["name"] },
    ]);
    expect(field.state.meta.errorSourceMap.onChange).toBe("form");

    field.handleChange("Ada");
    await flush();
    expect(field.state.meta.errorMap.onChange).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// mergeForm / mutateMergeDeep
// ---------------------------------------------------------------------------

describe("mergeForm", () => {
  it("merges partial state deeply into the form state", () => {
    const form = createHeadlessForm({
      defaultValues: { a: 1, nested: { b: 2, c: 3 } },
    });

    mergeForm(form as any, { values: { a: 10, nested: { b: 20 } } } as any);

    expect((form.state.values as any).a).toBe(10);
    // Untouched keys survive the deep merge.
    expect((form.state.values as any).nested).toEqual({ b: 20, c: 3 });
  });

  it("replaces arrays rather than merging them element-wise", () => {
    const form = createHeadlessForm({ defaultValues: { tags: [1, 2, 3] } });

    mergeForm(form as any, { values: { tags: [9] } } as any);
    expect((form.state.values as any).tags).toEqual([9]);
  });

  it("returns the same form instance", () => {
    const form = createHeadlessForm({ defaultValues: { a: 1 } });
    expect(mergeForm(form as any, {} as any)).toBe(form);
  });

  it("mutateMergeDeep refuses prototype-polluting keys", () => {
    const target = { safe: 1 } as any;
    mutateMergeDeep(target, {
      safe: 2,
      __proto__: { polluted: true },
      constructor: "nope",
      prototype: "nope",
    } as any);

    expect(target.safe).toBe(2);
    expect(({} as any).polluted).toBeUndefined();
    expect(target.constructor).not.toBe("nope");
  });

  it("mutateMergeDeep returns a fresh object for non-object targets", () => {
    expect(mutateMergeDeep(null, { a: 1 })).toEqual({});
    expect(mutateMergeDeep(undefined, { a: 1 })).toEqual({});
    const scalar = mutateMergeDeep({ a: 1 }, 5 as any);
    expect(scalar).toEqual({ a: 1 });
  });
});

// ---------------------------------------------------------------------------
// transform (mergeAndUpdate)
// ---------------------------------------------------------------------------

describe("mergeAndUpdate", () => {
  it("applies state mutations from the transform fn to the live store", () => {
    const form = createHeadlessForm({ defaultValues: { a: 1, b: 2 } });

    mergeAndUpdate(form as any, (formBase: any) => {
      formBase.state.values = { ...formBase.state.values, a: 99 };
    });

    expect((form.state.values as any).a).toBe(99);
    expect((form.state.values as any).b).toBe(2);
  });

  it("does not mutate the live state while the transform fn runs", () => {
    const form = createHeadlessForm({ defaultValues: { a: 1 } });
    let observedDuringTransform: unknown;

    mergeAndUpdate(form as any, (formBase: any) => {
      formBase.state.values = { a: 99 };
      observedDuringTransform = (form.state.values as any).a;
    });

    expect(observedDuringTransform).toBe(1);
    expect((form.state.values as any).a).toBe(99);
  });

  it("routes errorMap mutations through setErrorMap", () => {
    const form = createHeadlessForm({ defaultValues: { a: 1 } });

    mergeAndUpdate(form as any, (formBase: any) => {
      formBase.state.errorMap = { onSubmit: "server says no" };
    });

    expect((form.state.errorMap as any).onSubmit).toBe("server says no");
  });

  it("is a no-op without a transform fn", () => {
    const form = createHeadlessForm({ defaultValues: { a: 1 } });
    mergeAndUpdate(form as any);
    expect((form.state.values as any).a).toBe(1);
  });
});
