"use client"
import {
  type GetOnboardingOptionsResult,
  onboardingEndpoints,
} from "@luraba/contracts"
import { lurabaApiPassiveClient } from "@/api/luraba-api"
import { requestContract } from "@/services/contract-client.service"

export function getOnboardingOptions(): Promise<GetOnboardingOptionsResult> {
  return requestContract(onboardingEndpoints.getOptions, {
    client: lurabaApiPassiveClient,
  })
}
