// The runner app is a single-page app with no real routes — Profile,
// Messages, and the tracking screen are all just conditionally-rendered
// components, so none of them exist in browser history. That meant the
// Android hardware back button had nothing of ours to pop and fell straight
// through to whatever page opened the runner app (e.g. the marketing
// homepage's "Already Registered? Login" link), losing the runner's place
// entirely instead of closing the open screen.
//
// This gives every open overlay a real history entry: pushBackHandler pushes
// one and registers a close callback; a single popstate listener pops the
// topmost callback and calls it. When the stack is empty (no overlay open),
// back is trapped by re-pushing immediately, so the runner app itself is
// never exited via hardware back — only via its own in-app navigation.

type CloseHandler = () => void;

const stack: CloseHandler[] = [];
let installed = false;
let ignoreNextPopstate = false;

function handlePopState() {
  if (ignoreNextPopstate) {
    ignoreNextPopstate = false;
    return;
  }
  const handler = stack.pop();
  if (handler) {
    handler();
  } else {
    window.history.pushState({ __runnerBase: true }, '');
  }
}

function ensureInstalled() {
  if (installed) return;
  installed = true;
  window.addEventListener('popstate', handlePopState);
  window.history.pushState({ __runnerBase: true }, '');
}

// Call once, unconditionally, as soon as the app knows the runner is past
// the login screen — establishes the base trap even if no overlay is ever
// opened.
export function installBackTrap() {
  ensureInstalled();
}

// Call when an overlay/sub-screen opens. Returns a function to call when
// closing it programmatically (e.g. tapping an in-app back/X button) — do
// NOT call this if the close was already triggered by the hardware back
// button itself (the returned function is a no-op in that case, so calling
// it from a cleanup effect that fires either way is safe).
export function pushBackHandler(onClose: CloseHandler): () => void {
  ensureInstalled();
  window.history.pushState({ __runnerOverlay: true }, '');
  stack.push(onClose);

  let consumed = false;
  return () => {
    if (consumed) return;
    consumed = true;
    const idx = stack.lastIndexOf(onClose);
    if (idx !== -1) {
      // Still in the stack — this is a programmatic close, so remove it and
      // consume the matching history entry ourselves rather than leaving a
      // stale one behind.
      stack.splice(idx, 1);
      ignoreNextPopstate = true;
      window.history.back();
    }
    // If not found, hardware back already popped it (and its history
    // entry) for us — nothing left to do.
  };
}
