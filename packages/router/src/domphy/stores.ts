// Port of @tanstack/react-router's routerStores.ts without the React layer:
// @tanstack/store atoms (framework-agnostic) replace @tanstack/react-store.
import { batch, createAtom } from '@tanstack/store'
import { isServer } from '@domphy/router/isServer'
import {
  createNonReactiveMutableStore,
  createNonReactiveReadonlyStore,
} from '../stores'
import type { GetStoreConfig } from '../stores'

// Note: upstream's react adapter augments RouterReadableStore with the
// reactive Readable interface. That augmentation would poison the core
// files compiled inside this same package (non-reactive store factories
// would no longer satisfy the interface), so the transitioner casts to
// Readable locally instead.

export const getStoreFactory: GetStoreConfig = (opts) => {
  if (isServer ?? opts.isServer) {
    return {
      createMutableStore: createNonReactiveMutableStore,
      createReadonlyStore: createNonReactiveReadonlyStore,
      batch: (fn) => fn(),
    }
  }

  return {
    createMutableStore: createAtom,
    createReadonlyStore: createAtom,
    batch,
  }
}
