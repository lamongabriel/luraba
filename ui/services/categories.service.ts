import { lurabaApiClient } from "@/api/luraba-api";
import type {
  CreateCategoryHttpParams,
  CreateCategoryHttpResponse,
  ListCategoriesHttpResponse,
} from "@/interfaces/http/categories";

export const listCategories = async (): Promise<ListCategoriesHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<ListCategoriesHttpResponse>("/categories");
  return data.data;
};

export const createCategory = async (
  params: CreateCategoryHttpParams,
): Promise<CreateCategoryHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.post<CreateCategoryHttpResponse>("/categories", params);
  return data.data;
};
