import type {
  CreateMerchantInput,
  Merchant,
  UpdateMerchantInput,
} from "@luraba/contracts/merchants";
import type { HouseholdContext } from "@/config/permissions";
import { getBrandfetchClientId } from "@/modules/integrations/brandfetch/brandfetch.service";
import {
  buildBrandfetchLogoUrl,
  normalizeBrandDomain,
} from "@/modules/integrations/brandfetch/brandfetch.utils";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { formatISODateTime } from "@/shared/lib/date";
import { createListMeta, type ListResult } from "@/shared/list";
import type { ListMerchantsQuery } from "./merchants.query";
import { merchantsRepository } from "./merchants.repository";
import type { MerchantRecord } from "./merchants.types";

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
  body: CreateMerchantInput,
): Promise<Merchant> {
  const existing = await merchantsRepository.findByName(context, body.name);

  if (existing) {
    throw new ConflictError("A merchant with this name already exists");
  }

  const normalizedDomain = body.domain ? normalizeBrandDomain(body.domain) : undefined;
  const brandfetchClientId = normalizedDomain
    ? await getBrandfetchClientId(context).catch(() => undefined)
    : undefined;
  const logoUrl =
    normalizedDomain && brandfetchClientId
      ? buildBrandfetchLogoUrl(normalizedDomain, brandfetchClientId)
      : undefined;

  const merchant = await merchantsRepository.create(context, {
    name: body.name,
    domain: normalizedDomain,
    logoUrl,
  });
  return mapMerchantRecord(merchant);
}

export async function listMerchants(
  context: HouseholdContext,
  query: ListMerchantsQuery,
): Promise<ListResult<Merchant>> {
  const page = await merchantsRepository.listPage(context, query);

  return {
    data: page.rows.map(mapMerchantRecord),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function getMerchant(
  context: HouseholdContext,
  merchantId: string,
): Promise<Merchant> {
  const merchant = await merchantsRepository.get(merchantId, context);
  if (!merchant) {
    throw new NotFoundError("Merchant");
  }

  return mapMerchantRecord(merchant);
}

export async function updateMerchant(
  context: HouseholdContext,
  merchantId: string,
  body: UpdateMerchantInput,
): Promise<Merchant> {
  const merchant = await merchantsRepository.get(merchantId, context);
  if (!merchant) {
    throw new NotFoundError("Merchant");
  }

  if (body.name && body.name !== merchant.name) {
    const existing = await merchantsRepository.findByName(context, body.name);
    if (existing && existing.id !== merchantId) {
      throw new ConflictError("A merchant with this name already exists");
    }
  }

  const normalizedDomain =
    body.domain === null ? null : body.domain ? normalizeBrandDomain(body.domain) : undefined;
  const brandfetchClientId = normalizedDomain
    ? await getBrandfetchClientId(context).catch(() => undefined)
    : undefined;
  const logoUrl =
    normalizedDomain && brandfetchClientId
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
    throw new NotFoundError("Merchant");
  }

  return mapMerchantRecord(updated);
}

export async function deleteMerchant(context: HouseholdContext, merchantId: string): Promise<void> {
  const deleted = await merchantsRepository.delete(merchantId, context);
  if (!deleted) {
    throw new NotFoundError("Merchant");
  }
}
