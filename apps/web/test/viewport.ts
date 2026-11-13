/**
 * Pretends the window is a phone (`true`) or a desktop (`false`) for `useIsMobile` (the 768px breakpoint). Call it
 * before rendering; `setup.ts` starts every test as a desktop.
 */
export function setMobileViewport(mobile: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: mobile && query.includes("max-width"),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
