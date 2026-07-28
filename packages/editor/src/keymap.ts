/**
 * Keyboard shortcut descriptors, normalized the same way for bindings and for
 * events: `Shift-Meta-Ctrl-Alt-Key`. `Mod` is Cmd on macOS and Ctrl elsewhere.
 */

export function isMac(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Mac|iPod|iPhone|iPad/.test(
    navigator.platform || navigator.userAgent || "",
  );
}

/** "Mod-Alt-1" -> "Ctrl-Alt-1" (or "Meta-Alt-1" on macOS). */
export function normalizeShortcut(binding: string): string {
  const parts = binding.split(/-(?!$)/);
  let key = parts[parts.length - 1];
  if (key === "Space") {
    key = " ";
  }
  let alt = false;
  let ctrl = false;
  let shift = false;
  let meta = false;
  for (const modifier of parts.slice(0, -1)) {
    if (/^(cmd|meta|m)$/i.test(modifier)) {
      meta = true;
    } else if (/^a(lt)?$/i.test(modifier)) {
      alt = true;
    } else if (/^(c|ctrl|control)$/i.test(modifier)) {
      ctrl = true;
    } else if (/^s(hift)?$/i.test(modifier)) {
      shift = true;
    } else if (/^mod$/i.test(modifier)) {
      if (isMac()) {
        meta = true;
      } else {
        ctrl = true;
      }
    }
  }
  return withModifiers(key, { alt, ctrl, meta, shift });
}

interface ModifierState {
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

function withModifiers(key: string, state: ModifierState): string {
  let name = key;
  if (state.alt) {
    name = `Alt-${name}`;
  }
  if (state.ctrl) {
    name = `Ctrl-${name}`;
  }
  if (state.meta) {
    name = `Meta-${name}`;
  }
  if (state.shift) {
    name = `Shift-${name}`;
  }
  return name;
}

/** The physical key for a `KeyboardEvent.code`, so `Ctrl-Shift-S` finds `Mod-Shift-s`. */
function baseKey(code: string | undefined): string | null {
  if (!code) {
    return null;
  }
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) {
    return letter[1].toLowerCase();
  }
  const digit = /^Digit(\d)$/.exec(code);
  if (digit) {
    return digit[1];
  }
  return null;
}

/**
 * Candidate descriptors for a keyboard event, most specific first. A binding
 * matches when any candidate equals its normalized form.
 */
export function eventDescriptors(event: KeyboardEvent): string[] {
  const state: ModifierState = {
    alt: event.altKey,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    shift: event.shiftKey,
  };
  const key = event.key;
  const candidates = [withModifiers(key, state)];
  if (key.length === 1 && key !== " " && state.shift) {
    candidates.push(withModifiers(key, { ...state, shift: false }));
  }
  const base = baseKey(event.code);
  if (base && base !== key) {
    candidates.push(withModifiers(base, state));
    if (state.shift) {
      candidates.push(withModifiers(base, { ...state, shift: false }));
    }
  }
  return candidates;
}
