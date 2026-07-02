// Shared page-scroll lock for modal-like patches (dialog, drawer). A
// module-level counter (not a plain boolean) is required because two
// overlays can be open at once (e.g. a dialog opened from within a drawer);
// without a counter, closing the inner one would clear `overflow` while the
// outer one is still open.
let lockCount = 0;

function lockScroll(): void {
  lockCount++;
  if (lockCount === 1) document.body.style.overflow = "hidden";
}

function unlockScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = "";
}

// Test-only: reset the module-level counter so a test that unmounts its tree
// via `document.body.innerHTML = ""` (skipping the Remove hook / unlockScroll
// call) doesn't leak a locked count into the next test.
function _resetScrollLock(): void {
  lockCount = 0;
}

export { lockScroll, unlockScroll, _resetScrollLock };
