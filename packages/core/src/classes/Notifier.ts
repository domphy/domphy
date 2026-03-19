import { Handler } from "../types.js"

type ChainEntry = [notifier: Notifier, event: string]

// Shared across all instances to track the flush chain for circular detection.
let _chain: ChainEntry[] = []

export class Notifier {
  private _listeners: Record<string, Set<Handler>> | null = {}
  private _pending: Map<string, { args: unknown[], chain: ChainEntry[] }> = new Map()
  private _scheduled = false

  _dispose(): void {
    if (this._listeners) {
      for (const event in this._listeners) {
        this._listeners[event].clear()
      }
    }
    this._listeners = null
  }

  addListener(event: string, listener: Handler): () => void {
    if (!this._listeners) return () => {}

    if (typeof event !== "string" || typeof listener !== "function") {
      throw new Error("Event name must be a string, listener must be a function")
    }

    if (!this._listeners[event]) {
      this._listeners[event] = new Set()
    }

    const release = () => this.removeListener(event, listener)

    if (this._listeners[event].has(listener)) return release

    this._listeners[event].add(listener)
    if (typeof listener.onSubscribe === "function") {
      listener.onSubscribe(release)
    }

    return release
  }

  removeListener(event: string, listener: Handler): void {
    if (!this._listeners) return

    const listeners = this._listeners[event]
    if (listeners && listeners.has(listener)) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        delete this._listeners[event]
      }
    }
  }

  notify(event: string, ...args: unknown[]): void {
    if (!this._listeners) return
    if (!this._listeners[event]) return

    if (this._isCircular(event)) return

    this._pending.set(event, { args, chain: [..._chain] })

    if (!this._scheduled) {
      this._scheduled = true
      queueMicrotask(() => this._flushAll())
    }
  }

  private _isCircular(event: string): boolean {
    const idx = _chain.findIndex(([n, e]) => n === this && e === event)
    if (idx === -1) return false

    const names = [..._chain.slice(idx).map(([, e]) => e), event]
    console.error(`[Domphy] Circular dependency detected:\n  ${names.join(" → ")}`)
    return true
  }

  private _flushAll(): void {
    this._scheduled = false
    const pending = this._pending
    this._pending = new Map()

    for (const [event, { args, chain }] of pending) {
      _chain = chain
      this._flush(event, args)
    }
    _chain = []
  }

  private _flush(event: string, args: unknown[]): void {
    if (!this._listeners) return
    const listeners = this._listeners[event]
    if (!listeners) return

    _chain.push([this, event])

    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue
      try {
        listener(...args)
      } catch (e) {
        console.error(e)
      }
    }

    _chain.pop()
  }
}
