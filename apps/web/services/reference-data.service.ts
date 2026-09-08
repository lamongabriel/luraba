"use client";
import { type GetLocationOptionsResult, referenceDataEndpoints } from "@luraba/contracts";
import { lurabaApiPassiveClient } from "@/api/luraba-api";
import { requestContract } from "@/services/contract-client.service";

export function getLocationOptions(): Promise<GetLocationOptionsResult> {
  return requestContract(referenceDataEndpoints.getLocations, {
    client: lurabaApiPassiveClient,
  });
}
