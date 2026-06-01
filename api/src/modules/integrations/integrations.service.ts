import type { HouseholdContext } from '@/config/permissions';
import { getBrandfetchIntegrationSummary } from './brandfetch/brandfetch.service';
import type { ListIntegrationsResponse } from './integrations.types';

export async function listIntegrations(
  context: HouseholdContext,
): Promise<ListIntegrationsResponse> {
  return [await getBrandfetchIntegrationSummary(context)];
}
