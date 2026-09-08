"use client";
import { type GetHealthResult, healthEndpoints } from "@luraba/contracts";
import axios from "axios";
import { apiConfig } from "@/config/api";
import { requestContract } from "@/services/contract-client.service";

const healthClient = axios.create({ baseURL: apiConfig.origin });
export function getHealth(): Promise<GetHealthResult> {
  return requestContract(healthEndpoints.get, { client: healthClient });
}
