// Shared headless helpers for the form-core test suites. The core API needs
// no DOM: FormApi/FieldApi/FormGroupApi/FieldGroupApi run against plain
// objects. Validator/generic-heavy options are erased with `as any` — the
// strongly-typed surface is covered by tsc on src, not by these tests.

import { FieldApi, FormApi } from "../src/index";

export function createHeadlessForm<TFormData>(
  options: Record<string, unknown> = {},
) {
  const form = new FormApi({
    defaultValues: {} as TFormData,
    ...options,
  } as any);
  form.mount();
  return form as FormApi<
    TFormData,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >;
}

export function mountField(
  form: unknown,
  name: string,
  options: Record<string, unknown> = {},
) {
  const field = new FieldApi({ form, name, ...options } as any);
  field.mount();
  return field as InstanceType<typeof FieldApi>;
}

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
