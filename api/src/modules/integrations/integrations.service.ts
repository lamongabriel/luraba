import type { HouseholdContext } from '@/config/permissions';
import type { ListIntegrationsResponse } from './integrations.types';
import { getBrandfetchIntegrationSummary } from './brandfetch/brandfetch.service';

export async function listIntegrations(context: HouseholdContext): Promise<ListIntegrationsResponse> {
  return [await getBrandfetchIntegrationSummary(context)];
}
