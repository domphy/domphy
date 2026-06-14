// Domphy adapter for @domphy/form (not part of the byte-identical form-core
// port). Binds a TanStack FormApi/FieldApi to Domphy reactivity so form and
// field state can be read in elements with a listener.
export { createForm } from "./createForm.js"
export type {
  CreateFormOptions,
  FieldHandle,
  FormHandle,
} from "./createForm.js"
