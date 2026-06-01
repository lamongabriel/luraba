import type { HouseholdContext } from '@/config/permissions';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { formatISODateTime } from '@/shared/lib/date';
import { buildBrandfetchLogoUrl, normalizeBrandDomain } from '@/modules/integrations/brandfetch/brandfetch.utils';
import { getBrandfetchClientId } from '@/modules/integrations/brandfetch/brandfetch.service';
import { merchantsRepository } from './merchants.repository';
import type {
  Merchant,
  MerchantRecord,
  CreateMerchantRequestBody,
  CreateMerchantResponse,
  ListMerchantsResponse,
  UpdateMerchantRequestBody,
} from './merchants.types';

function mapMerchantRecord(merchant: MerchantRecord): Merchant {
  return {
    id: merchant.id,
    name: merchant.name,
    domain: merchant.domain ?? null,
    logoUrl: merchant.logoUrl ?? null,
    createdAt: formatISODateTime(merchant.createdAt),
    updatedAt: formatISODateTime(merchant.updatedAt),
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

export async function updateMerchant(
  context: HouseholdContext,
  merchantId: string,
  body: UpdateMerchantRequestBody,
): Promise<Merchant> {
  const merchant = await merchantsRepository.get(merchantId, context);
  if (!merchant) {
    throw new NotFoundError('Merchant');
  }

  if (body.name && body.name !== merchant.name) {
    const existing = await merchantsRepository.findByName(context, body.name);
    if (existing && existing.id !== merchantId) {
      throw new ConflictError('A merchant with this name already exists');
    }
  }

  const normalizedDomain =
    body.domain === null
      ? null
      : body.domain
        ? normalizeBrandDomain(body.domain)
        : undefined;
  const brandfetchClientId = normalizedDomain ? await getBrandfetchClientId(context).catch(() => undefined) : undefined;
  const logoUrl = normalizedDomain && brandfetchClientId
    ? buildBrandfetchLogoUrl(normalizedDomain, brandfetchClientId)
    : normalizedDomain === undefined
      ? undefined
      : null;

  const updated = await merchantsRepository.update(merchantId, context, {
    name: body.name,
    domain: normalizedDomain,
    logoUrl,
  });

  if (!updated) {
    throw new NotFoundError('Merchant');
  }

  return mapMerchantRecord(updated);
}

export async function deleteMerchant(context: HouseholdContext, merchantId: string): Promise<void> {
  const deleted = await merchantsRepository.delete(merchantId, context);
  if (!deleted) {
    throw new NotFoundError('Merchant');
  }
}
