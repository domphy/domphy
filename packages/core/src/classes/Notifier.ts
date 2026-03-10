import { Handler } from "../types.js"

export class Notifier {
  private _listeners: Record<string, Set<Handler>> | null = {};

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
    const listeners = this._listeners[event];
    if (listeners) {
      for (const listener of [...listeners]) {
        try {
          listener(...args);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
}