# UI primitives

shadcn primitives with Luraba's styling. Read this before touching an overlay.

## Overlays are bottom drawers on mobile

Below 768px (`useIsMobile`, `hooks/use-mobile.ts`) every overlay is a bottom drawer
(`bottom-sheet.tsx`: drag handle, max 90dvh, safe-area padding). Desktop is unchanged. The swap
happens in the shared wrappers, so features just use them:

`Dialog`, `Modal`/`ConfirmDialog`, `Sheet` (every `side`), `Popover`, `DropdownMenu`, `Select`,
`SidePanel`, and the sidebar's mobile menu. `Tooltip` and `HoverCard` never open on mobile.

- `MobileSheetContent` (`mobile-sheet.tsx`) is the drawer body shared by Dialog/Sheet/Modal: close
  button, locked while `isLoading`, scrolling body, sticky footer.
- `desktopOnly` on Popover, DropdownMenu and Select keeps the desktop behavior on mobile; use it
  only when a bottom drawer cannot work, and say why.
- `PortalContainerProvider` keeps nested popups inside the drawer.
- Do not import Radix or vaul overlays in features, and import raw `ui/sheet` only from
  `side-panel`; `test/conventions.test.ts` enforces it. Raw `ui/dialog` imports are an allowlist that
  can only shrink; new confirmations use `ConfirmDialog`.
- Unlike the Nexus reference, confirmations and the nav menu are bottom drawers here too.

Tests: `test/viewport.ts` (`setMobileViewport`) stubs `matchMedia` for mobile assertions.
