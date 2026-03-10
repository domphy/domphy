import { FieldState, FieldValidator } from "./FieldState.js";

export class FormState {
  fields = new Map<string, FieldState>();

  setField(path: string, initValue?: unknown, validator?: FieldValidator): FieldState {
    let field = this.fields.get(path);

    if (!field) {
      field = new FieldState(initValue, validator);
      this.fields.set(path, field);
    } else {
      field.configure(initValue, validator);
    }

    return field;
  }

  getField(path: string): FieldState {
    return this.setField(path);
  }

  removeField(path: string): void {
    this.fields.get(path)?._dispose();
    this.fields.delete(path);
  }

  get valid(): boolean {
    for (const f of this.fields.values()) {
      if (f._pending || f._messages.error) return false;
    }
    return true;
  }

  reset(): void {
    for (const f of this.fields.values()) f.reset();
  }

  snapshot(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [path, f] of this.fields) setByPath(result, path, f._value);
    return result;
  }

  _dispose(): void {
    for (const f of this.fields.values()) f._dispose();
    this.fields.clear();
  }
}

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split(".");
  let cur: any = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (cur[key] == null) cur[key] = isNaN(Number(segments[i + 1])) ? {} : [];
    cur = cur[key];
  }
  cur[segments[segments.length - 1]] = value;
}
