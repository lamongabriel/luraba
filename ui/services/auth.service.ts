import { lurabaApiClient } from "@/api/luraba-api";
import type {
  LoginHttpParams,
  LoginHttpResponse,
  MeHttpResponse,
  RegisterHttpParams,
  RegisterHttpResponse,
} from "@/interfaces/http/auth";

export const login = async (credentials: LoginHttpParams): Promise<LoginHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.post<LoginHttpResponse>("/auth/login", credentials);
  return data.data;
};

export const register = async (params: RegisterHttpParams): Promise<RegisterHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.post<RegisterHttpResponse>("/auth/register", params);
  return data.data;
};

export const getCurrentUser = async (): Promise<MeHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<MeHttpResponse>("/auth/me");
  return data.data;
};
