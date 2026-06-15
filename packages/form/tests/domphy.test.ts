import { describe, expect, it } from "vitest";
import { createForm } from "../src/domphy/index";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createForm", () => {
  it("exposes default values and updates fields", () => {
    const form = createForm<{ name: string }>({
      defaultValues: { name: "Ada" },
    });
    const name = form.field<string>("name");

    expect(form.values().name).toBe("Ada");
    expect(name.value()).toBe("Ada");

    name.handleChange("Grace");
    expect(name.value()).toBe("Grace");
    expect(form.values().name).toBe("Grace");
    form.destroy();
  });

  it("runs field validators and surfaces errors", () => {
    const form = createForm<{ email: string }>({
      defaultValues: { email: "" },
    });
    const email = form.field<string>("email", {
      validators: {
        onChange: ({ value }: { value: string }) =>
          value.includes("@") ? undefined : "Invalid email",
      },
    });

    email.handleChange("nope");
    expect(email.errors().length).toBeGreaterThan(0);

    email.handleChange("a@b.com");
    expect(email.errors().length).toBe(0);
    form.destroy();
  });

  it("submits with the current values", async () => {
    let submitted: { name: string } | null = null;
    const form = createForm<{ name: string }>({
      defaultValues: { name: "x" },
      onSubmit: ({ value }) => {
        submitted = value;
      },
    });
    form.field<string>("name").handleChange("y");
    await form.handleSubmit();
    expect(submitted).toEqual({ name: "y" });
    form.destroy();
  });

  it("notifies a reactive listener when a field changes", async () => {
    const form = createForm<{ q: string }>({ defaultValues: { q: "" } });
    const q = form.field<string>("q");
    let calls = 0;
    q.value(() => calls++);

    q.handleChange("hello");
    await flush();
    expect(calls).toBeGreaterThan(0);
    form.destroy();
  });

  it("resets to defaults", () => {
    const form = createForm<{ n: string }>({ defaultValues: { n: "a" } });
    const n = form.field<string>("n");
    n.handleChange("b");
    expect(n.value()).toBe("b");
    form.reset();
    expect(form.values().n).toBe("a");
    form.destroy();
  });
});
