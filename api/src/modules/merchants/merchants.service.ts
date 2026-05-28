import type { HouseholdContext } from '@/config/permissions';
import { ConflictError } from '@/shared/errors';
import { buildBrandfetchLogoUrl, normalizeBrandDomain } from '@/modules/integrations/brandfetch/brandfetch.utils';
import { getBrandfetchClientId } from '@/modules/integrations/brandfetch/brandfetch.service';
import { merchantsRepository } from './merchants.repository';
import type {
  Merchant,
  MerchantRecord,
  CreateMerchantRequestBody,
  CreateMerchantResponse,
  ListMerchantsResponse,
} from './merchants.types';

function mapMerchantRecord(merchant: MerchantRecord): Merchant {
  return {
    id: merchant.id,
    name: merchant.name,
    domain: merchant.domain ?? null,
    logoUrl: merchant.logoUrl ?? null,
    createdAt: merchant.createdAt.toISOString(),
    updatedAt: merchant.updatedAt.toISOString(),
  };
}

export async function createMerchant(
  context: HouseholdContext,
  body: CreateMerchantRequestBody,
): Promise<CreateMerchantResponse> {
  const existing = await merchantsRepository.findByName(context, body.name);

  if (existing) {
    throw new ConflictError('A merchant with this name already exists');
  }

  const normalizedDomain = body.domain ? normalizeBrandDomain(body.domain) : undefined;
  const brandfetchClientId = normalizedDomain ? await getBrandfetchClientId(context).catch(() => undefined) : undefined;
  const logoUrl = normalizedDomain && brandfetchClientId
    ? buildBrandfetchLogoUrl(normalizedDomain, brandfetchClientId)
    : undefined;

  const merchant = await merchantsRepository.create(context, {
    name: body.name,
    domain: normalizedDomain,
    logoUrl,
  });
  return mapMerchantRecord(merchant);
}

export async function listMerchants(context: HouseholdContext): Promise<ListMerchantsResponse> {
  const merchants = await merchantsRepository.list(context);
  return merchants.map(mapMerchantRecord);
}
