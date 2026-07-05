import type { State } from "@domphy/core";

/** Locks page scroll while a playground/preview widget is in fullscreen mode. */
export function lockScrollOnFullscreen(isFull: State<boolean>): void {
  isFull.addListener((value) => {
    const root = document.documentElement;
    const body = document.body;
    if (value) {
      root.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.height = "100%";
    } else {
      root.style.overflow = "";
      body.style.overflow = "";
      body.style.height = "";
    }
  });
}
