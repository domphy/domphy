import { type Listener, State } from "@domphy/core"
import { FieldApi, FormApi } from "../index.js"

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
  /** Raw reactive change counter. */
  version(listener?: Listener): number
  /** Creates (and mounts) a reactive handle for one field. */
  field<TData = unknown>(
    name: string,
    options?: Record<string, unknown>,
  ): FieldHandle<TData>
  handleSubmit(): Promise<void>
  reset(values?: TFormData): void
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
      }
    },
    handleSubmit: () => form.handleSubmit(),
    reset: (values) => form.reset(values),
    destroy: () => {
      subscription.unsubscribe()
      for (const cleanup of fieldCleanups) cleanup()
      formCleanup()
      version._dispose()
    },
  }
}
