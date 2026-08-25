import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type {
  Integration,
  IntegrationProvider,
  IntegrationStatus,
} from "@/interfaces/integration"

export type IntegrationSortField =
  | "configured"
  | "lastCheckedAt"
  | "provider"
  | "status"

export interface ListIntegrationsHttpQuery
  extends BaseListHttpQuery<IntegrationSortField> {
  providers?: IntegrationProvider[]
  statuses?: IntegrationStatus[]
  configured?: boolean
  lastCheckedAtFrom?: string
  lastCheckedAtTo?: string
}

export type ListIntegrationsHttpResponse = ListResponse<Integration>
export interface UpdateBrandfetchIntegrationHttpBody {
  clientId: string
}
export type UpdateBrandfetchIntegrationHttpResponse = Integration
export type DeleteBrandfetchIntegrationHttpResponse = Integration
