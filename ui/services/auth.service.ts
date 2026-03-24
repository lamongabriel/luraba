import { lurabaApiClient } from "@/api/luraba-api";
import type {
  LoginHttpParams,
  LoginHttpResponse,
  MeHttpResponse,
  RefreshHttpResponse,
  RegisterHttpParams,
  RegisterHttpResponse,
} from "@/interfaces/http/auth";
import type { ApiSuccessHttp } from "@/interfaces/http/api-responses";

export const login = async (credentials: LoginHttpParams): Promise<LoginHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.post<LoginHttpResponse>("/auth/login", credentials);
  return data.data;
};

export const register = async (params: RegisterHttpParams): Promise<RegisterHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.post<RegisterHttpResponse>("/auth/register", params);
  return data.data;
};

export const refresh = async (): Promise<RefreshHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.post<RefreshHttpResponse>("/auth/refresh");
  return data.data;
};

export const logout = async (): Promise<void> => {
  await lurabaApiClient.post<ApiSuccessHttp<{ ok: boolean }>>("/auth/logout");
};

export const getCurrentUser = async (): Promise<MeHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<MeHttpResponse>("/auth/me");
  return data.data;
};
