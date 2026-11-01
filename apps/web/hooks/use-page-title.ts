"use client";

import * as React from "react";

import { BRAND } from "@/components/brand/constants";

/**
 * Sets the tab title to `<name> | Luraba` once a record's name is known on the client. Record
 * names need the user's session and active household (kept in the browser), so a server
 * `generateMetadata` can only give the generic fallback ("Account"); this takes over after load.
 */
export function usePageTitle(name: string | null | undefined) {
  React.useEffect(() => {
    if (!name) return;
    document.title = `${name} | ${BRAND.name}`;
  }, [name]);
}
