import * as React from "react";

/**
 * The one breakpoint between the mobile and the desktop layout, in px. It is the same value as Tailwind's `md`
 * (768px), so CSS (`md:` classes) and this hook always agree. Prefer CSS to show and hide things; use the hook only
 * where the structure changes (drawer versus dropdown, sheet versus sidebar).
 */
export const MOBILE_BREAKPOINT = 768;

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

// The server and the first client render are always "desktop": the CSS (`md:` classes) already hides the right
// parts below 768px, and the hook flips once after hydration, so there is no mismatch.
function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
