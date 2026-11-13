"use client";

import {
  type CombinedFx,
  type FxOverride,
  fxEndpoints,
  type SetFxOverrideBody,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export const getCombinedFx = (currencies: readonly string[]): Promise<CombinedFx> =>
  requestContract(fxEndpoints.rates, { query: { currencies: [...currencies].join(",") } });

export const listFxOverrides = (): Promise<FxOverride[]> =>
  requestContract(fxEndpoints.listOverrides, {});

export const setFxOverride = (body: SetFxOverrideBody): Promise<FxOverride> =>
  requestContract(fxEndpoints.setOverride, { body });

export const deleteFxOverride = (pair: {
  fromCurrencyCode: string;
  toCurrencyCode: string;
}): Promise<void> => requestContract(fxEndpoints.deleteOverride, { params: pair });
