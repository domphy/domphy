import { describe, expect, it } from "vitest";
import { createForm } from "../src/domphy/index";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createForm.destroy", () => {
  it("unsubscribes the form so listeners stop firing after destroy", async () => {
    const form = createForm<{ name: string }>({
      defaultValues: { name: "Ada" },
    });
    const name = form.field<string>("name");

    let calls = 0;
    name.value(() => calls++);

    name.handleChange("Grace");
    await flush();
    const callsBeforeDestroy = calls;
    expect(callsBeforeDestroy).toBeGreaterThan(0);

    form.destroy();

    // After destroy the version State is disposed and the store subscription
    // is removed: further field changes must not notify the listener.
    name.handleChange("Lin");
    await flush();
    expect(calls).toBe(callsBeforeDestroy);
  });

  it("tears down multiple fields without error and stops all of them", async () => {
    const form = createForm<{ a: string; b: string }>({
      defaultValues: { a: "", b: "" },
    });
    const a = form.field<string>("a");
    const b = form.field<string>("b");

    let aCalls = 0;
    let bCalls = 0;
    a.value(() => aCalls++);
    b.value(() => bCalls++);

    a.handleChange("x");
    b.handleChange("y");
    await flush();
    expect(aCalls).toBeGreaterThan(0);
    expect(bCalls).toBeGreaterThan(0);
    const aSnapshot = aCalls;
    const bSnapshot = bCalls;

    form.destroy();

    a.handleChange("xx");
    b.handleChange("yy");
    await flush();
    expect(aCalls).toBe(aSnapshot);
    expect(bCalls).toBe(bSnapshot);
  });
});

describe("createForm state accessors", () => {
  it("exposes canSubmit, isSubmitting, isValid, isSubmitted, state and version", async () => {
    const form = createForm<{ name: string }>({
      defaultValues: { name: "init" },
    });

    expect(typeof form.canSubmit()).toBe("boolean");
    expect(form.isSubmitting()).toBe(false);
    expect(typeof form.isValid()).toBe("boolean");
    expect(form.isSubmitted()).toBe(false);
    expect(form.state().values).toEqual({ name: "init" });
    expect(typeof form.version()).toBe("number");

    const before = form.version();
    form.field<string>("name").handleChange("changed");
    await flush();
    expect(form.version()).toBeGreaterThan(before);
    form.destroy();
  });

  it("flips isSubmitted after a submit", async () => {
    const form = createForm<{ name: string }>({
      defaultValues: { name: "v" },
      onSubmit: () => {},
    });
    expect(form.isSubmitted()).toBe(false);
    await form.handleSubmit();
    expect(form.isSubmitted()).toBe(true);
    form.destroy();
  });
});

describe("createForm field accessors", () => {
  it("meta() reflects field interaction state", () => {
    const form = createForm<{ email: string }>({
      defaultValues: { email: "" },
    });
    const email = form.field<string>("email");

    expect(email.meta().isTouched).toBe(false);
    email.handleBlur();
    expect(email.meta().isTouched).toBe(true);
    form.destroy();
  });

  it("setValue updates the value (without going through handleChange)", () => {
    const form = createForm<{ count: number }>({
      defaultValues: { count: 0 },
    });
    const count = form.field<number>("count");

    count.setValue(5);
    expect(count.value()).toBe(5);
    expect(form.values().count).toBe(5);

    // Functional updater form.
    count.setValue((previous) => previous + 1);
    expect(count.value()).toBe(6);
    form.destroy();
  });

  it("handleBlur marks the field as blurred/touched", () => {
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
    });
    const name = form.field<string>("name");

    expect(name.meta().isBlurred).toBe(false);
    name.handleBlur();
    expect(name.meta().isBlurred).toBe(true);
    form.destroy();
  });
});
