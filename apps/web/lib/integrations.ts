import type { IntegrationProvider, IntegrationStatus } from "@luraba/contracts";

export const INTEGRATION_PROVIDER_INFO: Record<
  IntegrationProvider,
  { label: string; summary: string; help: string }
> = {
  brandfetch: {
    label: "Brandfetch",
    summary:
      "Shows real logos for your merchants, like the Whole Foods or Amazon logo next to a purchase.",
    help: "Create a free account at brandfetch.com, open the Logo API settings and copy your client ID. Luraba checks it with Brandfetch when you save.",
  },
};

export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  connected: "Connected",
  not_configured: "Not configured",
};

export const INTEGRATION_STATUS_BADGE_CLASSES: Record<IntegrationStatus, string> = {
  connected: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  not_configured: "text-muted-foreground",
};
