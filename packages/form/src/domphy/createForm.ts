import { type Listener, State } from "@domphy/core"
import { FieldApi, FormApi } from "../index.js"
import type { ValidationCause, ValidationError } from "../types.js"

// FieldApi carries 23 generics; erase them at the adapter boundary.
type AnyFieldApi = InstanceType<typeof FieldApi>
type FieldMeta = ReturnType<AnyFieldApi["getMeta"]>

// form-core's FormApi/FieldApi carry 10+ non-defaulted generics. The adapter
// pins only the form-data shape and erases the validator/meta generics — the
// strongly-typed surface is the accessors below, not the raw instances.
// biome-ignore lint: src is byte-identical-port territory, excluded from biome
type Updater<T> = T | ((previous: T) => T)

export interface CreateFormOptions<TFormData> {
  defaultValues?: TFormData
  onSubmit?: (props: {
    value: TFormData
    formApi: FormApi<TFormData, any, any, any, any, any, any, any, any, any, any>
  }) => unknown | Promise<unknown>
  [option: string]: unknown
}

export interface FieldHandle<TData = unknown> {
  /** The underlying form-core `FieldApi`. */
  api: AnyFieldApi
  value(listener?: Listener): TData
  errors(listener?: Listener): unknown[]
  meta(listener?: Listener): FieldMeta
  handleChange(updater: Updater<TData>): void
  handleBlur(): void
  setValue(updater: Updater<TData>): void
  /** Manually trigger validation. Cause defaults to "change". */
  validate(cause?: ValidationCause): ValidationError[] | Promise<ValidationError[]>
  // Array field helpers (only meaningful when TData extends any[])
  pushValue(value: TData extends any[] ? TData[number] : never): void
  insertValue(index: number, value: TData extends any[] ? TData[number] : never): void
  replaceValue(index: number, value: TData extends any[] ? TData[number] : never): void
  removeValue(index: number): void
  swapValues(a: number, b: number): void
  moveValue(a: number, b: number): void
  clearValues(): void
}

export interface FormHandle<TFormData> {
  /** The underlying form-core `FormApi`. */
  form: FormApi<TFormData, any, any, any, any, any, any, any, any, any, any>
  /** Reactive full form state (values, validity, submission flags). */
  state(listener?: Listener): FormApi<
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
    any
  >["store"]["state"]
  values(listener?: Listener): TFormData
  canSubmit(listener?: Listener): boolean
  isSubmitting(listener?: Listener): boolean
  isValid(listener?: Listener): boolean
  isSubmitted(listener?: Listener): boolean
  isDirty(listener?: Listener): boolean
  isPristine(listener?: Listener): boolean
  isTouched(listener?: Listener): boolean
  isBlurred(listener?: Listener): boolean
  /** Raw reactive change counter. */
  version(listener?: Listener): number
  /** Creates (and mounts) a reactive handle for one field. */
  field<TData = unknown>(
    name: string,
    options?: Record<string, unknown>,
  ): FieldHandle<TData>
  handleSubmit(): Promise<void>
  reset(values?: TFormData): void
  /** Read the current value of a field imperatively (no listener). */
  getFieldValue(field: string): unknown
  /** Programmatically set a field value (triggers onChange validation by default). */
  setFieldValue(field: string, updater: Updater<unknown>): void
  /** Manually trigger validation for a single field. Cause defaults to "change". */
  validateField(
    field: string,
    cause?: ValidationCause,
  ): ValidationError[] | Promise<ValidationError[]>
  destroy(): void
}

export function createForm<TFormData>(
  options: CreateFormOptions<TFormData> = {},
): FormHandle<TFormData> {
  const version = new State(0, "formVersion")
  const form = new FormApi(options as any) as FormApi<
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
    any
  >
  const formCleanup = form.mount()
  const subscription = form.store.subscribe(() =>
    version.set(version.get() + 1),
  )
  const fieldCleanups: Array<() => void> = []

  const state = (listener?: Listener) => {
    version.get(listener)
    return form.store.state
  }

  return {
    form,
    state,
    values: (listener) => state(listener).values as TFormData,
    canSubmit: (listener) => state(listener).canSubmit,
    isSubmitting: (listener) => state(listener).isSubmitting,
    isValid: (listener) => state(listener).isValid,
    isSubmitted: (listener) => state(listener).isSubmitted,
    isDirty: (listener) => state(listener).isDirty,
    isPristine: (listener) => state(listener).isPristine,
    isTouched: (listener) => state(listener).isTouched,
    isBlurred: (listener) => state(listener).isBlurred,
    version: (listener) => version.get(listener),
    field: <TData = unknown>(
      name: string,
      fieldOptions: Record<string, unknown> = {},
    ): FieldHandle<TData> => {
      const api = new FieldApi({ form, name, ...fieldOptions } as any) as AnyFieldApi
      fieldCleanups.push(api.mount())
      return {
        api,
        value: (listener) => {
          version.get(listener)
          return api.getValue() as TData
        },
        errors: (listener) => {
          version.get(listener)
          return api.getMeta().errors
        },
        meta: (listener) => {
          version.get(listener)
          return api.getMeta()
        },
        handleChange: (updater) => api.handleChange(updater),
        handleBlur: () => api.handleBlur(),
        setValue: (updater) => api.setValue(updater),
        validate: (cause = "change") => api.validate(cause),
        pushValue: (value) => api.pushValue(value as never),
        insertValue: (index, value) => api.insertValue(index, value as never),
        replaceValue: (index, value) => api.replaceValue(index, value as never),
        removeValue: (index) => api.removeValue(index),
        swapValues: (a, b) => api.swapValues(a, b),
        moveValue: (a, b) => api.moveValue(a, b),
        clearValues: () => api.clearValues(),
      }
    },
    handleSubmit: () => form.handleSubmit(),
    reset: (values) => form.reset(values),
    getFieldValue: (field) => form.getFieldValue(field as any),
    setFieldValue: (field, updater) => form.setFieldValue(field as any, updater as any),
    validateField: (field, cause = "change") => form.validateField(field as any, cause),
    destroy: () => {
      subscription.unsubscribe()
      for (const cleanup of fieldCleanups) cleanup()
      formCleanup()
      version._dispose()
    },
  }
}
