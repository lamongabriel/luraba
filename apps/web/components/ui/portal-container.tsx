"use client";

import * as React from "react";

const PortalContainerContext = React.createContext<HTMLElement | null>(null);

/**
 * Where floating content (combobox, select and popover lists) portals to. A modal such as the detail sidebar
 * provides its own content element: Radix modals make everything outside their subtree `pointer-events: none`,
 * block wheel scrolling there and trap focus, so a list portaled to `<body>` can be neither scrolled nor clicked.
 */
export const PortalContainerProvider = PortalContainerContext.Provider;

/**
 * The container to portal into: the explicit one if given, else the nearest modal's, else `undefined` (`<body>`).
 * Never `null`: Base UI reads an explicit `null` container as "do not portal", not as the default.
 */
export function usePortalContainer(explicit?: HTMLElement | null): HTMLElement | undefined {
  const inherited = React.useContext(PortalContainerContext);
  return explicit ?? inherited ?? undefined;
}
