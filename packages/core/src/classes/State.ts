import { Notifier } from "./Notifier.js";
import { Handler } from "../types.js"

export type ValueListener<T> = ((_value: T) => void) & Handler
export type ValueOrState<T> = T | State<T>
export class State<T> {
  private _value: T;
  readonly initialValue: T;
  private _notifier: Notifier | null = new Notifier();

  constructor(initialValue: T) {
    this.initialValue = initialValue;
    this._value = initialValue;
  }

  get(listener?: ValueListener<T>): T {
    if (listener) this.onChange(listener);
    return this._value;
  }

  set(newValue: T): void {
    if (!this._notifier) return;
    this._value = newValue;
    this._notifier.notify("change", newValue);
  }

  reset(): void {
    this.set(this.initialValue);
  }

  onChange(listener: ValueListener<T>): () => void {
    if (!this._notifier) return () => { };
    return this._notifier.addListener("change", listener);
  }

  _dispose(): void {
    if (this._notifier) {
      this._notifier._dispose();
      this._notifier = null;
    }
  }
}