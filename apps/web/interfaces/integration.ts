export type IntegrationProvider = "brandfetch"
export type IntegrationStatus = "not_configured" | "connected"

export interface Integration {
  provider: IntegrationProvider
  configured: boolean
  status: IntegrationStatus
  lastCheckedAt: string | null
}
