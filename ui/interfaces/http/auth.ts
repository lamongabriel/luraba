import type { ApiSuccessHttp } from "@/interfaces/http/api-responses";
import type { User } from "@/interfaces/users";

export interface LoginHttpParams {
  email: string;
  password: string;
}

export interface RegisterHttpParams {
  name: string;
  email: string;
  password: string;
}

export interface AuthDataHttp {
  user: User;
  accessToken: string;
}

export type LoginHttpResponse = ApiSuccessHttp<AuthDataHttp>;
export type RegisterHttpResponse = ApiSuccessHttp<AuthDataHttp>;
export type MeHttpResponse = ApiSuccessHttp<User>;
