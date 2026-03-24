import type { ApiSuccessHttp } from "@/interfaces/http/api-responses";
import type { UserPreferences } from "@/interfaces/users";

export type GetPreferencesHttpResponse = ApiSuccessHttp<UserPreferences>;

export type UpdatePreferencesHttpParams = Partial<UserPreferences>;
export type UpdatePreferencesHttpResponse = ApiSuccessHttp<UserPreferences>;
