// FormGroupApi/FieldGroupApi are in-house (NOT ported from upstream
// @tanstack/form-core), so they get the deepest coverage in this package:
// group creation/nesting, group validation gating on the group's own
// submissionAttempts, group-level errors fanning out to child fields, and
// nested group paths.

import { describe, expect, it, vi } from "vitest";
import { FieldGroupApi, FormGroupApi, revalidateLogic } from "../src/index";
import { createHeadlessForm, flush, mountField } from "./helpers";

describe("FormGroupApi creation and value derivation", () => {
  it("derives its value from the parent form values at its path", () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "Ada", age: 36 }, other: "x" },
    });
    const group = new FormGroupApi({ form, name: "person" } as any);
    group.mount();

    expect(group.state.value).toEqual({ name: "Ada", age: 36 });
  });

  it("updates its value when a child field changes", () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "Ada" } },
    });
    const name = mountField(form, "person.name");
    const group = new FormGroupApi({ form, name: "person" } as any);
    group.mount();

    name.handleChange("Grace");
    expect(group.state.value).toEqual({ name: "Grace" });
  });

  it("aggregates descendant field meta (isTouched, isDirty, isFieldsValid)", () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "Ada" }, other: "x" },
    });
    const name = mountField(form, "person.name");
    mountField(form, "other");
    const group = new FormGroupApi({ form, name: "person" } as any);
    group.mount();

    expect(group.state.meta.isTouched).toBe(false);
    expect(group.state.meta.isDirty).toBe(false);
    expect(group.state.meta.isFieldsValid).toBe(true);

    name.handleChange("Grace");

    expect(group.state.meta.isTouched).toBe(true);
    expect(group.state.meta.isDirty).toBe(true);
    expect(group.state.meta.isPristine).toBe(false);
  });

  it("getRelatedFields returns only descendant FieldApi instances", () => {
    const form = createHeadlessForm({
      defaultValues: {
        person: { name: "Ada", address: { city: "Paris" } },
        settings: { theme: "dark" },
      },
    });
    mountField(form, "person.name");
    mountField(form, "person.address.city");
    mountField(form, "settings.theme");
    const group = new FormGroupApi({ form, name: "person" } as any);
    group.mount();

    const related = group.getRelatedFields().map((f: any) => f.name);
    expect(related.sort()).toEqual(["person.address.city", "person.name"]);
  });

  it("supports nested groups: the inner group reads a sub-path of the outer", () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "Ada", address: { city: "Paris" } } },
    });
    const city = mountField(form, "person.address.city");
    const outer = new FormGroupApi({ form, name: "person" } as any);
    const inner = new FormGroupApi({ form, name: "person.address" } as any);
    outer.mount();
    inner.mount();

    expect(outer.state.value).toEqual({
      name: "Ada",
      address: { city: "Paris" },
    });
    expect(inner.state.value).toEqual({ city: "Paris" });

    city.handleChange("Lyon");
    expect(inner.state.value).toEqual({ city: "Lyon" });
    expect(outer.state.value.address.city).toBe("Lyon");
  });
});

describe("FormGroupApi validation", () => {
  it("runs the group's onChange validator when a child field changes", () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "" } },
    });
    const name = mountField(form, "person.name");
    const onChange = vi.fn(
      ({ value }: any) => (value.name ? undefined : "name required") as any,
    );
    const group = new FormGroupApi({
      form,
      name: "person",
      validators: { onChange },
    } as any);
    group.mount();

    name.handleChange("");
    expect(onChange).toHaveBeenCalled();
    expect(group.state.meta.errorMap.onChange).toBe("name required");
    expect(group.state.meta.isGroupValid).toBe(false);
    expect(group.state.meta.isValid).toBe(false);

    name.handleChange("Ada");
    expect(group.state.meta.errorMap.onChange).toBeUndefined();
    expect(group.state.meta.isGroupValid).toBe(true);
    expect(group.state.meta.isValid).toBe(true);
  });

  it("fans { group, fields } errors out to the group's meta and child fields", () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "" } },
    });
    const name = mountField(form, "person.name");
    const group = new FormGroupApi({
      form,
      name: "person",
      validators: {
        onChange: ({ value }: any) =>
          value.name
            ? undefined
            : { group: "person is invalid", fields: { name: "name required" } },
      },
    } as any);
    group.mount();

    name.handleChange("");

    // Group portion lands on the group's own error map...
    expect(group.state.meta.errorMap.onChange).toBe("person is invalid");
    expect(group.state.meta.errors).toContain("person is invalid");
    // ...and the fields portion is distributed onto the child field.
    expect(name.state.meta.errorMap.onChange).toBe("name required");
    expect(name.state.meta.errors).toContain("name required");
  });

  it("clears stale distributed child errors on the next run", () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "", age: 0 } },
    });
    const name = mountField(form, "person.name");
    const age = mountField(form, "person.age");
    const group = new FormGroupApi({
      form,
      name: "person",
      validators: {
        onChange: ({ value }: any) => {
          const fields: Record<string, string> = {};
          if (!value.name) fields.name = "name required";
          if (value.age < 18) fields.age = "must be an adult";
          return Object.keys(fields).length ? { fields } : undefined;
        },
      },
    } as any);
    group.mount();

    name.handleChange("");
    expect(name.state.meta.errorMap.onChange).toBe("name required");
    expect(age.state.meta.errorMap.onChange).toBe("must be an adult");

    // Fix name only: its distributed error clears, age's persists.
    name.handleChange("Ada");
    expect(name.state.meta.errorMap.onChange).toBeUndefined();
    expect(age.state.meta.errorMap.onChange).toBe("must be an adult");

    age.handleChange(20);
    expect(age.state.meta.errorMap.onChange).toBeUndefined();
  });

  it("gates onDynamic on the group's own submissionAttempts with revalidateLogic", async () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "" } },
    });
    const name = mountField(form, "person.name");
    const onGroupSubmit = vi.fn();
    const onGroupSubmitInvalid = vi.fn();
    const group = new FormGroupApi({
      form,
      name: "person",
      validationLogic: revalidateLogic(),
      validators: {
        onDynamic: ({ value }: any) =>
          value.name ? undefined : "name required",
      },
      onGroupSubmit,
      onGroupSubmitInvalid,
    } as any);
    group.mount();

    // Before any group submission, a change must NOT run onDynamic.
    name.handleChange("");
    expect(group.state.meta.errorMap.onDynamic).toBeUndefined();

    // Submitting the group runs onDynamic (submit mode) and fails invalid.
    await group.handleSubmit();
    expect(group.state.meta.submissionAttempts).toBe(1);
    expect(onGroupSubmit).not.toHaveBeenCalled();
    expect(onGroupSubmitInvalid).toHaveBeenCalledTimes(1);
    expect(group.state.meta.errorMap.onDynamic).toBe("name required");

    // After the first submission attempt, changes DO run onDynamic
    // (modeAfterSubmission defaults to 'change') and clear the error.
    name.handleChange("Ada");
    expect(group.state.meta.errorMap.onDynamic).toBeUndefined();

    // The parent form was never submitted — gating must come from the group.
    expect(form.state.submissionAttempts).toBe(0);

    await group.handleSubmit();
    expect(onGroupSubmit).toHaveBeenCalledTimes(1);
    expect(group.state.meta.submissionAttempts).toBe(2);
    expect(group.state.meta.isSubmitted).toBe(true);
    expect(group.state.meta.isSubmitSuccessful).toBe(true);
  });

  it("does not leak group submission attempts into the parent form state", async () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "Ada" } },
    });
    mountField(form, "person.name");
    const group = new FormGroupApi({
      form,
      name: "person",
      onGroupSubmit: () => {},
    } as any);
    group.mount();

    await group.handleSubmit();
    expect(group.state.meta.submissionAttempts).toBe(1);
    expect(form.state.submissionAttempts).toBe(0);
    expect(form.state.isSubmitted).toBe(false);
  });
});

describe("FormGroupApi submission", () => {
  it("marks related fields touched on a submit attempt", async () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "Ada" } },
    });
    const name = mountField(form, "person.name");
    const group = new FormGroupApi({
      form,
      name: "person",
      onGroupSubmit: () => {},
    } as any);
    group.mount();

    expect(name.state.meta.isTouched).toBe(false);
    await group.handleSubmit();
    expect(name.state.meta.isTouched).toBe(true);
  });

  it("blocks submission when a related field is invalid and calls onGroupSubmitInvalid", async () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "" } },
    });
    mountField(form, "person.name", {
      validators: {
        onChange: ({ value }: any) => (value ? undefined : "name required"),
      },
    });
    const onGroupSubmit = vi.fn();
    const onGroupSubmitInvalid = vi.fn();
    const group = new FormGroupApi({
      form,
      name: "person",
      onGroupSubmit,
      onGroupSubmitInvalid,
    } as any);
    group.mount();

    await group.handleSubmit();
    expect(onGroupSubmit).not.toHaveBeenCalled();
    expect(onGroupSubmitInvalid).toHaveBeenCalledTimes(1);
    expect(group.state.meta.isSubmitSuccessful).toBe(false);
  });

  it("unmount resets the group's lifecycle state on the parent form", async () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "Ada" } },
    });
    mountField(form, "person.name");
    const group = new FormGroupApi({
      form,
      name: "person",
      onGroupSubmit: () => {},
    } as any);
    const unmount = group.mount();

    await group.handleSubmit();
    expect(group.state.meta.submissionAttempts).toBe(1);

    unmount();
    expect(form.state.formGroupStateBase.person).toMatchObject({
      submissionAttempts: 0,
      isSubmitted: false,
    });
  });
});

describe("FieldGroupApi", () => {
  it("maps a string path to form values and field accessors", () => {
    const form = createHeadlessForm({
      defaultValues: {
        person: { name: "Ada", age: 36 },
        settings: { theme: "dark" },
      },
    });
    const group = new FieldGroupApi({ form, fields: "person" } as any);

    expect(group.state.values).toEqual({ name: "Ada", age: 36 });
    expect(group.getFormFieldName("name")).toBe("person.name");
    expect(group.getFormFieldName("address.city")).toBe("person.address.city");
    expect(group.getFieldValue("name")).toBe("Ada");

    group.setFieldValue("name", "Grace");
    expect((form.state.values as any).person.name).toBe("Grace");
    expect(group.state.values).toEqual({ name: "Grace", age: 36 });
  });

  it("maps a FieldsMap to arbitrary form paths", () => {
    const form = createHeadlessForm({
      defaultValues: {
        person: { name: "Ada" },
        settings: { theme: "dark" },
      },
    });
    const group = new FieldGroupApi({
      form,
      fields: { userName: "person.name", theme: "settings.theme" },
    } as any);

    expect(group.state.values).toEqual({ userName: "Ada", theme: "dark" });
    expect(group.getFormFieldName("userName")).toBe("person.name");

    group.setFieldValue("userName", "Grace");
    expect((form.state.values as any).person.name).toBe("Grace");
  });

  it("nests inside another FieldGroupApi", () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "Ada", address: { city: "Paris" } } },
    });
    const outer = new FieldGroupApi({ form, fields: "person" } as any);
    const inner = new FieldGroupApi({
      form: outer,
      fields: { n: "name", c: "address.city" },
    } as any);

    expect(inner.getFormFieldName("n")).toBe("person.name");
    expect(inner.getFormFieldName("c")).toBe("person.address.city");
    expect(inner.state.values).toEqual({ n: "Ada", c: "Paris" });

    inner.setFieldValue("c", "Lyon");
    expect((form.state.values as any).person.address.city).toBe("Lyon");
  });

  it("remaps validators listenTo paths in getFormFieldOptions", () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "Ada", age: 36 } },
    });
    const group = new FieldGroupApi({ form, fields: "person" } as any);

    const options = group.getFormFieldOptions({
      name: "confirm",
      validators: {
        onChangeListenTo: ["name"],
        onBlurListenTo: ["age"],
      },
    } as any) as any;

    expect(options.name).toBe("person.confirm");
    expect(options.validators.onChangeListenTo).toEqual(["person.name"]);
    expect(options.validators.onBlurListenTo).toEqual(["person.age"]);
  });

  it("forwards array operations through the mapped path", () => {
    const form = createHeadlessForm({
      defaultValues: { data: { tags: ["a", "b"] } },
    });
    const group = new FieldGroupApi({ form, fields: "data" } as any);

    group.pushFieldValue("tags", "c");
    expect((form.state.values as any).data.tags).toEqual(["a", "b", "c"]);

    group.swapFieldValues("tags", 0, 2);
    expect((form.state.values as any).data.tags).toEqual(["c", "b", "a"]);
  });

  it("mount/unmount is a no-op that returns a cleanup function", () => {
    const form = createHeadlessForm({ defaultValues: { a: 1 } });
    const group = new FieldGroupApi({ form, fields: "a" } as any);
    const cleanup = group.mount();
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
  });

  it("state.values stays in sync with async form updates", async () => {
    const form = createHeadlessForm({
      defaultValues: { person: { name: "Ada" } },
    });
    const group = new FieldGroupApi({ form, fields: "person" } as any);

    form.setFieldValue("person.name" as never, "Grace");
    await flush();
    expect(group.state.values).toEqual({ name: "Grace" });
  });
});
