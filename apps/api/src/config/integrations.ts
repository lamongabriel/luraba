export const INTEGRATION_PROVIDER_IDS = ["brandfetch"] as const;
export type IntegrationProviderId = (typeof INTEGRATION_PROVIDER_IDS)[number];

export const BRANDFETCH_CDN_URL = "https://cdn.brandfetch.io";
export const BRANDFETCH_VALIDATION_DOMAIN = "nike.com";

export const INTEGRATION_STATUS_VALUES = ["not_configured", "connected"] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUS_VALUES)[number];
