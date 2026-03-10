import { Notifier, Handler } from "@domphy/core";

export type FieldStatus = "error" | "warning" | "success" | undefined;

export type FieldMessages = {
  error?: string;
  warning?: string;
  success?: string;
};

export type FieldValidator = (value: unknown) => FieldMessages | null | Promise<FieldMessages | null>;

function isPromiseLike(
  value: FieldMessages | null | Promise<FieldMessages | null>
): value is Promise<FieldMessages | null> {
  return !!value && typeof (value as Promise<FieldMessages | null>).then === "function";
}

export class FieldState {
  _notifier = new Notifier();
  _value: unknown;
  _initValue: unknown;
  _messages: FieldMessages = {};
  _touched = false;
  _validator: FieldValidator | undefined;
  _pending = false;
  _validationToken = 0;

  constructor(initValue: unknown, validator?: FieldValidator) {
    this._value = initValue;
    this._initValue = initValue;
    this._validator = validator;
    if (validator) this.validate();
  }

  value(listener?: Handler): unknown {
    if (listener) this._notifier.addListener("value", listener);
    return this._value;
  }

  setValue(val: unknown): void {
    this._value = val;
    this._notifier.notify("value", val);
    this._notifier.notify("dirty", val !== this._initValue);
    this.validate();
  }

  dirty(listener?: Handler): boolean {
    if (listener) this._notifier.addListener("dirty", listener);
    return this._value !== this._initValue;
  }

  touched(listener?: Handler): boolean {
    if (listener) this._notifier.addListener("touched", listener);
    return this._touched;
  }

  setTouched(): void {
    if (!this._touched) {
      this._touched = true;
      this._notifier.notify("touched", true);
    }
  }

  configure(initValue?: unknown, validator?: FieldValidator): void {
    let shouldValidate = false;

    if (
      initValue !== undefined &&
      this._value === undefined &&
      this._initValue === undefined
    ) {
      this._value = initValue;
      this._initValue = initValue;
      this._notifier.notify("value", initValue);
      this._notifier.notify("dirty", false);
      shouldValidate = true;
    }

    if (validator !== undefined && validator !== this._validator) {
      this._validator = validator;
      shouldValidate = true;
    }

    if (shouldValidate) this.validate();
  }

  message(type: keyof FieldMessages, listener?: Handler): string | undefined {
    if (listener) this._notifier.addListener(type, listener);
    return this._messages[type];
  }

  status(listener?: Handler): FieldStatus {
    if (listener) this._notifier.addListener("status", listener);
    return resolveStatus(this._messages);
  }

  setMessages(next: FieldMessages): void {
    const prev = this._messages;
    this._messages = next;
    for (const type of ["error", "warning", "success"] as const) {
      if (prev[type] !== next[type]) this._notifier.notify(type, next[type]);
    }
    if (resolveStatus(prev) !== resolveStatus(next)) {
      this._notifier.notify("status", resolveStatus(next));
    }
  }

  reset(): void {
    this._value = this._initValue;
    this._touched = false;
    this._notifier.notify("value", this._value);
    this._notifier.notify("dirty", false);
    this._notifier.notify("touched", false);
    this.setMessages({});
    this.validate();
  }

  validate(): void {
    const token = ++this._validationToken;

    if (!this._validator) {
      this._pending = false;
      this.setMessages({});
      return;
    }

    try {
      const result = this._validator(this._value);

      if (isPromiseLike(result)) {
        this._pending = true;
        Promise.resolve(result)
          .then((msg) => {
            if (token !== this._validationToken) return;
            this._pending = false;
            this.setMessages(msg ?? {});
          })
          .catch((error) => {
            if (token !== this._validationToken) return;
            this._pending = false;
            console.error(error);
          });
      } else {
        this._pending = false;
        this.setMessages(result ?? {});
      }
    } catch (error) {
      if (token === this._validationToken) {
        this._pending = false;
      }
      console.error(error);
    }
  }

  _dispose(): void {
    this._validationToken += 1;
    this._pending = false;
    this._notifier._dispose();
  }
}

function resolveStatus(m: FieldMessages): FieldStatus {
  if (m.error) return "error";
  if (m.warning) return "warning";
  if (m.success) return "success";
  return undefined;
}
