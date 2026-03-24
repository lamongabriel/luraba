import type { ApiSuccessHttp } from "@/interfaces/http/api-responses";

export interface AccountHttp {
  id: number;
  userId: number;
  name: string;
  institutionName: string | null;
  institutionDomain: string | null;
  notes: string | null;
  type: "checking" | "savings" | "cash" | "wallet";
  currencyId: number;
  createdAt: string;
  updatedAt: string;
}

export type ListAccountsHttpResponse = ApiSuccessHttp<AccountHttp[]>;
