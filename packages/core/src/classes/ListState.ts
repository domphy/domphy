import {  Notifier } from "./Notifier.js"
import { Handler } from "../types.js"
import { State } from "./State.js"
import { toState } from "../utils.js"

export type ListEntry<T> = { key: number, state: State<T> }

export class ListState<T = unknown> {
  _entries: ListEntry<T>[]
  _notifier: Notifier
  _nextKey: number

  constructor(items: (T | State<T>)[] = []) {
    this._notifier = new Notifier()
    this._nextKey = 0
    this._entries = items.map(item => this._createEntry(item))
  }

  entries(Handler?: Handler): ListEntry<T>[] {
    if (Handler) this._notifier.addListener("change", Handler)
    return this._entries
  }

  states(Handler?: Handler): State<T>[] {
    if (Handler) this._notifier.addListener("change", Handler)
    return this._entries.map(e => e.state)
  }

  keys(Handler?: Handler): number[] {
    if (Handler) this._notifier.addListener("change", Handler)
    return this._entries.map(e => e.key)
  }

  _createEntry(item: T | State<T>): ListEntry<T> {
    const state = item instanceof State ? item : toState(item)
    return { key: this._nextKey++, state }
  }

  _findEntry(state: State<T>): ListEntry<T> | undefined {
    return this._entries.find(e => e.state === state)
  }

  insert(item: T, silent = false): ListEntry<T> {
    const entry = this._createEntry(item)
    this._entries.push(entry)
    if (!silent) this._notifier.notify("change")
    return entry
  }

  remove(state: State<T>, silent = false): void {
    const entry = this._findEntry(state)
    if (!entry) return
    const index = this._entries.indexOf(entry)
    this._entries.splice(index, 1)
    if (!silent) this._notifier.notify("change")
  }

  move(from: number, to: number, silent = false): void {
    if (from < 0 || to < 0 || from >= this._entries.length || to >= this._entries.length || from === to) return
    const [entry] = this._entries.splice(from, 1)
    this._entries.splice(to, 0, entry)
    if (!silent) this._notifier.notify("change")
  }

  swap(aIndex: number, bIndex: number, silent = false): void {
    if (aIndex < 0 || bIndex < 0 || aIndex >= this._entries.length || bIndex >= this._entries.length || aIndex === bIndex) return
    const a = this._entries[aIndex]
    this._entries[aIndex] = this._entries[bIndex]
    this._entries[bIndex] = a
    if (!silent) this._notifier.notify("change")
  }

  clear(silent = false): void {
    if (this._entries.length === 0) return
    this._entries = []
    if (!silent) this._notifier.notify("change")
  }

  reset(silent = false): void {
    this._entries.sort((a, b) => a.key - b.key)
    if (!silent) this._notifier.notify("change")
  }

  onChange(fn: () => void): () => void {
    return this._notifier.addListener("change", fn)
  }

  _dispose(): void {
    this._entries.forEach(e => e.state._dispose())
    this._entries = []
    this._notifier._dispose()
  }
}
