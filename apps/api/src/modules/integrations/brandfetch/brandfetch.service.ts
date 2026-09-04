import type { Integration, UpdateBrandfetchIntegrationInput } from '@luraba/contracts/integrations';
import type { HouseholdContext } from '@/config/permissions';
import { now } from '@/shared/lib/date';
import { decryptIntegrationSecret, encryptIntegrationSecret } from '../integration-crypto';
import { buildIntegrationSummary } from '../integrations.utils';
import { brandfetchRepository } from './brandfetch.repository';
import { validateBrandfetchClientId } from './brandfetch.utils';

export async function getBrandfetchIntegrationSummary(
  context: HouseholdContext,
): Promise<Integration> {
  const record = await brandfetchRepository.findByHousehold(context);
  return buildIntegrationSummary('brandfetch', record);
}

export async function updateBrandfetchIntegration(
  context: HouseholdContext,
  body: UpdateBrandfetchIntegrationInput,
): Promise<Integration> {
  const normalizedClientId = body.clientId.trim();
  await validateBrandfetchClientId(normalizedClientId);

  const record = await brandfetchRepository.upsert(context, {
    encryptedClientId: encryptIntegrationSecret(normalizedClientId),
    lastCheckedAt: now(),
  });

  return buildIntegrationSummary('brandfetch', record);
}

export async function deleteBrandfetchIntegration(context: HouseholdContext): Promise<Integration> {
  await brandfetchRepository.deleteByHousehold(context);
  return buildIntegrationSummary('brandfetch');
}

export async function getBrandfetchClientId(
  context: HouseholdContext,
): Promise<string | undefined> {
  const record = await brandfetchRepository.findByHousehold(context);
  if (!record) {
    return undefined;
  }

  return decryptIntegrationSecret(record.encryptedClientId);
}
