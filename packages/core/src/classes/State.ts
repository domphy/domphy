import { Notifier } from "./Notifier.js";
import { Handler } from "../types.js"

export type ValueListener<T> = ((_value: T) => void) & Handler
export type ValueOrState<T> = T | State<T>

export class State<T> {
  readonly _isState = true;
  private _value: T;
  readonly initialValue: T;
  private _notifier: Notifier | null = new Notifier();

  constructor(initialValue: T, readonly name: string = typeof initialValue) {
    this.initialValue = initialValue;
    this._value = initialValue;
  }

  get(listener?: ValueListener<T>): T {
    if (listener) this.addListener(listener);
    return this._value;
  }

  set(newValue: T): void {
    if (!this._notifier) return;
    this._value = newValue;
    this._notifier.notify(this.name, newValue);
  }

  reset(): void {
    this.set(this.initialValue);
  }

  addListener(listener: ValueListener<T>): () => void {
    if (!this._notifier) return () => { };
    return this._notifier.addListener(this.name, listener);
  }

  removeListener(listener: ValueListener<T>): void {
    if (!this._notifier) return;
    this._notifier.removeListener(this.name, listener);
  }

  _dispose(): void {
    if (this._notifier) {
      this._notifier._dispose();
      this._notifier = null;
    }
  }
}
