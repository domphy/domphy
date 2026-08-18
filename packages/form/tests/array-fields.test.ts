// Array field operations on FieldApi (src/FieldApi.ts pushValue…clearValues,
// delegating to FormApi.*FieldValue + metaHelper reindexing): value
// correctness, exactly one listener trigger per op, and meta reindexing
// following the values.

import { describe, expect, it, vi } from "vitest";
import { createHeadlessForm, flush, mountField } from "./helpers";

function setupArrayForm(tags: string[] = ["a", "b", "c"]) {
  const form = createHeadlessForm({ defaultValues: { tags } });
  const field = mountField(form, "tags");
  return { form, field };
}

// Custom meta props ride along untouched by validation (which only manages
// the known errorMap keys), so they make reliable reindex markers.
function markItems(form: any, values: string[]) {
  for (let index = 0; index < values.length; index++) {
    mountField(form, `tags[${index}]`);
    form.setFieldMeta(`tags[${index}]`, (prev: any) => ({
      ...prev,
      marker: `marker-${values[index]}`,
    }));
  }
}

describe("FieldApi array ops: value correctness", () => {
  it("pushValue appends (and starts from an empty array for non-array values)", () => {
    const { form, field } = setupArrayForm();
    field.pushValue("d");
    expect((form.state.values as any).tags).toEqual(["a", "b", "c", "d"]);

    const empty = createHeadlessForm({ defaultValues: {} });
    const emptyField = mountField(empty, "tags");
    emptyField.pushValue("x");
    expect((empty.state.values as any).tags).toEqual(["x"]);
  });

  it("insertValue inserts at the index, shifting later values right", async () => {
    const { form, field } = setupArrayForm();
    field.insertValue(1, "x");
    expect((form.state.values as any).tags).toEqual(["a", "x", "b", "c"]);
    await flush();
  });

  it("insertValue at index 0 prepends", async () => {
    const { form, field } = setupArrayForm();
    field.insertValue(0, "x");
    expect((form.state.values as any).tags).toEqual(["x", "a", "b", "c"]);
    await flush();
  });

  it("replaceValue swaps the value at the index without changing length", async () => {
    const { form, field } = setupArrayForm();
    field.replaceValue(1, "x");
    expect((form.state.values as any).tags).toEqual(["a", "x", "c"]);
    await flush();
  });

  it("removeValue removes the value at the index", async () => {
    const { form, field } = setupArrayForm();
    field.removeValue(1);
    expect((form.state.values as any).tags).toEqual(["a", "c"]);
    await flush();
  });

  it("swapValues exchanges two indices", () => {
    const { form, field } = setupArrayForm();
    field.swapValues(0, 2);
    expect((form.state.values as any).tags).toEqual(["c", "b", "a"]);
  });

  it("moveValue moves a value forward, shifting the range", () => {
    const { form, field } = setupArrayForm(["a", "b", "c", "d"]);
    field.moveValue(0, 2);
    expect((form.state.values as any).tags).toEqual(["b", "c", "a", "d"]);
  });

  it("moveValue moves a value backward, shifting the range", () => {
    const { form, field } = setupArrayForm(["a", "b", "c", "d"]);
    field.moveValue(3, 1);
    expect((form.state.values as any).tags).toEqual(["a", "d", "b", "c"]);
  });

  it("clearValues empties the array", () => {
    const { form, field } = setupArrayForm();
    field.clearValues();
    expect((form.state.values as any).tags).toEqual([]);
  });
});

describe("FieldApi array ops: listener firing", () => {
  it("fires the field onChange listener exactly once per op", async () => {
    const onChange = vi.fn();
    const form = createHeadlessForm({ defaultValues: { tags: ["a", "b"] } });
    const field = mountField(form, "tags", {
      listeners: { onChange },
    });

    field.pushValue("c");
    expect(onChange).toHaveBeenCalledTimes(1);

    field.insertValue(0, "x");
    expect(onChange).toHaveBeenCalledTimes(2);

    field.replaceValue(0, "y");
    expect(onChange).toHaveBeenCalledTimes(3);

    field.removeValue(0);
    expect(onChange).toHaveBeenCalledTimes(4);

    field.swapValues(0, 1);
    expect(onChange).toHaveBeenCalledTimes(5);

    field.moveValue(0, 1);
    expect(onChange).toHaveBeenCalledTimes(6);

    field.clearValues();
    expect(onChange).toHaveBeenCalledTimes(7);

    await flush();
    // No trailing duplicate notifications after async validation settles.
    expect(onChange).toHaveBeenCalledTimes(7);
  });

  it("passes the current value to the listener", () => {
    const seen: unknown[] = [];
    const form = createHeadlessForm({ defaultValues: { tags: ["a"] } });
    const field = mountField(form, "tags", {
      listeners: { onChange: ({ value }: any) => seen.push(value) },
    });

    field.pushValue("b");
    expect(seen).toEqual([["a", "b"]]);
  });

  it("respects dontRunListeners per op", () => {
    const onChange = vi.fn();
    const form = createHeadlessForm({ defaultValues: { tags: ["a"] } });
    const field = mountField(form, "tags", {
      listeners: { onChange },
    });

    field.pushValue("b", { dontRunListeners: true });
    field.removeValue(0, { dontRunListeners: true });
    field.clearValues({ dontRunListeners: true });
    expect(onChange).not.toHaveBeenCalled();

    field.pushValue("c");
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("FieldApi array ops: meta reindexing", () => {
  it("removeValue shifts item meta up to follow the values", async () => {
    const form = createHeadlessForm({
      defaultValues: { tags: ["a", "b", "c"] },
    });
    markItems(form, ["a", "b", "c"]);
    const field = mountField(form, "tags");

    field.removeValue(0);

    expect((form.state.values as any).tags).toEqual(["b", "c"]);
    expect((form.getFieldMeta("tags[0]" as never) as any).marker).toBe(
      "marker-b",
    );
    expect((form.getFieldMeta("tags[1]" as never) as any).marker).toBe(
      "marker-c",
    );
    // The trailing item's field entry is deleted with the value.
    expect(form.getFieldMeta("tags[2]" as never)).toBeUndefined();
    await flush();
  });

  it("insertValue shifts item meta down and resets the inserted slot", async () => {
    const form = createHeadlessForm({
      defaultValues: { tags: ["a", "b", "c"] },
    });
    markItems(form, ["a", "b", "c"]);
    const field = mountField(form, "tags");

    field.insertValue(1, "x");

    expect((form.state.values as any).tags).toEqual(["a", "x", "b", "c"]);
    // insertFieldValue awaits field validation before shifting meta, so the
    // shift lands asynchronously (unlike removeValue's synchronous shift).
    await flush();
    expect((form.getFieldMeta("tags[0]" as never) as any).marker).toBe(
      "marker-a",
    );
    expect(
      (form.getFieldMeta("tags[1]" as never) as any).marker,
    ).toBeUndefined();
    expect((form.getFieldMeta("tags[2]" as never) as any).marker).toBe(
      "marker-b",
    );
  });

  it("swapValues swaps item meta between the two indices", () => {
    const form = createHeadlessForm({
      defaultValues: { tags: ["a", "b", "c"] },
    });
    markItems(form, ["a", "b", "c"]);
    const field = mountField(form, "tags");

    field.swapValues(0, 2);

    expect((form.getFieldMeta("tags[0]" as never) as any).marker).toBe(
      "marker-c",
    );
    expect((form.getFieldMeta("tags[1]" as never) as any).marker).toBe(
      "marker-b",
    );
    expect((form.getFieldMeta("tags[2]" as never) as any).marker).toBe(
      "marker-a",
    );
  });

  it("moveValue carries the moved item's meta to the destination index", () => {
    const form = createHeadlessForm({
      defaultValues: { tags: ["a", "b", "c"] },
    });
    markItems(form, ["a", "b", "c"]);
    const field = mountField(form, "tags");

    field.moveValue(0, 2);

    expect((form.state.values as any).tags).toEqual(["b", "c", "a"]);
    expect((form.getFieldMeta("tags[0]" as never) as any).marker).toBe(
      "marker-b",
    );
    expect((form.getFieldMeta("tags[1]" as never) as any).marker).toBe(
      "marker-c",
    );
    expect((form.getFieldMeta("tags[2]" as never) as any).marker).toBe(
      "marker-a",
    );
  });

  it("clearValues drops all per-item field entries", async () => {
    const form = createHeadlessForm({
      defaultValues: { tags: ["a", "b", "c"] },
    });
    markItems(form, ["a", "b", "c"]);
    const field = mountField(form, "tags");

    field.clearValues();

    expect(form.getFieldMeta("tags[0]" as never)).toBeUndefined();
    expect(form.getFieldMeta("tags[1]" as never)).toBeUndefined();
    expect(form.getFieldMeta("tags[2]" as never)).toBeUndefined();
    await flush();
  });

  it("item-level errors follow the item after a remove (not just custom props)", async () => {
    const form = createHeadlessForm({
      defaultValues: { tags: ["a", "b", "c"] },
    });
    mountField(form, "tags[0]");
    mountField(form, "tags[1]", {
      validators: {
        onMount: () => "b is invalid",
      },
    });
    mountField(form, "tags[2]");
    const field = mountField(form, "tags");

    expect(
      (form.getFieldMeta("tags[1]" as never) as any).errorMap.onMount,
    ).toBe("b is invalid");

    field.removeValue(0);

    // The error marker moved with the "b" value from tags[1] to tags[0].
    expect(
      (form.getFieldMeta("tags[0]" as never) as any).errorMap.onMount,
    ).toBe("b is invalid");
    await flush();
  });
});

describe("FormApi.deleteField: path-boundary", () => {
  it("does not delete a sibling whose name only shares a prefix", () => {
    const form = createHeadlessForm({
      defaultValues: { email: "a@b.com", emailConfirm: "a@b.com" },
    });
    mountField(form, "email");
    mountField(form, "emailConfirm");

    form.deleteField("email" as never);

    expect((form.state.values as any).email).toBeUndefined();
    expect((form.state.values as any).emailConfirm).toBe("a@b.com");
    expect("email" in form.fieldInfo).toBe(false);
    expect("emailConfirm" in form.fieldInfo).toBe(true);
    expect(form.getFieldMeta("emailConfirm" as never)).toBeDefined();
  });

  it("does not delete tags[10] when deleting tags[1]", () => {
    const tags = [
      "t0",
      "t1",
      "t2",
      "t3",
      "t4",
      "t5",
      "t6",
      "t7",
      "t8",
      "t9",
      "t10",
    ];
    const form = createHeadlessForm({ defaultValues: { tags } });
    mountField(form, "tags[1]");
    mountField(form, "tags[10]");

    form.deleteField("tags[1]" as never);

    expect("tags[1]" in form.fieldInfo).toBe(false);
    expect("tags[10]" in form.fieldInfo).toBe(true);
    expect(form.getFieldMeta("tags[10]" as never)).toBeDefined();
    // deleteBy splices index 1 only; the original tags[10] value shifts to [9].
    expect((form.state.values as any).tags).toEqual([
      "t0",
      "t2",
      "t3",
      "t4",
      "t5",
      "t6",
      "t7",
      "t8",
      "t9",
      "t10",
    ]);
  });

  it("does not delete a dotted index sibling (tags.1 must not take tags.10)", () => {
    const form = createHeadlessForm({
      defaultValues: {
        tags: [
          "t0",
          "t1",
          "t2",
          "t3",
          "t4",
          "t5",
          "t6",
          "t7",
          "t8",
          "t9",
          "t10",
        ],
      },
    });
    mountField(form, "tags.1");
    mountField(form, "tags.10");

    form.deleteField("tags.1" as never);

    expect("tags.1" in form.fieldInfo).toBe(false);
    expect("tags.10" in form.fieldInfo).toBe(true);
    expect(form.getFieldMeta("tags.10" as never)).toBeDefined();
  });

  it("still deletes real children of the field (dot and bracket)", () => {
    const form = createHeadlessForm({
      defaultValues: {
        user: { name: "Ada" },
        tags: [{ label: "a" }, { label: "b" }],
      },
    });
    mountField(form, "user");
    mountField(form, "user.name");
    mountField(form, "tags");
    mountField(form, "tags[0]");
    mountField(form, "tags[0].label");
    mountField(form, "tags[1]");

    form.deleteField("user" as never);
    expect("user" in form.fieldInfo).toBe(false);
    expect("user.name" in form.fieldInfo).toBe(false);

    form.deleteField("tags[0]" as never);
    expect("tags[0]" in form.fieldInfo).toBe(false);
    expect("tags[0].label" in form.fieldInfo).toBe(false);
    expect("tags[1]" in form.fieldInfo).toBe(true);
  });
});
