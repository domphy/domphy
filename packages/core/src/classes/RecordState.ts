import { activeCollector } from "./Collector.js";
import { Notifier } from "./Notifier.js";

type Listener = (...args: any[]) => void;

export class RecordState<T extends Record<string, any> = Record<string, any>> {
  private _notifier = new Notifier();
  private _record: T;
  readonly initialRecord: T;

  constructor(record: T) {
    this.initialRecord = { ...record };
    this._record = { ...record };
  }

  get<K extends keyof T>(key: K, l?: Listener): T[K] {
    if (l) {
      this._notifier.addListener(key as string, l);
    } else {
      // Auto-tracking: with no explicit listener, subscribe the active
      // collector for THIS key so a running computed/effect re-runs only
      // when this specific key changes. With no collector active the read
      // is untracked — the original behavior is preserved exactly.
      const collector = activeCollector();
      if (collector)
        this._notifier.addListener(key as string, collector.handler);
    }
    return this._record[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this._record[key] = value;
    this._notifier.notify(key as string);
  }

  addListener<K extends keyof T>(key: K, fn: Listener): () => void {
    return this._notifier.addListener(key as string, fn);
  }

  removeListener<K extends keyof T>(key: K, fn: Listener): void {
    this._notifier.removeListener(key as string, fn);
  }

  reset<K extends keyof T>(key: K): void {
    this.set(key, this.initialRecord[key]);
  }

  _dispose(): void {
    this._notifier._dispose();
  }
}
