import { lurabaApiClient } from "@/api/luraba-api";
import type {
  GetPreferencesHttpResponse,
  UpdatePreferencesHttpParams,
  UpdatePreferencesHttpResponse,
} from "@/interfaces/http/preferences";

export const getPreferences = async (): Promise<GetPreferencesHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<GetPreferencesHttpResponse>("/users/me/preferences");
  return data.data;
};

export const updatePreferences = async (
  params: UpdatePreferencesHttpParams,
): Promise<UpdatePreferencesHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.patch<UpdatePreferencesHttpResponse>("/users/me/preferences", params);
  return data.data;
};
