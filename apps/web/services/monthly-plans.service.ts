"use client";

import { monthlyPlansEndpoints, type SafeToSpend } from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export const getSafeToSpend = (month?: string): Promise<SafeToSpend> =>
  requestContract(monthlyPlansEndpoints.safeToSpend, { query: month ? { month } : {} });
