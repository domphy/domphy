import { Handler } from "../types.js"

export class Notifier {
  private _listeners: Record<string, Set<Handler>> | null = {};
  private _notifying: Set<string> = new Set();
  private _pending: Map<string, unknown[]> = new Map();
  private _scheduled = false;

  _dispose(): void {
    if (this._listeners) {
      for (const event in this._listeners) {
        this._listeners[event].clear();
      }
    }

    this._listeners = null;
  }
  addListener(event: string, listener: Handler): () => void {
    if (!this._listeners) return () => { };

    if (typeof event !== "string" || typeof listener !== "function") {
      throw new Error("Event name must be a string, listener must be a function");
    }

    if (!this._listeners[event]) {
      this._listeners[event] = new Set();
    }

    const release = () => this.removeListener(event, listener);

    if (!this._listeners[event].has(listener)) {
      if (this._notifying.has(event)) {
        const debug = (listener as any).debug ?? "unknown";
        console.warn(`[Domphy] "${debug}" re-subscribed during notification. Parent and child are tracking the same state.`);
        this._listeners[event].add(listener);
        if (typeof listener.onSubscribe === "function") {
          listener.onSubscribe(release);
        }
        this.removeListener(event, listener);
        return release;
      }
      this._listeners[event].add(listener);
      if (typeof listener.onSubscribe === "function") {
        listener.onSubscribe(release);
      }
    }

    return release;
  }

  removeListener(event: string, listener: Handler): void {
    if (!this._listeners) return;

    const listeners = this._listeners[event];
    if (listeners && listeners.has(listener)) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        delete this._listeners[event];
      }
    }
  }

  notify(event: string, ...args: unknown[]): void {
    if (!this._listeners) return;
    if (!this._listeners[event]) return;
    this._pending.set(event, args);
    if (!this._scheduled) {
      this._scheduled = true;
      queueMicrotask(() => {
        this._scheduled = false;
        const pending = this._pending;
        this._pending = new Map();
        for (const [evt, evtArgs] of pending) {
          this._flush(evt, evtArgs);
        }
      });
    }
  }

  private _flush(event: string, args: unknown[]): void {
    if (!this._listeners) return;
    const listeners = this._listeners[event];
    if (listeners) {
      this._notifying.add(event);
      for (const listener of [...listeners]) {
        if (!listeners.has(listener)) continue;
        try {
          listener(...args);
        } catch (e) {
          console.error(e);
        }
      }
      this._notifying.delete(event);
    }
  }
}